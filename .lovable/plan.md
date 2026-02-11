
# Explorateur de dossiers dans la sidebar

## Objectif
Ajouter une section "Explorateur" dans la sidebar qui affiche l'arborescence des dossiers lies (scannes), comme un explorateur de fichiers Windows. Cliquer sur un dossier affiche ses medias dans la zone principale avec les memes modes d'affichage que la galerie (grille, liste, mosaique, etc.) et le meme slider de colonnes.

## Comment ca marche

1. **Nouvelle section dans la sidebar** : Une section pliable "Explorateur" apparait entre les sections existantes. Elle liste tous les dossiers sources (issus des scans) sous forme d'arborescence.

2. **Arborescence de dossiers** : Les dossiers sont regroupes par structure de chemin. Par exemple :
   - `D:/Photos` (dossier parent)
     - `D:/Photos/Vacances` (sous-dossier)
     - `D:/Photos/Famille` (sous-dossier)
   Chaque dossier affiche le nombre de medias qu'il contient.

3. **Clic sur un dossier** : Navigue vers une nouvelle vue "explorer" qui filtre et affiche uniquement les medias de ce dossier (et ses sous-dossiers), en utilisant les memes tuiles/cartes media que la galerie principale.

4. **Modes d'affichage** : La vue explorateur reutilise le composant `MediaGrid` existant et le slider de colonnes, donc tout ce qui est deja configure (grille, liste, mosaique, adaptive, etc.) fonctionne automatiquement.

## Details techniques

### Fichiers a creer

| Fichier | Role |
|---------|------|
| `src/components/FolderExplorer.tsx` | Vue principale qui affiche les medias filtres par dossier, avec un fil d'ariane (breadcrumb) pour naviguer dans l'arborescence |

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/types/views.ts` | Ajouter `'explorer'` au type `ViewType` |
| `src/components/Sidebar.tsx` | Ajouter une section pliable "Explorateur" qui liste les dossiers sources depuis `getSourceFolders()`. Chaque dossier est cliquable et declenche la navigation vers la vue explorer avec le filtre dossier |
| `src/pages/Index.tsx` | Ajouter le cas `currentView === 'explorer'` qui affiche le composant `FolderExplorer` avec le `MediaHeader` et les memes controles d'affichage |
| `src/hooks/useMediaStore.ts` | Ajouter une methode `getMediaByFolderPrefix(folder: string)` qui retourne les medias dont le `sourceFolder` ou `sourcePath` commence par le chemin donne (pour inclure les sous-dossiers) |

### Fonctionnement de l'arborescence

- `getSourceFolders()` existe deja et retourne la liste des dossiers uniques
- On construit un arbre a partir de ces chemins en splittant par `/` ou `\`
- Chaque noeud de l'arbre est un dossier cliquable avec un compteur de medias
- Les sous-dossiers s'affichent en indent sous leur parent, pliables/depliables
- Le dossier selectionne est mis en surbrillance

### Vue Explorer (FolderExplorer.tsx)

- Affiche un breadcrumb en haut avec le chemin du dossier actuel (cliquable pour remonter)
- En dessous, affiche les sous-dossiers du niveau actuel sous forme de tuiles cliquables
- Puis affiche les medias du dossier actuel via le meme systeme de cartes que `MediaGrid`
- Supporte tous les modes de vue (grille, liste, mosaique, etc.) et le slider de colonnes
- Le slider de colonnes peut aller jusqu'a 20 colonnes pour cette vue specifique
