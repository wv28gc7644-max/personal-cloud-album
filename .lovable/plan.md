
# Texte complet visible et espaces optimises dans la fenetre d'informations

## Probleme

Deux soucis dans le panneau de metadonnees :

1. **Texte tronque** : Les valeurs longues (URL, chemins, dossiers) utilisent `truncate` qui coupe le texte avec "...". Impossible de voir l'URL ou le chemin complet.
2. **Espaces perdus** : Le label (ex. "Type") a une largeur fixe (`w-16 sm:w-24`) meme quand la valeur est courte comme "Video", ce qui cree un espace vide inutile.

## Solution

### 1. Texte qui passe a la ligne au lieu d'etre coupe

Remplacer `truncate` (qui force une seule ligne) par `break-all` sur les valeurs longues (URL, chemins). Le texte passera a la ligne suivante au lieu d'etre coupe, donc tout sera visible.

- Sur le composant `InfoRow` : remplacer `truncate` par `break-all` pour que l'URL, le chemin et le dossier s'affichent en entier sur plusieurs lignes si necessaire.
- Meme traitement pour le chemin cliquable : remplacer `truncate` par `break-all` et retirer `items-center` pour aligner l'icone en haut quand le texte est multi-ligne.
- Changer `items-center` en `items-start` sur la ligne parente pour que l'icone et le label restent en haut quand la valeur passe sur plusieurs lignes.

### 2. Reduire l'espace entre label et valeur

Remplacer la largeur fixe du label (`w-16 sm:w-24`) par `w-auto` avec un `min-w-[3rem]` pour que le label prenne uniquement la place necessaire. La valeur occupe ainsi plus d'espace horizontal.

## Detail technique

| Fichier | Modification |
|---------|-------------|
| `src/components/MediaInfoDialog.tsx` | Dans `InfoRow` : remplacer `items-center` par `items-start`, remplacer `truncate` par `break-all` sur les valeurs, remplacer `w-16 sm:w-24` par `w-auto min-w-[3rem]` sur les labels. Meme ajustement sur le bouton cliquable du chemin. |
