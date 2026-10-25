// Liste de courses stockée localement dans le navigateur (localStorage), sans compte ni serveur.

export interface ArticleListe {
  slug: string;
  coche: boolean;
  ajoute: string;
}

const CLE = "de-saison:liste";
const EVENEMENT = "liste:change";

export function lireListe(): ArticleListe[] {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? "[]");
    return Array.isArray(brut) ? brut.filter((a) => typeof a?.slug === "string") : [];
  } catch {
    return [];
  }
}

export function ecrireListe(liste: ArticleListe[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    // Stockage indisponible (navigation privée stricte) : la liste vit le temps de la page
  }
  document.dispatchEvent(new CustomEvent(EVENEMENT, { detail: liste }));
}

export function estDansListe(slug: string): boolean {
  return lireListe().some((a) => a.slug === slug);
}

export function basculer(slug: string): boolean {
  const liste = lireListe();
  const present = liste.some((a) => a.slug === slug);
  ecrireListe(present ? liste.filter((a) => a.slug !== slug) : [...liste, { slug, coche: false, ajoute: new Date().toISOString() }]);
  return !present;
}

export function surChangement(callback: (liste: ArticleListe[]) => void) {
  document.addEventListener(EVENEMENT, (e) => callback((e as CustomEvent<ArticleListe[]>).detail));
  // Synchronise aussi les autres onglets ouverts
  window.addEventListener("storage", (e) => {
    if (e.key === CLE) callback(lireListe());
  });
}

function rafraichirBoutons() {
  const slugs = new Set(lireListe().map((a) => a.slug));
  document.querySelectorAll<HTMLButtonElement>("[data-liste-toggle]").forEach((btn) => {
    const actif = slugs.has(btn.dataset.listeToggle ?? "");
    btn.setAttribute("aria-pressed", String(actif));
    const label = btn.querySelector("[data-liste-label]");
    if (label) label.textContent = actif ? (btn.dataset.labelOn ?? "Dans ma liste") : (btn.dataset.labelOff ?? "Ajouter à ma liste");
    if (!btn.querySelector("[data-liste-label]")) {
      btn.setAttribute("aria-label", `${actif ? "Retirer" : "Ajouter"} ${btn.dataset.nom ?? ""} ${actif ? "de" : "à"} ma liste`);
    }
  });
  const total = slugs.size;
  document.querySelectorAll<HTMLElement>("[data-liste-count]").forEach((el) => {
    el.textContent = String(total);
    el.hidden = total === 0;
  });
}

document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("[data-liste-toggle]");
  if (!btn) return;
  e.preventDefault();
  basculer(btn.dataset.listeToggle ?? "");
});

surChangement(rafraichirBoutons);
rafraichirBoutons();
