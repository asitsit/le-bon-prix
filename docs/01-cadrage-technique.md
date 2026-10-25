# Cadrage technique — Site "De saison"

Ce document complète le document de cadrage produit. Il décrit les choix techniques, l'architecture, le pipeline de données et les conventions de développement, pour démarrer directement dans VSC (avec Claude Code).

---

## 1. Stack retenue

| Brique | Choix | Pourquoi |
|---|---|---|
| Générateur de site | **Astro** | Sortie statique par défaut → chargement quasi instantané sur mobile, cœur de la promesse UX. Composants `.astro` simples (proches du HTML), courbe d'apprentissage faible. |
| Recherche | **Fuse.js** (côté client) | Recherche floue tolérante aux fautes/accents, aucune infra serveur nécessaire pour quelques centaines de produits. |
| Données | **JSON généré depuis un CSV source** | Le CSV reste l'outil de saisie (simple, éditable dans un tableur) ; un script de build le transforme en JSON exploitable par le site. |
| Style | **CSS natif avec variables (design tokens)** | Pas de framework CSS lourd nécessaire à ce stade — la DA (voir `02-direction-artistique.md`) est un petit système de tokens, plus simple à maintenir en CSS pur. |
| Hébergement | **Netlify ou Vercel** | Déploiement automatique depuis Git, gratuit à ce niveau de trafic, gère nativement les builds Astro. |
| Ingestion prix (V1.1) | **Script Node planifié (GitHub Actions cron)** | Téléchargement hebdomadaire des cotations FranceAgriMer/RNM (data.gouv.fr, Licence Ouverte), transformation, mise à jour du JSON, redéploiement automatique. |

Pas de base de données au MVP : le site est 100% statique. Cette décision est revue en V2 (recettes, favoris, comptes) où une base relationnelle (ex. Supabase/Postgres) deviendra nécessaire.

---

## 2. Arborescence du projet

