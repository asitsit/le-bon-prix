/**
 * Un produit est considéré "produit en Europe" s'il dispose d'une production
 * française ou européenne significative (y compris départements et régions
 * d'outre-mer). Sinon, la mention "Pas produit en Europe" est affichée : le
 * produit est disponible toute l'année par importation, sans saison française.
 */
export function estProduitEnEurope(valeur: string): boolean {
  return valeur === "oui";
}
