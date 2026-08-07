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
- `scripts/build-data.mjs` — transforme le CSV en `src/data/produits.json`.
- `src/components/ProductTicket.astro` — la carte produit (élément signature de la DA, style ticket de balance).
- `src/lib/saison.ts` — calcul du statut "de saison / bientôt / hors saison".

## Ajouter un produit

1. Ouvrir `data/produits.csv`.
2. Ajouter une ligne en respectant les colonnes existantes (`slug` unique, sans accent).
3. Relancer `npm run dev` (ou `npm run build-data` seul pour juste régénérer le JSON).

## Travailler avec Claude Code

En ouvrant ce dossier dans VSC avec Claude Code, commencer par lui faire lire `docs/01-cadrage-technique.md` et `docs/02-direction-artistique.md` pour qu'il ait tout le contexte produit et design avant de modifier ou générer du code.

## Prochaines étapes (voir docs/01-cadrage-technique.md, section 8)

- V1.1 : automatiser la mise à jour des prix depuis les données ouvertes FranceAgriMer / RNM (data.gouv.fr).
- V2 : base de recettes liée aux produits via leur `slug`.
