

# Responsive + Menu contextuel (clic droit) + Informations media

## Partie 1 : Responsive Design (mobile, tablette, desktop)

### Header (`MediaHeader.tsx`)
- Sur mobile : masquer les filtres source, tri, modes de vue et les remplacer par un bouton "Filtres" qui ouvre un drawer/sheet en bas
- Barre de recherche en pleine largeur sur mobile
- Boutons "Lier un dossier" et "Ajouter" en icones seules (sans texte) sur mobile
- Compteurs medias empiles verticalement sur tablette

### Sidebar (`Sidebar.tsx`)
- Sur mobile : transformer en drawer glissant depuis la gauche (ou overlay), cache par defaut
- Ajouter un bouton hamburger dans le header pour ouvrir/fermer la sidebar
- Sur tablette : sidebar en mode mini (icones seulement, sans texte)

### Grille medias (`MediaGrid.tsx`)
- Mobile : 2 colonnes au lieu de 1 pour la grille standard
- Les paddings passent de `p-6` a `p-3` sur mobile
- Les cartes s'adaptent correctement aux petits ecrans

### MediaViewer (`MediaViewer.tsx`)
- Boutons de navigation (precedent/suivant) plus grands et tactiles sur mobile
- Barre d'outils en bas de l'ecran sur mobile au lieu du haut

### Modales et dialogs
- Toutes les modales passent en plein ecran sur mobile (via la classe `max-w-full` et `h-full` sous `sm:`)

---

## Partie 2 : Menu contextuel (clic droit)

Ajouter un menu contextuel natif (clic droit ou appui long sur mobile) sur chaque carte media avec ces options :

| Option | Icone | Action |
|--------|-------|--------|
| Voir | Eye | Ouvre le viewer |
| Informations | Info | Affiche un dialog avec toutes les metadonnees |
| Telecharger | Download | Telecharge le fichier |
| Enregistrer sous... | Save | Ouvre le telechargement avec choix du nom |
| Ajouter aux favoris | Heart | Toggle favori |
| Ajouter a une playlist | ListPlus | Sous-menu avec les playlists |
| Copier le chemin | Copy | Copie `sourcePath` dans le presse-papier (si fichier lie) |
| Supprimer | Trash2 | Supprime le media |

Implementation : utiliser le composant `ContextMenu` de Radix UI (deja installe dans `src/components/ui/context-menu.tsx`) pour envelopper chaque carte media.

Un nouveau composant `MediaContextMenu.tsx` sera cree pour encapsuler la logique, reutilisable par toutes les variantes de cartes (Twitter, Adaptive, Minimal).

---

## Partie 3 : Dialog "Informations" du media

Un nouveau composant `MediaInfoDialog.tsx` qui affiche :

- **Nom du fichier** (avec possibilite de renommer)
- **Type** : Photo ou Video
- **Taille** : en KB/MB
- **Date de creation**
- **Resolution** (si disponible, lu dynamiquement)
- **Duree** (pour les videos)
- **Tags** associes
- **Chemin d'acces** : `sourcePath` complet si fichier lie
- **Dossier source** : `sourceFolder`
- **Nombre de vues** (depuis les stats)
- **URL** du fichier

Ce dialog sera accessible via :
1. Le menu contextuel (clic droit > Informations)
2. Les metadonnees de la carte (clic sur la date/taille)

---

## Details techniques

### Fichiers a creer
| Fichier | Description |
|---------|-------------|
| `src/components/MediaContextMenu.tsx` | Composant wrapper clic droit avec toutes les options |
| `src/components/MediaInfoDialog.tsx` | Dialog affichant les informations detaillees d'un media |

### Fichiers a modifier
| Fichier | Modification |
|---------|-------------|
| `src/components/MediaGrid.tsx` | Envelopper chaque carte avec `MediaContextMenu`, ajuster grille responsive |
| `src/components/MediaHeader.tsx` | Layout responsive : drawer mobile pour filtres, hamburger menu |
| `src/components/MediaCardTwitter.tsx` | Ajuster paddings/tailles pour mobile |
| `src/components/MediaCardAdaptive.tsx` | Ajuster pour mobile |
| `src/pages/Index.tsx` | Ajouter state pour sidebar mobile + bouton hamburger |
| `src/components/Sidebar.tsx` | Mode drawer sur mobile avec overlay |
| `src/components/MediaViewer.tsx` | Controles tactiles sur mobile |

### Approche responsive
- Utilisation des breakpoints Tailwind existants : `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Le hook `useIsMobile()` existant est utilise pour les logiques conditionnelles JavaScript
- Priorite au "mobile-first" pour les nouvelles classes

