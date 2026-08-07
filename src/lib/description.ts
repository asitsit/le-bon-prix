import { periodesSaison } from "./mois";
import { lieuConservationLabel } from "./conservation";
import { difficulteInfo } from "./difficulte";

interface ProduitDescriptible {
  nom: string;
  regions: string[];
  mois_saison: number[];
  conservation_lieu: string;
  conservation_duree: string;
  facilite_cuisson: string;
  cuisson_recommandee: string[];
}

function formatRegions(regions: string[]): string {
  return regions.map((r) => r.replace(/_/g, " ")).join(", ");
}

/**
 * Compose un court texte de présentation à partir des données structurées du produit,
 * pour enrichir la fiche produit sans avoir à rédiger un texte par produit.
 */
export function composerDescription(produit: ProduitDescriptible): string[] {
  const periode = periodesSaison(produit.mois_saison);
  const regions = formatRegions(produit.regions);
  const { label: difficulte } = difficulteInfo(produit.facilite_cuisson);
  const lieu = lieuConservationLabel(produit.conservation_lieu).toLowerCase();

  const phrase1 = `${produit.nom} est de saison ${periode}, principalement produit en ${regions}.`;
  const phrase2 = `Niveau de difficulté ${difficulte.toLowerCase()} en cuisine : idéal ${produit.cuisson_recommandee
    .map((c) => c.replace(/_/g, " "))
    .join(", ")}.`;
  const phrase3 = `Conservez-le ${lieu} : il se garde ${produit.conservation_duree}.`;

  return [phrase1, phrase2, phrase3];
}
