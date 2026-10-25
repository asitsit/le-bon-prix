// Récupère les cotations publiques du RNM (FranceAgriMer) et écrit data/prix-rnm.json
// + data/prix-historique.json. Voir scripts/README.md pour le détail des sources.
// Usage : node scripts/fetch-prices.mjs            (réseau)
//         node scripts/fetch-prices.mjs --dir=DIR  (pages HTML déjà téléchargées, nommées M2502.html…)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MAPPING_PATH = path.join(__dirname, "mapping-rnm.json");
const CSV_PATH = path.join(ROOT, "data/produits.csv");
const OUT_PATH = path.join(ROOT, "data/prix-rnm.json");
const HISTO_PATH = path.join(ROOT, "data/prix-historique.json");

const BASE_URL = "https://rnm.franceagrimer.fr/prix?";
const USER_AGENT = "DeSaison/1.0 (+https://github.com/asitsit/le-bon-prix)";
const HISTO_MAX = 104; // ~2 ans de relevés hebdomadaires

// Pages "prix par marché" du RNM utilisées, par série de prix affichée sur le site
const PAGES = [
  { code: "M2502", serie: "supermarche", libelle: "Légumes France DÉTAIL GMS" },
  { code: "M2503", serie: "supermarche", libelle: "Fruits France DÉTAIL GMS" },
  { code: "M3027", serie: "bio", libelle: "Légumes France DÉTAIL magasins spécialisés bio" },
  { code: "M3026", serie: "bio", libelle: "Fruits France DÉTAIL magasins spécialisés bio" },
];

const SOURCES = {
  supermarche: "RNM FranceAgriMer — prix de détail en grande surface (TTC)",
  bio: "RNM FranceAgriMer — prix de détail en magasins bio (TTC)",
};

// ---------- Utilitaires texte ----------

