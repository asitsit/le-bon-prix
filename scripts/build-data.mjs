// Transforme data/produits.csv en src/data/produits.json
// Usage : node scripts/build-data.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "../data/produits.csv");
const JSON_PATH = path.join(__dirname, "../src/data/produits.json");

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

  mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  writeFileSync(JSON_PATH, JSON.stringify(produits, null, 2), "utf-8");
  console.log(`✓ ${produits.length} produits écrits dans src/data/produits.json`);
}

main();
