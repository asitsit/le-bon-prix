# Scripts

## build-data.mjs

Construit `src/data/produits.json` (lancé automatiquement avant `dev` et `build`) en fusionnant :

- `data/produits.csv` — fiche produit éditable (saison, conservation, cuisson, prix estimés) ;
- `data/prix-rnm.json` — derniers prix réels RNM (généré par `fetch-prices.mjs`) ;
- `data/prix-historique.json` — historique des relevés (mini-courbe sur la fiche) ;
- `data/credits-images.json` + `public/produits/<slug>.webp` — photo détourée et ses crédits.

Pour chaque série de prix, un prix RNM réel remplace l'estimation du CSV quand il existe. Le prix
« marché de plein air » reste une estimation : le RNM ne suit pas ce circuit.

## fetch-prices.mjs — prix réels FranceAgriMer / RNM

**État (octobre 2026) : branché et fonctionnel**, sans clé ni accès particulier.

Le site public du Réseau des Nouvelles des Marchés (`rnm.franceagrimer.fr`) publie des pages
« prix par marché » en HTML, réutilisables sous licence ouverte FranceAgriMer (citation de la
source obligatoire, faite sur chaque fiche et en pied de page). Le script lit 4 pages :

| Code RNM | Contenu | Série sur le site | Fréquence |
|---|---|---|---|
| `M2502` | Légumes France DÉTAIL GMS (TTC) | Supermarché | hebdomadaire |
| `M2503` | Fruits France DÉTAIL GMS (TTC) | Supermarché | hebdomadaire |
| `M3027` | Légumes DÉTAIL magasins spécialisés bio (TTC) | Bio | hebdomadaire |
| `M3026` | Fruits DÉTAIL magasins spécialisés bio (TTC) | Bio | hebdomadaire |

Pour chaque produit :

1. les libellés RNM sont rattachés à un `slug` via `scripts/mapping-rnm.json` (voir ci-dessous) ;
2. chaque cotation est ramenée à un prix au kg ou à la pièce (« (les 6 pièces) », « (la barq. 125g) »,
   « (les 10kg) »…) ; les unités inexploitables (filet, botte, colis sans poids) sont ignorées ;
3. on garde l'unité du produit (`unite_prix` du CSV), sinon l'unité la plus fréquente ;
4. si des cotations d'origine France existent, on ne garde qu'elles ;
5. le prix affiché est la **médiane** des cotations retenues ; la variation hebdo aussi.

En bio, les magasins spécialisés passent avant les lignes « biologique » vendues en GMS.

Le script ne casse jamais le workflow : une page indisponible garde les valeurs précédentes.

```bash
node scripts/fetch-prices.mjs                 # en ligne
node scripts/fetch-prices.mjs --dir=chemin/   # sur des pages déjà téléchargées (M2502.html…), pour tester
```

### mapping-rnm.json

```json
"chou_rouge": { "motifs": ["CHOU"], "contient": "rouge" },
"tomate": { "motifs": ["TOMATE"], "exclure": ["cerise", "cocktail"] }
```

- `motifs` : début du libellé RNM (l'espèce, en majuscules, accents ignorés) ;
- `contient` : mot obligatoire ailleurs dans le libellé (variété) ;
- `exclure` : mots qui écartent la ligne.

La règle la plus spécifique gagne (`contient` d'abord, puis le motif le plus long) : « POMME DE TERRE »
ne tombe donc pas dans « pomme ». En fin d'exécution, le script liste les espèces RNM non rattachées :
pratique pour enrichir le catalogue.

### Couverture actuelle

Environ 55 produits sur 88 ont au moins un prix réel (supermarché ~26, bio ~51) ; cela varie
avec la saison, le RNM ne cotant que ce qui est en rayon. Les autres gardent l'estimation du CSV.

## Images produits

`public/produits/<slug>.webp` : photos libres issues de Wikimedia Commons, détourées (fond transparent)
et recadrées en 512×512. Auteur, licence et lien de chaque photo : `data/credits-images.json`, affichés
sous la photo et sur la page `/credits` (obligatoire pour les licences CC BY / CC BY-SA).

Pour ajouter un produit sans image, la fiche affiche l'initiale en attendant. Pour en ajouter une :
choisir une photo libre sur Commons, la détourer (ex. `rembg`, outil libre), l'exporter en WebP
512×512 transparent dans `public/produits/`, et ajouter ses crédits dans `data/credits-images.json`.