function normaliser(texte) {
  return texte.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function decoderEntites(texte) {
  return texte
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&euro;/g, "€")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function texteBrut(html) {
  return decoderEntites(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseNombre(texte) {
  const t = texte.replace(",", ".").trim();
  if (t === "=") return 0;
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

function mediane(valeurs) {
  const v = [...valeurs].sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Lundi de la semaine ISO (ex. semaine 42-2026 -> 2026-10-12)
function lundiSemaineIso(semaine, annee) {
  const jan4 = new Date(Date.UTC(annee, 0, 4));
  const lundiS1 = new Date(jan4);
  lundiS1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  lundiS1.setUTCDate(lundiS1.getUTCDate() + (semaine - 1) * 7);
  return lundiS1.toISOString().slice(0, 10);
}

// ---------- Lecture d'une page RNM ----------

/**
 * Extrait l'en-tête (date, unité par défaut) et les lignes de cotation d'une page "prix par marché".
 */
export function parserPageMarche(html) {
  const thead = html.match(/<th class="thcot">([\s\S]*?)<\/th>/);
  const entete = thead ? texteBrut(thead[1]) : "";

  let date = null;
  let periode = null;
  const semaine = entete.match(/semaine\s+(\d+)-(\d{4})/i);
  const jour = entete.match(/cours du\s+(\d{2})\/(\d{2})\/(\d{2})/i);
  if (semaine) {
    date = lundiSemaineIso(Number(semaine[1]), Number(semaine[2]));
    periode = `semaine ${semaine[1]}-${semaine[2]}`;
  } else if (jour) {
    date = `20${jour[3]}-${jour[2]}-${jour[1]}`;
    periode = `${jour[1]}/${jour[2]}/20${jour[3]}`;
  }
  const uniteParDefaut = /le kg/i.test(entete) ? "kg" : null;

  const lignes = [];
  const reLigne = /<td class="tdcotl">([\s\S]*?)<\/td>\s*<td class="tdcotr">([\s\S]*?)<\/td>\s*<td class="tdcotc">([\s\S]*?)<\/td>/g;
  let m;
  while ((m = reLigne.exec(html))) {
    const libelle = texteBrut(m[1]);
    const prix = parseNombre(texteBrut(m[2]));
    if (!libelle || prix === null) continue;
    lignes.push({ libelle, prix, variation: parseNombre(texteBrut(m[3])) });
  }
  return { date, periode, uniteParDefaut, lignes };
}

/**
 * Convertit le prix d'une ligne en prix unitaire (kg ou pièce) d'après la mention entre parenthèses.
 * Renvoie null si l'unité n'est pas exploitable (filet, botte, colis, barquette sans poids…).
 */
export function prixUnitaire(libelle, prix, uniteParDefaut) {
  const paren = libelle.match(/\(([^)]*)\)\s*$/);
  if (!paren) {
    // "colis de 40" sans unité explicite : impossible de savoir si le prix est au kg ou au colis
    if (/colis de \d/i.test(libelle)) return null;
    return uniteParDefaut ? { unite: uniteParDefaut, valeur: prix } : null;
  }

  const u = normaliser(paren[1]).toLowerCase().trim();
  if (u === "le kg") return { unite: "kg", valeur: prix };
  if (u === "la piece") return { unite: "pièce", valeur: prix };

  let r = u.match(/^les (\d+) pieces$/);
  if (r) return { unite: "pièce", valeur: prix / Number(r[1]) };

  r = u.match(/(\d+(?:[.,]\d+)?)\s*kg$/);
  if (r) return { unite: "kg", valeur: prix / parseFloat(r[1].replace(",", ".")) };

  r = u.match(/(\d+)\s*g$/);
  if (r) return { unite: "kg", valeur: (prix * 1000) / Number(r[1]) };

  return null;
}

// ---------- Correspondance libellé -> slug ----------

function construireRegles(mapping) {
  const regles = [];
  for (const [slug, def] of Object.entries(mapping)) {
    if (slug.startsWith("_")) continue;
    for (const motif of def.motifs) {
      regles.push({
        slug,
        motif: normaliser(motif).toUpperCase(),
        contient: def.contient ? normaliser(def.contient).toLowerCase() : null,
        exclure: (def.exclure ?? []).map((e) => normaliser(e).toLowerCase()),
      });
    }
  }
  // La règle la plus spécifique d'abord : avec "contient", puis motif le plus long
  return regles.sort((a, b) => (b.contient ? 1 : 0) - (a.contient ? 1 : 0) || b.motif.length - a.motif.length);
}

export function trouverSlug(libelle, regles) {
  const norm = normaliser(libelle);
  const haut = norm.toUpperCase();
  const bas = norm.toLowerCase();
  for (const r of regles) {
    if (haut !== r.motif && !haut.startsWith(`${r.motif} `)) continue;
    if (r.contient && !bas.includes(r.contient)) continue;
    if (r.exclure.some((e) => bas.includes(e))) return null;
    return r.slug;
  }
  return null;
}

// ---------- Agrégation ----------

function agreger(lignes, uniteProduit) {
  if (lignes.length === 0) return null;
  let retenues = lignes.filter((l) => l.unite === uniteProduit);
  if (retenues.length === 0) {
    // Repli : l'unité la plus représentée (le site affichera alors cette unité)
    const kg = lignes.filter((l) => l.unite === "kg");
    retenues = kg.length >= lignes.length / 2 ? kg : lignes.filter((l) => l.unite !== "kg");
  }
  const france = retenues.filter((l) => /\bFrance\b/.test(l.libelle));
  if (france.length > 0) retenues = france;

  const variations = retenues.map((l) => l.variationUnitaire).filter((v) => v !== null);
  return {
    prix: Math.round(mediane(retenues.map((l) => l.valeur)) * 100) / 100,
    unite: retenues[0].unite,
    variation: variations.length ? Math.round(mediane(variations) * 100) / 100 : null,
    nb_cotations: retenues.length,
    libelles: retenues.map((l) => l.libelle).slice(0, 8),
  };
}

function lireUnitesProduits() {
  const lignes = readFileSync(CSV_PATH, "utf-8").trim().split(/\r?\n/);
  const entete = lignes[0].split(",");
  const iSlug = entete.indexOf("slug");
  const iUnite = entete.indexOf("unite_prix");
  const unites = {};
  for (const l of lignes.slice(1)) {
    const cols = l.split(",");
    unites[cols[iSlug]] = cols[iUnite] === "pièce" ? "pièce" : "kg";
  }
  return unites;
}

async function telechargerPage(code, dir) {
  if (dir) return new TextDecoder("utf-8").decode(readFileSync(path.join(dir, `${code}.html`)));
  const res = await fetch(`${BASE_URL}${code}:MARCHE`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder("utf-8").decode(buf);
}

async function main() {
  const dirArg = process.argv.find((a) => a.startsWith("--dir="));
  const dir = dirArg ? dirArg.slice(6) : null;

  const regles = construireRegles(JSON.parse(readFileSync(MAPPING_PATH, "utf-8")));
  const unitesProduits = lireUnitesProduits();
  const precedent = existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, "utf-8")) : { produits: {} };

  // lignes[serie][slug] = [...]
  const lignes = { supermarche: {}, bio: {} };
  const dates = {};
  const seriesOk = new Set();
  const nonReconnus = new Set();

  for (const page of PAGES) {
    let html;
    try {
      html = await telechargerPage(page.code, dir);
    } catch (e) {
      console.warn(`⚠ ${page.code} (${page.libelle}) indisponible : ${e.message} — valeurs précédentes conservées.`);
      continue;
    }
    const { date, periode, uniteParDefaut, lignes: cotations } = parserPageMarche(html);
    if (cotations.length === 0) {
      console.warn(`⚠ ${page.code} : aucune cotation lue (format de page modifié ?)`);
      continue;
    }
    console.log(`✓ ${page.code} ${page.libelle} — ${cotations.length} cotations (${periode})`);

    for (const c of cotations) {
      const slug = trouverSlug(c.libelle, regles);
      if (!slug) {
        nonReconnus.add(c.libelle.split(" ")[0]);
        continue;
      }
      const bio = /biologique/i.test(c.libelle);
      // Les lignes bio vendues en GMS complètent la série bio
      let serie = page.serie;
      if (bio && serie === "supermarche") serie = "bio";

      const unitaire = prixUnitaire(c.libelle, c.prix, uniteParDefaut);
      if (!unitaire) continue;
      const ratio = unitaire.valeur / c.prix;
      const ligne = {
        libelle: c.libelle,
        unite: unitaire.unite,
        valeur: unitaire.valeur,
        variationUnitaire: c.variation === null ? null : c.variation * ratio,
        prioritaire: page.serie === serie, // en bio : magasins spécialisés avant GMS
      };
      (lignes[serie][slug] ??= []).push(ligne);
      dates[serie] = dates[serie] && dates[serie].date > date ? dates[serie] : { date, periode };
      seriesOk.add(serie);
    }
    if (!dir) await new Promise((r) => setTimeout(r, 1500)); // rester courtois avec le serveur
  }

  const produits = {};
  for (const slug of Object.keys(unitesProduits)) {
    const entree = {};
    for (const serie of ["supermarche", "bio"]) {
      if (!seriesOk.has(serie)) {
        if (precedent.produits?.[slug]?.[serie]) entree[serie] = precedent.produits[slug][serie];
        continue;
      }
      let candidates = lignes[serie][slug] ?? [];
      const prioritaires = candidates.filter((l) => l.prioritaire);
      if (prioritaires.length > 0) candidates = prioritaires;
      const agg = agreger(candidates, unitesProduits[slug]);
      if (agg) entree[serie] = { ...agg, date: dates[serie].date, periode: dates[serie].periode, source: SOURCES[serie] };
    }
    if (Object.keys(entree).length > 0) produits[slug] = entree;
  }

  const sortie = {
    _doc: "Généré par scripts/fetch-prices.mjs — ne pas éditer à la main.",
    maj: new Date().toISOString(),
    licence: "Licence ouverte FranceAgriMer — source : RNM, https://rnm.franceagrimer.fr",
    produits,
  };
  writeFileSync(OUT_PATH, JSON.stringify(sortie, null, 2) + "\n", "utf-8");

  // Historique : un point par (produit, série, date de cotation)
  const histo = existsSync(HISTO_PATH) ? JSON.parse(readFileSync(HISTO_PATH, "utf-8")) : {};
  for (const [slug, series] of Object.entries(produits)) {
    for (const [serie, v] of Object.entries(series)) {
      const points = ((histo[slug] ??= {})[serie] ??= []);
      if (!points.some((p) => p[0] === v.date)) points.push([v.date, v.prix, v.unite]);
      points.sort((a, b) => a[0].localeCompare(b[0]));
      if (points.length > HISTO_MAX) points.splice(0, points.length - HISTO_MAX);
    }
  }
  writeFileSync(HISTO_PATH, JSON.stringify(histo) + "\n", "utf-8");

  const couverts = (s) => Object.values(produits).filter((p) => p[s]).length;
  console.log(
    `✓ ${Object.keys(produits).length} produits avec au moins un prix RNM ` +
      `(supermarché : ${couverts("supermarche")}, bio : ${couverts("bio")}).`
  );
  if (nonReconnus.size > 0) {
    console.log(`ℹ Espèces RNM non suivies par le site (ignorées) : ${[...nonReconnus].sort().join(", ")}`);
  }
}

main().catch((e) => {
  // Ne jamais casser le workflow : on garde les données précédentes
  console.error("✗ Échec de la récupération des prix :", e);
});
