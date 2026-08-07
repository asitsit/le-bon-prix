// Met à jour data/produits.csv à partir d'un export hebdomadaire de prix (data/rnm-export.csv).
// Voir scripts/README.md pour le format attendu et l'état de l'intégration RNM.
// Usage : node scripts/fetch-prices.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "../data/produits.csv");
const EXPORT_PATH = path.join(__dirname, "../data/rnm-export.csv");
const MAPPING_PATH = path.join(__dirname, "mapping-rnm.json");

const SOURCE_LABEL = "FranceAgriMer / RNM (data.gouv.fr)";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field); field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

function csvField(value) {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function main() {
  if (!existsSync(EXPORT_PATH)) {
    console.log(
      "ℹ Aucun fichier data/rnm-export.csv trouvé — rien à mettre à jour cette semaine. " +
      "Voir scripts/README.md pour déposer un export."
    );
    return;
  }

  const mapping = JSON.parse(readFileSync(MAPPING_PATH, "utf-8"));
  // slug par libellé RNM (en majuscules) pour une recherche rapide
  const slugParLibelle = new Map();
  for (const [slug, libelles] of Object.entries(mapping)) {
    for (const libelle of libelles) {
      slugParLibelle.set(libelle.trim().toUpperCase(), slug);
    }
  }

  const exportRows = parseCsv(readFileSync(EXPORT_PATH, "utf-8").trim());
  const exportHeader = exportRows[0].map((h) => h.trim().toLowerCase());
  const idxProduit = exportHeader.indexOf("produit");
  const idxPrix = exportHeader.indexOf("prix");
  const idxDate = exportHeader.indexOf("date");

  if (idxProduit === -1 || idxPrix === -1) {
    console.error("✗ data/rnm-export.csv doit contenir au minimum les colonnes 'produit' et 'prix'.");
    process.exitCode = 1;
    return;
  }

  const nouveauxPrix = new Map(); // slug -> { prix, date }
  for (const row of exportRows.slice(1)) {
    const libelle = (row[idxProduit] ?? "").trim().toUpperCase();
    const slug = slugParLibelle.get(libelle);
    if (!slug) {
      console.warn(`⚠ Libellé non reconnu, ignoré : "${row[idxProduit]}" (à ajouter dans scripts/mapping-rnm.json)`);
      continue;
    }
    const prix = parseFloat(row[idxPrix]);
    if (Number.isNaN(prix)) continue;
    const date = idxDate !== -1 && row[idxDate] ? row[idxDate].trim() : new Date().toISOString().slice(0, 10);
    nouveauxPrix.set(slug, { prix, date });
  }

  if (nouveauxPrix.size === 0) {
    console.log("ℹ Aucun prix exploitable dans data/rnm-export.csv.");
    return;
  }

  const raw = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(raw.trim());
  const header = rows[0];
  const idx = (nom) => header.indexOf(nom);
  const iSlug = idx("slug");
  const iPrixMarche = idx("prix_marche");
  const iPrixMaj = idx("prix_maj");
  const iPrixSource = idx("prix_source");

  let miseAJour = 0;
  const dataRows = rows.slice(1).map((row) => {
    const infos = nouveauxPrix.get(row[iSlug]);
    if (!infos) return row;
    const newRow = [...row];
    newRow[iPrixMarche] = String(infos.prix);
    newRow[iPrixMaj] = infos.date;
    newRow[iPrixSource] = SOURCE_LABEL;
    miseAJour++;
    return newRow;
  });

  const csvText = [header, ...dataRows].map((r) => r.map(csvField).join(",")).join("\n") + "\n";
  writeFileSync(CSV_PATH, csvText, "utf-8");
  console.log(`✓ ${miseAJour} prix marché mis à jour depuis data/rnm-export.csv.`);
}

main();
