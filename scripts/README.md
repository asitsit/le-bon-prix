# Scripts

## build-data.mjs

Transforme `data/produits.csv` en `src/data/produits.json`. Lancé automatiquement avant `dev` et `build` (voir `package.json`).

## fetch-prices.mjs — mise à jour hebdomadaire des prix

**État actuel : la mise à jour automatique est câblée, mais la source de données RNM ne l'est pas encore.**

Le cadrage initial prévoyait de brancher ce script directement sur un export FranceAgriMer/RNM
téléchargeable depuis data.gouv.fr. En pratique (vérifié en août 2026), le dataset publié sur
data.gouv.fr (`cotations-du-reseau-des-nouvelles-des-marches`) n'est mis à jour qu'une fois par an
et pointe vers le portail interne `visionet.franceagrimer.fr`, qui n'est pas un fichier
téléchargeable automatiquement : c'est un tableau de bord interactif, sans export CSV/API public.
FranceAgriMer indique qu'un accès personnalisé (API, export Excel) s'obtient sur demande auprès de
`contact-rnm@franceagrimer.fr`.

En attendant cet accès, `fetch-prices.mjs` fonctionne avec un **fichier d'entrée manuel** :

1. Chaque semaine (ou quand une nouvelle cotation est disponible), déposez un export dans
   `data/rnm-export.csv` avec les colonnes : `produit,prix,unite,date`
   (ex. `TOMATE,2.80,kg,2026-08-04`).
2. Le workflow GitHub Actions (`.github/workflows/update-prices.yml`) exécute ce script chaque
   lundi matin. Le script :
   - lit `data/rnm-export.csv` s'il existe,
   - fait correspondre chaque libellé à un `slug` via `scripts/mapping-rnm.json`,
   - met à jour `prix_marche`, `prix_maj` et `prix_source` dans `data/produits.csv`,
   - régénère `src/data/produits.json`.
3. S'il n'y a rien à mettre à jour (fichier absent ou vide), le script ne fait rien et se termine
   sans erreur — le workflow ne casse jamais faute de données.
4. Le commit + push automatique déclenche le redéploiement Vercel.

`scripts/mapping-rnm.json` associe chaque `slug` à un ou plusieurs libellés RNM possibles (en
MAJUSCULES, tels qu'ils apparaîtraient dans un export). Ces libellés sont des estimations à vérifier
et ajuster une fois un vrai export RNM obtenu — ce ne sont pas des valeurs confirmées auprès de
FranceAgriMer.

`prix_supermarche` et `prix_bio` ne sont pas fournis par le RNM (qui couvre le prix de gros/marché) :
ils restent des estimations internes tant qu'une seconde source n'est pas branchée.
