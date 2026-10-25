# De saison

Site permettant de savoir en un coup d'œil si un fruit ou légume est de saison, comment le conserver et le cuisiner, avec un comparatif de prix marché / supermarché / bio.

## Démarrer

```bash
npm install
npm run dev
```

Le site est disponible sur `http://localhost:4321`.

`npm run dev` régénère automatiquement `src/data/produits.json` à partir de `data/produits.csv` avant de lancer le serveur (voir `scripts/build-data.mjs`).

## Structure du projet

Voir `docs/01-cadrage-technique.md` pour le détail de l'architecture, et `docs/02-direction-artistique.md` pour la direction artistique (couleurs, typographie, composants).

- `data/produits.csv` — source éditable des données produit. Les champs à valeurs multiples (`alias`, `regions`, `cuisson_recommandee`) sont séparés par `;` à l'intérieur d'une cellule.
- `data/prix-rnm.json`, `data/prix-historique.json` — prix réels FranceAgriMer/RNM, générés par `scripts/fetch-prices.mjs` (ne pas éditer).
- `data/credits-images.json` + `public/produits/*.webp` — photos détourées et leurs crédits.
- `scripts/build-data.mjs` — fusionne tout cela dans `src/data/produits.json`.
- `src/pages/` — `index` (tous les produits A→Z), `de-saison`, `liste` (liste de courses), `suggestions`, `produit/[slug]`, `credits`.
- `src/scripts/` — code navigateur : saison à la date du jour, liste de courses (localStorage), filtres.

## Prix réels

```bash
node scripts/fetch-prices.mjs   # récupère les derniers prix RNM, puis relancer npm run dev
```

Automatisé deux fois par semaine par GitHub Actions. Détails : `scripts/README.md`.

## Formulaire de suggestions

Les suggestions sont envoyées à Formspree (`https://formspree.io/f/myeekkaw`) et arrivent par e-mail sur le compte Formspree. Pour changer de formulaire, définir `PUBLIC_SUGGESTIONS_ENDPOINT` (voir `.env.example`).

## Ajouter un produit

1. Ouvrir `data/produits.csv`.
2. Ajouter une ligne en respectant les colonnes existantes (`slug` unique, sans accent).
3. Relancer `npm run dev` (ou `npm run build-data` seul pour juste régénérer le JSON).

## Travailler avec Claude Code

En ouvrant ce dossier dans VSC avec Claude Code, commencer par lui faire lire `docs/01-cadrage-technique.md` et `docs/02-direction-artistique.md` pour qu'il ait tout le contexte produit et design avant de modifier ou générer du code.

## Prochaines étapes (voir docs/01-cadrage-technique.md, section 8)

- V2 : base de recettes liée aux produits via leur `slug`, favoris et liste de courses synchronisée (base de données).
