

## Diagnostic precis

Le bouton poubelle appelle `removeMediaByFolder(folder)` qui filtre par `m.sourceFolder !== folder`. Or il y a potentiellement plusieurs problemes :

1. **Les medias importes AVANT la correction** ont `sourceFolder` stocke avec l'ancien format (nom court comme `"Pictures"`) tandis que ceux importes APRES ont le chemin complet (`C:\Users\jimmy\Pictures`). Le filtre ne matche donc pas tous les medias.

2. **Zustand persist** : le store est sauvegarde dans `localStorage` sous la cle `media-vault-storage`. Si le `sourceFolder` n'a jamais ete mis a jour dans les donnees persistees, les anciennes valeurs restent.

3. **Pas de log ni de feedback** pour savoir combien de medias ont ete supprimes -- l'action semble ne rien faire alors qu'elle supprime peut-etre 0 items (car aucun match).

## Solution proposee : Nettoyage robuste multi-criteres

Au lieu de comparer uniquement par `sourceFolder` (fragile si les valeurs ne matchent pas), on va utiliser **plusieurs criteres** pour identifier les medias d'un dossier lie :

### 1. Ameliorer `removeMediaByFolder` dans `useMediaStore.ts`

Remplacer le filtre simple par un filtre multi-criteres qui verifie :
- `m.sourceFolder === folder` (match exact)
- OU `m.sourceFolder` est le nom court du dossier ET `m.isLinked === true`
- OU `m.sourcePath` commence par le chemin du dossier (si c'est un chemin complet)
- OU `m.url` contient le chemin encode du dossier (pour les fichiers servis par le serveur local)

Cela garantit que **tous** les medias lies a ce dossier sont supprimes, quel que soit le format stocke.

```text
Avant :  m.sourceFolder !== folder  (match exact uniquement)
Apres :  aucun des criteres ne matche  (multi-criteres robuste)
```

### 2. Ajouter un log dans `handleUnlinkFolder` dans `MediaHeader.tsx`

Avant de supprimer, compter les medias qui seront supprimes et afficher le nombre dans le toast :
- `"3 medias supprimes du dossier Pictures"` au lieu de `"Dossier delie et medias supprimes"`
- Si 0 medias supprimes, afficher un avertissement : `"Aucun media trouve pour ce dossier"`

### 3. Normaliser `sourceFolder` a l'import dans `FolderScanner.tsx`

Stocker **toujours** le chemin complet normalise (remplacer `\` par `/` et retirer le trailing slash) pour eviter les incoherences futures.

### 4. Forcer le rafraichissement du Popover apres suppression

Apres `removeMediaByFolder`, le Popover doit refleter que le dossier n'existe plus. On va ajouter un petit delai + fermeture automatique du Popover si la liste devient vide.

## Modifications techniques

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useMediaStore.ts` | Remplacer `removeMediaByFolder` par un filtre multi-criteres qui matche par sourceFolder exact, nom court, sourcePath prefix, ou URL contenant le chemin |
| `src/components/MediaHeader.tsx` | 1. Compter les medias avant/apres suppression pour afficher le nombre dans le toast |
|                                   | 2. Ajouter une gestion d'etat pour le Popover (ouvert/ferme) pour le fermer apres suppression si liste vide |
| `src/components/FolderScanner.tsx` | Normaliser le chemin dans `sourceFolder` (remplacer backslashes, retirer trailing slash) |

## Detail du nouveau `removeMediaByFolder`

```text
removeMediaByFolder: (folder) => set((state) => {
  const folderName = folder.split(/[/\\]/).pop()?.toLowerCase();
  const folderNormalized = folder.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();

  const remaining = state.media.filter((m) => {
    if (!m.isLinked) return true; // garder les medias locaux (uploades)

    // Critere 1 : match exact sourceFolder
    if (m.sourceFolder === folder) return false;

    // Critere 2 : match normalise
    if (m.sourceFolder && m.sourceFolder.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase() === folderNormalized) return false;

    // Critere 3 : sourceFolder est le nom court
    if (m.sourceFolder && m.sourceFolder.toLowerCase() === folderName) return false;

    // Critere 4 : sourcePath commence par le chemin du dossier
    if (m.sourcePath && m.sourcePath.replace(/\\/g, '/').toLowerCase().startsWith(folderNormalized)) return false;

    return true;
  });

  return {
    media: remaining,
    sourceFolderFilter: state.sourceFolderFilter === folder ? null : state.sourceFolderFilter,
  };
})
```

Cette approche est **robuste** car elle couvre tous les cas de figure : ancien format, nouveau format, slashes differents, casse differente. Elle ne supprime jamais les medias uploades manuellement (non lies).
