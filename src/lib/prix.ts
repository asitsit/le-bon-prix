import type { Prix, Produit, SeriePrix } from "./types";

export const SERIES: Record<SeriePrix, { label: string; detail: string }> = {
  supermarche: { label: "Supermarché", detail: "Grande surface, prix TTC" },
  bio: { label: "Bio", detail: "Magasin spécialisé bio, prix TTC" },
  marche: { label: "Marché", detail: "Marché de plein air" },
};

export function formatEuros(valeur: number): string {
  return valeur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function formatUnite(unite: string): string {
  return unite === "pièce" ? "pièce" : unite;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Prix à mettre en avant sur une carte : supermarché, à défaut marché, bio. */
export function prixPrincipal(produit: Produit): { serie: SeriePrix; prix: Prix } | null {
  for (const serie of ["supermarche", "marche", "bio"] as const) {
    const prix = produit.prix[serie];
    if (prix) return { serie, prix };
  }
  return null;
}

/** Tendance d'une variation hebdomadaire (seuil 2 % pour ignorer le bruit). */
export function tendance(prix: Prix): "up" | "down" | "flat" | null {
  if (prix.variation === null || prix.variation === undefined) return null;
  const relative = prix.variation / Math.max(prix.valeur - prix.variation, 0.01);
  if (relative > 0.02) return "up";
  if (relative < -0.02) return "down";
  return "flat";
}
