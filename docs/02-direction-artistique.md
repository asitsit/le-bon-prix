# Direction artistique — Site "De saison"

## 0. Le parti pris

L'idée directrice : **le site doit ressembler à ce qu'il décrit**. Pas une app "food tech" générique avec des photos léchées, mais l'univers concret d'un étal de marché — ardoise, papier kraft, prix écrits à la volée, ticket de pesée qu'on arrache à la balance.

**Élément signature** : chaque fiche produit est présentée comme un **ticket de balance de pesée** — bords en pointillés (comme un ticket détachable), prix affichés en typo monospace (comme un afficheur digital de balance), infos essentielles empilées comme sur un reçu. C'est le lien direct avec votre propre référence UX ("aussi rapide que la balance à peser les légumes"), poussé jusque dans le visuel.

On évite volontairement : les photos de stock de légumes sur fond blanc, les dégradés, les cartes flottantes avec ombres portées, l'esthétique "app bio premium" pastel.

---

## 1. Palette

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Fond principal | Ardoise | `#1F2B22` | Header, fonds de section forts — évoque le tableau noir du marché |
| Fond clair / cartes | Kraft | `#EFE6D3` | Fond principal des pages, zones de contenu |
| Surface ticket | Papier | `#FBF8F1` | Fond des "tickets" produit, encore plus clair que le kraft |
| Encre | Encre | `#1F2B22` | Texte principal (même teinte que l'ardoise, cohérence) |
| Accent — de saison | Vert feuille | `#639922` | Statut "de saison", éléments positifs |
| Accent — bientôt | Ambre | `#BA7517` | Statut "bientôt de saison" |
| Accent — hors saison | Gris pierre | `#888780` | Statut "hors saison", désactivé |
| Accent vif | Tomate | `#D93D2B` | Rare — call-to-action, éléments à mettre en avant (1 seul par écran) |

Règle stricte : **un seul accent vif (tomate) par écran maximum**. Le reste du contraste vient du duo ardoise/kraft, pas de la couleur.

---

## 2. Typographie

| Rôle | Police | Usage |
|---|---|---|
| Display / titres | **Fraunces** (Google Fonts, variable) | Titres de page, nom du produit — un serif contemporain à forte personnalité, contrepoint chaleureux à l'univers "brut" du marché |
| Texte courant | **Public Sans** (Google Fonts) | Corps de texte, labels, navigation — lisible, neutre, efficace sur mobile |
| Données / prix | **JetBrains Mono** (Google Fonts) | Tous les prix, dates, codes — évoque un afficheur digital de balance ou de caisse |

Échelle type (mobile-first, en rem) :

```
--text-xs:   0.75rem   (12px)  — labels, badges
--text-sm:   0.875rem  (14px)  — corps secondaire
--text-base: 1rem      (16px)  — corps principal
--text-lg:   1.25rem   (20px)  — sous-titres
--text-xl:   1.75rem   (28px)  — titre de fiche produit
--text-2xl:  2.25rem   (36px)  — titre de page (accueil)
```

Poids : 400 (texte courant), 500 (labels/boutons), 600 (titres Fraunces uniquement). Pas de 700+ : on reste dans un registre confiant mais pas criard.

---

## 3. Design tokens (à copier dans `src/styles/tokens.css`)

Voir le fichier `src/styles/tokens.css` du projet — il contient l'implémentation complète et commentée de cette palette et de cette échelle typographique, prête à l'emploi.

---

## 4. Composants clés

### SearchBar
- Pleine largeur, visible sans scroll dès l'arrivée sur la page.
- Fond papier, bordure ardoise 1.5px, coins légèrement arrondis (8px — pas de pilule complète, pour rester dans le registre "objet physique" plutôt que "app").
- Curseur clignotant façon terminal/balance en état vide, pour suggérer "tapez et ça répond tout de suite".
- Recherche déclenchée dès la 1ʳᵉ lettre (debounce 100ms), résultats affichés en dessous sans rechargement de page.

### ProductTicket (la carte produit / élément signature)
- Bordure en pointillés (`border: 1px dashed`), fond papier sur fond kraft — visuellement détachable, comme un vrai ticket.
- En-tête : icône + nom (Fraunces) + pastille de statut saison (voir SeasonBadge).
- Séparateur pointillé horizontal (comme la perforation d'un ticket) entre le bloc identité et le bloc prix.
- Prix en 3 lignes alignées (marché / supermarché / bio), typo JetBrains Mono, alignement décimal.
- Bloc conservation + tip en bas, texte courant.
- Badges "conservation" et "facilité" en pastille kraft foncé, jamais plus de 2 pour ne pas surcharger.

### SeasonBadge
- Pastille + point coloré (pas d'icône complexe) :
  - 🟢 Vert feuille + "de saison"
  - 🟠 Ambre + "bientôt"
  - ⚪ Gris pierre + "hors saison"
- Toujours visible en un coup d'œil, même en scannant rapidement une liste de résultats.

---

## 5. Layout mobile-first

- **Largeur de référence** : 375px (iPhone SE/mini), on construit d'abord pour cette taille.
- **Zéro scroll pour l'action principale** : la barre de recherche est visible immédiatement, sans qu'il faille descendre.
- **Cible tactile minimale** : 44×44px pour tout élément cliquable (recommandation Apple/Google, non négociable pour un usage "en magasin, une main occupée").
- **Une colonne** sur mobile, grille 2 colonnes à partir de 640px pour la liste "de saison ce mois-ci", 3 colonnes à partir de 1024px.
- **Pas d'animation lourde** : des transitions courtes (150-200ms) sur les états hover/tap, rien de plus — la vitesse perçue prime sur la démonstration visuelle.

---

## 6. Ton et rédaction

- Phrases courtes, verbes d'action, tutoiement neutre implicite (pas de "vous" pompeux, pas de familiarité excessive).
- Les tips gardent le ton d'un maraîcher qui donne un conseil rapide, pas d'un article de blog lifestyle : "Ne pas mettre au frigo : ça altère le goût." — pas "Découvrez pourquoi votre tomate mérite mieux qu'un frigo !"
- Aucune donnée n'est affichée sans transparence sur sa fraîcheur : toujours accompagner un prix de sa date de mise à jour dès que la donnée réelle (RNM) sera branchée.

---

## 7. Accessibilité

- Contraste texte/fond validé AA minimum (ardoise `#1F2B22` sur kraft `#EFE6D3` = contraste très large, largement conforme).
- Le statut de saison n'est jamais porté par la couleur seule : toujours accompagné du mot ("de saison", "bientôt", "hors saison").
- Focus clavier visible sur tous les éléments interactifs (contour 2px couleur tomate).
- `prefers-reduced-motion` respecté : les transitions sont désactivées si l'utilisateur l'a demandé au niveau système.
