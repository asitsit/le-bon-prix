// Recalcule les statuts de saison dans le navigateur, à la date réelle du visiteur.
// Le HTML statique est généré au build avec la date du build : ce script le remet à jour au chargement,
// pour que le site affiche toujours la bonne saison, même s'il n'a pas été reconstruit depuis des semaines.

import { calculerStatutSaison, moisCourant } from "../lib/saison";
import { MOIS_NOMS } from "../lib/mois";

function lireMois(el: HTMLElement): number[] {
  return (el.dataset.mois ?? "").split(",").filter(Boolean).map(Number);
}

/** Met à jour badges, cartes et calendriers pour le mois donné (par défaut : mois courant). */
export function appliquerSaison(mois: number = moisCourant(), racine: ParentNode = document) {
  racine.querySelectorAll<HTMLElement>("[data-saison]").forEach((el) => {
    const { statut, label } = calculerStatutSaison(lireMois(el), mois, el.dataset.europe !== "0");
    el.dataset.statut = statut;
    if (el.classList.contains("badge")) {
      el.className = el.className.replace(/badge--\w+/, `badge--${statut}`);
      const texte = el.querySelector("[data-saison-label]");
      if (texte) texte.textContent = label;
    }
  });

  racine.querySelectorAll<HTMLElement>("[data-mois-courant]").forEach((el) => {
    el.textContent = MOIS_NOMS[mois - 1];
  });

  racine.querySelectorAll<HTMLElement>("[data-calendrier-mois]").forEach((el) => {
    el.classList.toggle("is-current", Number(el.dataset.calendrierMois) === mois);
  });
}

appliquerSaison();
