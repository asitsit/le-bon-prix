export type StatutSaison = "de_saison" | "bientot" | "hors_saison" | "importe";

export interface StatutSaisonInfo {
  statut: StatutSaison;
  label: string;
}

/** Mois courant (1-12), évalué au moment de l'appel : côté navigateur, c'est la vraie date du jour. */
export function moisCourant(date: Date = new Date()): number {
  return date.getMonth() + 1;
}

/**
 * Calcule le statut de saisonnalité d'un produit à partir de ses mois de saison.
 * Logique volontairement simple : pas de prise en compte régionale ou météo.
 * Utilisée au build (rendu initial) ET dans le navigateur (mise à jour à la date réelle).
 */
export function calculerStatutSaison(
  moisSaison: number[],
  mois: number = moisCourant(),
  productionEurope = true
): StatutSaisonInfo {
  if (!productionEurope) return { statut: "importe", label: "importé" };

  if (moisSaison.includes(mois)) {
    return { statut: "de_saison", label: "de saison" };
  }

  const moisProchain = mois === 12 ? 1 : mois + 1;
  if (moisSaison.includes(moisProchain)) {
    return { statut: "bientot", label: "bientôt" };
  }

  return { statut: "hors_saison", label: "hors saison" };
}
