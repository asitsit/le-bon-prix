export const MOIS_NOMS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

/**
 * Regroupe une liste de mois (1-12) en plages contiguës lisibles.
 * Ex. [6,7,8,9] -> "de juin à septembre". [11,12,1] -> "de novembre à janvier".
 */
export function periodesSaison(moisSaison: number[]): string {
  if (moisSaison.length === 0) return "toute l'année";
  if (moisSaison.length === 12) return "toute l'année";

  const tries = [...moisSaison].sort((a, b) => a - b);
  const plages: Array<[number, number]> = [];
  let debut = tries[0];
  let precedent = tries[0];

  for (let i = 1; i < tries.length; i++) {
    const mois = tries[i];
    if (mois === precedent + 1) {
      precedent = mois;
    } else {
      plages.push([debut, precedent]);
      debut = mois;
      precedent = mois;
    }
  }
  plages.push([debut, precedent]);

  // Fusionne la première et la dernière plage si elles se rejoignent (ex. déc-jan)
  if (plages.length > 1) {
    const premiere = plages[0];
    const derniere = plages[plages.length - 1];
    if (derniere[1] === 12 && premiere[0] === 1) {
      plages[0] = [derniere[0], premiere[1]];
      plages.pop();
    }
  }

  const texte = plages
    .map(([d, f]) =>
      d === f ? MOIS_NOMS[d - 1] : `de ${MOIS_NOMS[d - 1]} à ${MOIS_NOMS[f - 1]}`
    )
    .join(", puis ");

  return texte;
}
