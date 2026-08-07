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

## 5. Intégration future des prix (V1.1, après validation du MVP)

Rappel de la décision prise : démarrage **national**, source **FranceAgriMer / RNM** via data.gouv.fr (Licence Ouverte).

Étapes techniques à prévoir (pas au tout premier MVP, mais à cadrer dès maintenant pour ne pas casser le schéma de données) :

1. Script `scripts/fetch-prices.mjs` : téléchargement du fichier RNM hebdomadaire depuis data.gouv.fr.
2. Mapping RNM → `slug` interne (les libellés produits RNM ne correspondent pas forcément 1:1 à vos noms — prévoir une table de correspondance `scripts/mapping-rnm.json`).
3. Mise à jour de `produits.json` avec `prix_maj` (date) et `prix_source`.
4. GitHub Action programmée (cron hebdomadaire) : exécute le script, commit le JSON mis à jour, déclenche le redéploiement.
5. Affichage obligatoire sur chaque fiche : date de mise à jour + source — non négociable pour la crédibilité (cf. cadrage produit, section "manques identifiés").

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
| **V1.1** | Automatisation des prix (RNM), badge "mis à jour le...", cron hebdomadaire |
| **V2** | Base de recettes liées par `slug`, filtres avancés, favoris (nécessite base de données) |
