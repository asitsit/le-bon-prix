export type StatutSaison = "de_saison" | "bientot" | "hors_saison";

export interface StatutSaisonInfo {
  statut: StatutSaison;
  label: string;
}

/**
 * Calcule le statut de saisonnalité d'un produit à partir de ses mois de saison.
 * Logique volontairement simple au MVP : pas de prise en compte régionale ou météo.
 */
export function calculerStatutSaison(
  moisSaison: number[],
  moisCourant: number = new Date().getMonth() + 1
): StatutSaisonInfo {
  if (moisSaison.includes(moisCourant)) {
    return { statut: "de_saison", label: "de saison" };
  }

  const moisProchain = moisCourant === 12 ? 1 : moisCourant + 1;
  if (moisSaison.includes(moisProchain)) {
    return { statut: "bientot", label: "bientôt" };
  }

  return { statut: "hors_saison", label: "hors saison" };
}
