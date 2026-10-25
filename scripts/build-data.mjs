// Transforme data/produits.csv en src/data/produits.json
// Usage : node scripts/build-data.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "../data/produits.csv");
const JSON_PATH = path.join(__dirname, "../src/data/produits.json");

const RNM_PATH = path.join(__dirname, "../data/prix-rnm.json");
const HISTO_PATH = path.join(__dirname, "../data/prix-historique.json");
const CREDITS_PATH = path.join(__dirname, "../data/credits-images.json");
const IMAGES_DIR = path.join(__dirname, "../public/produits");

function lireJson(chemin) {
  return existsSync(chemin) ? JSON.parse(readFileSync(chemin, "utf-8")) : null;
}

/**
 * Fusionne les prix RNM (réels) et les estimations du CSV.
 * Chaque série : { valeur, unite, date, source, type: "rnm" | "estimation", variation?, periode? }
 */
function composerPrix(p, rnm) {
  const estimation = (valeur) =>
    valeur === null
      ? null
      : { valeur, unite: p.unite_prix, date: p.prix_maj, source: "Estimation De saison", type: "estimation" };
  const reel = (r) =>
    r ? { valeur: r.prix, unite: r.unite, date: r.date, periode: r.periode, source: r.source, variation: r.variation, type: "rnm" } : null;

  return {
    supermarche: reel(rnm.supermarche) ?? estimation(p.prix_supermarche),
    bio: reel(rnm.bio) ?? estimation(p.prix_bio),
    marche: estimation(p.prix_marche),
  };
}

// Champs qui contiennent plusieurs valeurs séparées par ";" dans le CSV
const MULTI_VALUE_FIELDS = new Set(["alias", "regions", "cuisson_recommandee"]);
const NUMBER_FIELDS = new Set(["prix_marche", "prix_supermarche", "prix_bio"]);

// Parseur CSV minimal, gère les champs entre guillemets contenant des virgules
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

function main() {
  const raw = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(raw.trim());
  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  const produits = dataRows.map((row) => {
    const entry = {};
    headers.forEach((header, i) => {
      const raw = (row[i] ?? "").trim();

      if (header === "mois_saison") {
        entry[header] = raw
          .split(";")
          .filter(Boolean)
          .map((m) => parseInt(m, 10));
      } else if (MULTI_VALUE_FIELDS.has(header)) {
        entry[header] = raw ? raw.split(";").filter(Boolean) : [];
      } else if (NUMBER_FIELDS.has(header)) {
        entry[header] = raw ? parseFloat(raw) : null;
      } else {
        entry[header] = raw;
      }
    });
    return entry;
  });

  const rnm = lireJson(RNM_PATH)?.produits ?? {};
  const historique = lireJson(HISTO_PATH) ?? {};
  const credits = lireJson(CREDITS_PATH) ?? {};

  for (const p of produits) {
    p.prix = composerPrix(p, rnm[p.slug] ?? {});
    // Historique affiché : prix en supermarché, à défaut prix bio
    const h = historique[p.slug] ?? {};
    p.historique_serie = h.supermarche?.length > 1 ? "supermarche" : "bio";
    p.historique = (h[p.historique_serie] ?? []).map(([date, prix, unite]) => ({ date, prix, unite }));
    p.image = existsSync(path.join(IMAGES_DIR, `${p.slug}.webp`)) ? `/produits/${p.slug}.webp` : null;
    p.image_credit = credits[p.slug] ?? null;
  }
  produits.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));

  mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  writeFileSync(JSON_PATH, JSON.stringify(produits, null, 2), "utf-8");
  console.log(`✓ ${produits.length} produits écrits dans src/data/produits.json`);
}

main();
