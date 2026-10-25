// Recherche, filtre fruits/légumes, filtre par lettres et (page "De saison") choix du mois.
// Fonctionne sur des cartes déjà présentes dans le HTML : [data-card] avec data-slug, data-texte, data-type, data-lettre.

import Fuse from "fuse.js";
import { appliquerSaison } from "./saison-client";
import { moisCourant } from "../lib/saison";

function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

const racine = document.querySelector<HTMLElement>("[data-catalogue]");

if (racine) {
  const cartes = Array.from(racine.querySelectorAll<HTMLElement>("[data-card]"));
  const groupes = Array.from(racine.querySelectorAll<HTMLElement>("[data-groupe]"));
  const input = document.querySelector<HTMLInputElement>("[data-filtre-recherche]");
  const boutonsType = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-filtre-type]"));
  const boutonsLettres = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-filtre-lettres]"));
  const boutonsMois = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-filtre-mois]"));
  const compteur = document.querySelector<HTMLElement>("[data-resultats-count]");
  const vide = document.querySelector<HTMLElement>("[data-vide]");

  // Index de recherche : un enregistrement par slug (une carte peut apparaître dans plusieurs sections)
  const index = new Map<string, string>();
  cartes.forEach((c) => index.set(c.dataset.slug ?? "", c.dataset.texte ?? ""));
  const entrees = [...index].map(([slug, texte]) => ({ slug, texte }));
  const fuse = new Fuse(entrees, { keys: ["texte"], threshold: 0.3, ignoreLocation: true });

  const params = new URLSearchParams(location.search);
  const etat = {
    q: params.get("q") ?? "",
    type: params.get("type") ?? "tous",
    lettres: params.get("lettres") ?? "",
    mois: Number(params.get("mois")) || moisCourant(),
  };

  function slugsRecherche(q: string): Set<string> | null {
    const n = normaliser(q);
    if (!n) return null;
    const directs = entrees.filter((e) => e.texte.includes(n)).map((e) => e.slug);
    if (directs.length > 0) return new Set(directs);
    // Repli flou pour les fautes de frappe ("framboize" -> "framboise")
    return new Set(fuse.search(n).map((r) => r.item.slug));
  }

  function dansPlage(lettre: string, plage: string): boolean {
    if (!plage) return true;
    const [debut, fin] = plage.split("-");
    return lettre >= debut && lettre <= (fin ?? debut);
  }

  function synchroniserUrl() {
    const p = new URLSearchParams();
    if (etat.q) p.set("q", etat.q);
    if (etat.type !== "tous") p.set("type", etat.type);
    if (etat.lettres) p.set("lettres", etat.lettres);
    if (boutonsMois.length > 0 && etat.mois !== moisCourant()) p.set("mois", String(etat.mois));
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  function appliquer() {
    if (boutonsMois.length > 0) appliquerSaison(etat.mois);

    const trouves = slugsRecherche(etat.q);
    let visibles = 0;
    const vus = new Set<string>();

    cartes.forEach((carte) => {
      const section = carte.closest<HTMLElement>("[data-statut-filtre]");
      const okStatut = !section || section.dataset.statutFiltre === carte.dataset.statut;
      const ok =
        okStatut &&
        (!trouves || trouves.has(carte.dataset.slug ?? "")) &&
        (etat.type === "tous" || carte.dataset.type === etat.type) &&
        dansPlage(carte.dataset.lettre ?? "", etat.lettres);
      carte.hidden = !ok;
      // Le compteur ne compte que la liste principale (pas la section "bientôt")
      const principale = !section || section.dataset.statutFiltre === "de_saison";
      if (ok && principale && !vus.has(carte.dataset.slug ?? "")) {
        vus.add(carte.dataset.slug ?? "");
        visibles++;
      }
    });

    groupes.forEach((g) => {
      g.hidden = !g.querySelector("[data-card]:not([hidden])");
    });

    if (compteur) compteur.textContent = `${visibles} produit${visibles > 1 ? "s" : ""}`;
    if (vide) vide.hidden = visibles > 0;

    boutonsType.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filtreType === etat.type)));
    boutonsLettres.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filtreLettres === etat.lettres)));
    boutonsMois.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.filtreMois) === etat.mois)));
    synchroniserUrl();
  }

  if (input) {
    input.value = etat.q;
    let minuteur: ReturnType<typeof setTimeout>;
    input.addEventListener("input", () => {
      clearTimeout(minuteur);
      minuteur = setTimeout(() => {
        etat.q = input.value;
        appliquer();
      }, 100);
    });
  }

  boutonsType.forEach((b) =>
    b.addEventListener("click", () => {
      etat.type = b.dataset.filtreType ?? "tous";
      appliquer();
    })
  );
  boutonsLettres.forEach((b) =>
    b.addEventListener("click", () => {
      const plage = b.dataset.filtreLettres ?? "";
      etat.lettres = etat.lettres === plage ? "" : plage;
      appliquer();
    })
  );
  boutonsMois.forEach((b) =>
    b.addEventListener("click", () => {
      etat.mois = Number(b.dataset.filtreMois);
      appliquer();
    })
  );

  document.querySelector("[data-reinitialiser]")?.addEventListener("click", () => {
    etat.q = "";
    etat.type = "tous";
    etat.lettres = "";
    if (input) input.value = "";
    appliquer();
  });

  // Le mois sélectionné reste visible dans la barre défilante
  // (on fait défiler la bande elle-même : scrollIntoView décalerait toute la page sur mobile)
  const moisActif = boutonsMois.find((b) => Number(b.dataset.filtreMois) === etat.mois);
  const bande = moisActif?.parentElement;
  if (moisActif && bande) bande.scrollLeft = moisActif.offsetLeft - bande.clientWidth / 2 + moisActif.clientWidth / 2;

  appliquer();
}
