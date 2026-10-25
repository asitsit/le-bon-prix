// Libellés lisibles pour les valeurs codées du CSV (snake_case, sans accents).

const CUISSON: Record<string, string> = {
  cru: "cru",
  cru_rape: "cru râpé",
  rape: "râpé",
  poele: "poêlé",
  vapeur: "vapeur",
  cuit: "cuit",
  cuite: "cuite",
  confiture: "confiture",
  grille: "grillé",
  tarte: "en tarte",
  four: "au four",
  puree: "purée",
  patisserie: "pâtisserie",
  gratin: "gratin",
  veloute: "velouté",
  jus: "jus",
  roti: "rôti",
  rotie: "rôtie",
  braise: "braisé",
  compote: "compote",
  confit: "confit",
  zeste: "zeste",
  gelee: "gelée",
  farci: "farci",
  mijote: "mijoté",
  frite: "frit",
  sirop: "sirop",
  clafoutis: "clafoutis",
  coulis: "coulis",
  salade: "en salade",
  bouillon: "bouillon",
  bouilli: "bouilli",
  seche: "séché",
  smoothie: "smoothie",
  ecrase: "écrasé",
  infusion: "infusion",
};

const REGIONS: Record<string, string> = {
  paca: "Provence-Alpes-Côte d'Azur",
  ile_de_france: "Île-de-France",
  rhone_alpes: "Rhône-Alpes",
  centre_val_de_loire: "Centre-Val de Loire",
  hauts_de_france: "Hauts-de-France",
  pays_de_la_loire: "Pays de la Loire",
  nouvelle_aquitaine: "Nouvelle-Aquitaine",
  cote_d_ivoire: "Côte d'Ivoire",
  afrique_de_l_ouest: "Afrique de l'Ouest",
  amerique_du_sud: "Amérique du Sud",
  asie_du_sud_est: "Asie du Sud-Est",
  caraibes: "Caraïbes",
  reunion: "La Réunion",
  perou: "Pérou",
  bresil: "Brésil",
  algerie: "Algérie",
  israel: "Israël",
  drome: "Drôme",
  mexique: "Mexique",
  chine: "Chine",
};

function capitaliser(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export function libelleCuisson(code: string): string {
  return CUISSON[code] ?? code.replace(/_/g, " ");
}

export function libelleRegion(code: string): string {
  return REGIONS[code] ?? code.split("_").map(capitaliser).join(" ");
}