```
fruits-legumes-saison/
├── docs/
│   ├── 01-cadrage-technique.md        ← ce fichier
│   └── 02-direction-artistique.md     ← DA / design system
├── data/
│   └── produits.csv                   ← source éditable (tableur)
├── scripts/
│   └── build-data.mjs                 ← CSV → JSON, à lancer avant chaque build
├── src/
│   ├── data/
│   │   └── produits.json              ← généré, ne pas éditer à la main
│   ├── styles/
│   │   └── tokens.css                 ← design tokens (couleurs, typo, spacing)
│   ├── components/
│   │   ├── SearchBar.astro
│   │   ├── ProductTicket.astro        ← la "carte" produit façon ticket de balance
│   │   └── SeasonBadge.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   └── saison.ts                  ← calcul "de saison / bientôt / hors saison"
│   └── pages/
│       ├── index.astro                ← accueil + recherche + grille "ce mois-ci"
│       └── produit/
│           └── [slug].astro           ← fiche produit détaillée
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 3. Pipeline de données

1. **Édition** : le CSV `data/produits.csv` est la source de vérité éditable (Excel, Google Sheets exporté en CSV, ou directement dans VSC).
2. **Build** : `node scripts/build-data.mjs` lit le CSV, le normalise (voir structure ci-dessous) et écrit `src/data/produits.json`.
3. **Consommation** : les pages Astro et les composants importent directement `produits.json` — aucune requête réseau côté client pour les données produit (tout est déjà dans le HTML statique généré).
4. **Recherche** : `src/lib/search.ts` initialise un index Fuse.js à partir du JSON, exécuté côté client au chargement de la page.

### Structure de données (v1, cf. cadrage produit)

```json
{
  "slug": "tomate",
  "nom": "Tomate",
  "alias": ["tomate cerise"],
  "type": "legume",
  "icone": "🍅",
  "regions": ["ile_de_france", "paca", "occitanie"],
  "mois_saison": [6, 7, 8, 9],
  "prix_marche": 2.5,
  "prix_supermarche": 3.2,
  "prix_bio": 4.1,
  "unite_prix": "kg",
  "prix_maj": "2026-08-01",
  "prix_source": "FranceAgriMer / RNM",
  "conservation_type": "air_libre",
  "cuisson_recommandee": ["cru", "grille", "roti"],
  "facilite_cuisson": "facile",
  "tip": "Ne pas mettre les tomates au frigo : cela altère leur goût."
}
```

Champs ajoutés par rapport au CSV initial : `slug`, `alias`, `type`, `unite_prix`, `prix_maj`, `prix_source` — nécessaires pour la recherche robuste, la traçabilité des prix, et la future base de recettes (liaison par `slug`).

⚠️ Point de vigilance repris du cadrage produit : `prix_marche` doit être clairement défini (prix de gros vs prix de détail marché) avant intégration des données FranceAgriMer — voir section 5.

---

## 4. Logique "de saison"

Fonction pure dans `src/lib/saison.ts`, calculée à partir du mois courant et de `mois_saison` :

- **De saison** : mois courant ∈ `mois_saison`
- **Bientôt** : mois courant + 1 ∈ `mois_saison` (le mois prochain est un mois de saison)
- **Hors saison** : sinon

Cette logique reste volontairement simple au MVP (pas de prise en compte météo/année). À documenter clairement sur le site ("saisonnalité indicative, France métropolitaine") pour rester honnête sur la précision.

---

## 5. Prix réels (V1.1) — fait en octobre 2026

Source : **FranceAgriMer / RNM**, licence ouverte (réutilisation autorisée, y compris commerciale, avec
citation de la source).

L'hypothèse d'août 2026 (« pas d'export public ») était incomplète : le dataset data.gouv.fr n'est
qu'annuel, mais le site public `rnm.franceagrimer.fr` publie chaque semaine des pages HTML « prix par
marché », dont des **prix de détail TTC** relevés en grande surface (GMS) et en magasins bio. `scripts/fetch-prices.mjs` les lit directement (4 pages, aucune
clé), voir `scripts/README.md`.

| Série affichée | Source |
|---|---|
| Supermarché | RNM, DÉTAIL GMS (TTC, hebdo) — repli : estimation CSV |
| Bio | RNM, DÉTAIL magasins spécialisés bio (TTC, hebdo) — repli : estimation CSV |
| Marché (plein air) | Estimation CSV : le RNM ne suit pas ce circuit |

Ceci tranche le point de vigilance de la section 3 : `prix_marche` reste le prix *de détail* au marché
de plein air (estimé). Le prix de gros (Rungis) a été testé puis retiré de l'affichage (octobre 2026).

Automatisation : `.github/workflows/update-prices.yml` (mardi et vendredi) lance le script, vérifie le
build, puis commite `data/prix-rnm.json` et `data/prix-historique.json` → redéploiement Vercel.

Chaque fiche affiche la source (badge RNM / estimation), la date du relevé et la tendance hebdo.

Si FranceAgriMer modifie la structure de ses pages, le script garde les valeurs précédentes et l'indique
dans les logs du workflow ; il faudra alors adapter `parserPageMarche()`. Un accès API officiel reste
possible sur demande (`contact-rnm@franceagrimer.fr`) si l'on veut plus de robustesse.

---

## 5 bis. Saison dynamique, onglets et liste de courses

- **Saison à la date du jour** : le HTML statique est généré au build, mais `src/scripts/saison-client.ts`
  recalcule tous les statuts (badges, calendriers, onglet « De saison ») dans le navigateur, à la date du
  visiteur. Le site n'affiche donc plus « août » s'il n'a pas été reconstruit.
- **Onglets** : Tous (accueil, A→Z, recherche + filtres fruits/légumes + tranches de lettres), De saison
  (choix du mois, section « bientôt »), Ma liste, Suggestions. Barre d'onglets en bas sur mobile.
- **Liste de courses** : `localStorage` uniquement (`src/scripts/liste-client.ts`), pas de compte. Passage
  en base de données prévu en V2 avec les favoris.
- **Suggestions** : formulaire envoyé à un service de formulaires (`PUBLIC_SUGGESTIONS_ENDPOINT`, ex.
  Formspree), repli sur un e-mail pré-rempli. Voir `.env.example`.
- **Images** : photos libres Wikimedia Commons détourées, crédits sur chaque fiche et sur `/credits`.

---

## 6. Conventions de développement

- **Nommage** : `slug` en `snake_case` sans accents (ex. `pomme_de_terre`), utilisé comme identifiant stable partout (URL, clé JSON, futur lien recette).
- **Composants Astro** : un composant = une responsabilité (pas de composant "fourre-tout"). `ProductTicket.astro` ne connaît que l'affichage, `saison.ts` ne connaît que le calcul.
- **Accessibilité** : contrastes AA minimum, cibles tactiles ≥ 44px (cf. DA), navigation clavier fonctionnelle sur la recherche.
- **Mobile-first** : tout le CSS s'écrit d'abord pour mobile (~375px), puis on ajoute des `@media (min-width: ...)` pour les écrans plus larges. Jamais l'inverse.
- **Pas de dépendance ajoutée sans raison** : le site doit rester léger. Avant d'ajouter une lib npm, se demander si le besoin peut être couvert en CSS/JS natif.

---

## 7. Comment continuer dans VSC avec Claude Code

1. Ouvrir le dossier `fruits-legumes-saison/` dans VSC.
2. `npm install` pour poser les dépendances (Astro, Fuse.js).
3. `node scripts/build-data.mjs` pour générer `src/data/produits.json` à partir du CSV.
4. `npm run dev` pour lancer le serveur local.
5. Avec Claude Code : commencer par lui faire lire `docs/01-cadrage-technique.md` et `docs/02-direction-artistique.md` pour qu'il ait le contexte complet avant de générer ou modifier du code.
6. Prochaine tâche suggérée pour Claude Code : enrichir `data/produits.csv` avec une vingtaine de produits supplémentaires en respectant la structure définie, puis vérifier le rendu de la page d'accueil.

---

## 8. Roadmap technique

| Phase | Contenu |
|---|---|
| **V1 (MVP)** | Accueil + recherche + fiches produit, données statiques (CSV → JSON manuel), déploiement Netlify/Vercel |
| **V1.1** ✅ | Prix réels RNM (supermarché, bio), historique, saison dynamique, liste de courses locale, suggestions |
| **V2** | Base de recettes liées par `slug`, filtres avancés, favoris (nécessite base de données) |
