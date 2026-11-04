# Éditeur de cartes — La Galette

**Site : https://viktor-guignard.github.io/La-galette/**

Les cartes de La Galette (restaurant savoyard · pizzéria · crêperie), refaites à l'identique des PDF d'origine et modifiables sans aucune compétence en mise en page :

| Onglet | Format | Contenu |
|---|---|---|
| **La carte** | A4, 9 pages | Boissons, entrées / salades / omelettes, spécialités / raclettes / fondues, menus enfant & crêpes, galettes, crêpes, crêpes glacées, fromage / desserts / glaces, vins |
| **Pizzas** | A4 | Carte des pizzas en français (service en salle 12h–18h) |
| **Pizzas (EN)** | A4 | Même carte en anglais |
| **Vente à emporter** | Affiche 46 × 66 cm | Adhésif porte-menu noir & or (entrées, crêpes & galettes, pizzas) |

## Utilisation

- **Cliquer sur un texte** pour le modifier (Entrée ou clic ailleurs pour valider).
- **✕** au bout de chaque ligne pour supprimer (bouton « Annuler » pendant 6 s), **⧉ ↑ ↓** pour dupliquer / monter / descendre, **👁** pour masquer temporairement un plat (rupture).
- **🏷** sur un plat : pictogramme *végétarien*, *sans gluten*, les deux, *NEW* ou *coup de cœur*.
- **+ Ajouter un bloc** : plat, plat simple, vin (4 contenances), ligne de menu centrée (bouton **Aa** pour son style), bandeau, photo, colonnes…
- **Colonnes** : *Début de colonnes* → blocs de gauche → *Colonne suivante* → blocs de droite → *Fin des colonnes*. Le bouton **⇔** change les largeurs (50/50, 60/40, 20/60/20…).
- **Cliquer sur une photo** pour la remplacer ; **− / +** pour sa taille.
- **⬇️ PDF** : PDF vectoriel au format exact (A4, ou 46 × 66 cm pour l'affiche).
- **💾 Enregistrer** crée une version horodatée dans [`versions/`](versions/) — rien n'est jamais écrasé ; **🕑 Versions** pour revenir en arrière.
- **📱 Publier / QR** : choisir les cartes visibles sur la page client du QR code ([`carte.html`](carte.html)).

### Enregistrer depuis plusieurs ordinateurs

Il faut un jeton GitHub, à créer **une seule fois** (bouton **⚙️**, les 5 étapes sont détaillées ; choisir le dépôt **La-galette**). Ensuite **✨ Copier le lien magique** donne un lien à mettre en favori sur les autres ordinateurs.

## Technique

- Site 100 % statique (HTML/CSS/JS, aucun build), hébergé sur GitHub Pages.
- Même moteur que l'éditeur de La Coursive, avec en plus : colonnes, vins à 4 contenances, lignes de menu centrées, bandeaux, en-tête d'affiche, pictos végétarien / sans gluten, format affiche (dessiné à échelle réduite, exporté en taille réelle).
- Polices : Arimo (équivalent libre d'Helvetica, licence Apache 2.0) pour la carte et les pizzas, Montserrat (OFL) pour l'affiche. Sous-ensembles latins dans [`assets/fonts/`](assets/fonts/), intégrés au PDF.
- Logo, photos et QR code extraits des PDF d'origine, dans [`assets/`](assets/).

### Développement local

```
python3 -m http.server 8000
```

puis ouvrez `http://localhost:8000`. La liste des versions lit le dépôt GitHub distant, même en local.
