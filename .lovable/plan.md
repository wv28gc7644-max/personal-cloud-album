

# Auto-creation d'albums a partir des dossiers scannes

## Probleme actuel

Quand tu scannes un dossier avec des sous-dossiers, tous les fichiers sont importes dans une seule liste plate. Le champ `sourceFolder` existe sur chaque media mais n'est utilise nulle part pour les regrouper. Le systeme d'albums existe deja mais il n'est pas connecte au scanner de dossiers.

## Solution proposee

Lors de l'import depuis le scanner de dossiers, **creer automatiquement un album par sous-dossier** scanne. Les fichiers seront ainsi organises par dossier d'origine, comme des albums photo naturels.

### Comportement attendu

```text
Dossier scanne : D:\Photos\Vacances
  ├── Plage/        (12 fichiers)
  ├── Montagne/     (8 fichiers)
  └── Ville/        (5 fichiers)

Resultat apres import :
  Album "Vacances"
    ├── Sous-album "Plage"     (12 medias)
    ├── Sous-album "Montagne"  (8 medias)
    └── Sous-album "Ville"     (5 medias)
```

### Option utilisateur dans le scanner

Un toggle/checkbox sera ajoute dans l'interface du scanner pour laisser le choix :
- **Creer des albums par dossier** (active par defaut) -- chaque sous-dossier devient un album
- Desactive -- comportement actuel, tout est a plat

## Modifications techniques

### 1. FolderScanner.tsx -- Ajout de l'option + logique de creation d'albums

- Ajouter un state `createAlbums` (boolean, true par defaut)
- Ajouter un checkbox "Creer un album par sous-dossier" dans la section des resultats
- Dans `handleImport`, si l'option est activee :
  - Creer un album parent avec le nom du dossier racine scanne via `useAlbums.addAlbum()`
  - Pour chaque sous-dossier contenant des fichiers, creer un sous-album (avec `parentId` vers l'album racine)
  - Associer les `mediaIds` des fichiers importes a leur album respectif via `addMediaToAlbum()`

### 2. Integration du hook useAlbums dans FolderScanner

- Importer `useAlbums` dans le composant
- Utiliser `addAlbum()` et `addMediaToAlbum()` pour creer la hierarchie

### 3. Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/FolderScanner.tsx` | Ajout du toggle, logique de creation d'albums lors de l'import |

Aucun autre fichier ne necessite de modification -- le systeme d'albums (`useAlbums.ts`) et l'affichage des albums (`AlbumManager.tsx`) supportent deja les sous-albums et les `mediaIds`.

