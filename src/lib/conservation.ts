export type LieuConservation = "air_libre" | "frigo" | "placard" | "cave";

const LABELS: Record<LieuConservation, string> = {
  air_libre: "À l'air libre",
  frigo: "Au frigo",
  placard: "Au placard",
  cave: "En cave",
};

/**
 * Libellé lisible pour un lieu de conservation (ex. "air_libre" -> "À l'air libre").
 */
export function lieuConservationLabel(valeur: string): string {
  return LABELS[valeur as LieuConservation] ?? valeur;
}
