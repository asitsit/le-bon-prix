export type SeriePrix = "supermarche" | "bio" | "marche";

export interface Prix {
  valeur: number;
  unite: string;
  date: string;
  source: string;
  type: "rnm" | "estimation";
  periode?: string;
  variation?: number | null;
}

export interface CreditImage {
  title: string;
  page: string;
  artist: string;
  lic: string;
  licurl: string;
}

export interface Produit {
  slug: string;
  nom: string;
  alias: string[];
  type: "fruit" | "legume";
  production_europe: string;
  regions: string[];
  mois_saison: number[];
  unite_prix: string;
  conservation_lieu: string;
  conservation_duree: string;
  cuisson_recommandee: string[];
  facilite_cuisson: string;
  tip: string;
  prix: Record<SeriePrix, Prix | null>;
  historique: Array<{ date: string; prix: number; unite: string }>;
  historique_serie: SeriePrix;
  image: string | null;
  image_credit: CreditImage | null;
}
