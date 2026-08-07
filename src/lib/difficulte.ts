export type NiveauDifficulte = "facile" | "moyen" | "difficile";

const NIVEAUX: Record<NiveauDifficulte, number> = {
  facile: 1,
  moyen: 2,
  difficile: 3,
};

const LABELS: Record<NiveauDifficulte, string> = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
};

export interface DifficulteInfo {
  niveau: number;
  label: string;
  etoilesPleines: number;
  etoilesVides: number;
}

/**
 * Convertit le niveau de difficulté de cuisson (facile/moyen/difficile) en une note 1 à 3 étoiles.
 */
export function difficulteInfo(valeur: string): DifficulteInfo {
  const cle = (valeur as NiveauDifficulte) in NIVEAUX ? (valeur as NiveauDifficulte) : "facile";
  const niveau = NIVEAUX[cle];
  return {
    niveau,
    label: LABELS[cle],
    etoilesPleines: niveau,
    etoilesVides: 3 - niveau,
  };
}
