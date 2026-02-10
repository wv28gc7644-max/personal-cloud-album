

## Problemes identifies

### 1. Le bouton supprimer (X) ne delinkle pas le dossier
Le bouton X a cote du filtre dossier source dans le header (`MediaHeader.tsx` ligne 160-167) ne fait que **remettre le filtre a null** (`setSourceFolderFilter(null)`). Il ne supprime PAS les medias lies ni le dossier de la liste. C'est un bouton "effacer le filtre", pas un bouton "supprimer le dossier lie". Il manque une vraie fonction pour delinkler un dossier entier.

### 2. Le filtre dossier apparait/disparait de facon aleatoire
Le dropdown "dossier source" ne s'affiche que si `sourceFolders.length > 0` (ligne 139). Or `getSourceFolders()` se base sur le champ `sourceFolder` des medias. Si les medias n'ont pas de `sourceFolder` (par exemple apres un rechargement de page avec des donnees corrompues ou si le champ n'a pas ete renseigne correctement), le dropdown disparait.

## Solution

### Ajouter une action "Supprimer le dossier lie" dans le dropdown

Dans le dropdown de filtre par dossier, ajouter un bouton de suppression a cote de chaque dossier qui :
- Supprime tous les medias lies provenant de ce dossier (`media.filter(m => m.sourceFolder === folder)`)
- Supprime l'entree de l'historique (`removeFromHistory`)
- Supprime le dossier lie cote serveur (appel DELETE `/api/linked-folders`)
- Remet le filtre a null si le dossier actif est supprime

### Ajouter un bouton "Delinkler" visible quand un dossier est filtre

A cote du bouton X (effacer filtre), ajouter un bouton poubelle (Trash2) qui supprime **tous les medias** du dossier actuellement filtre. Cela rend l'action de suppression claire et distincte du simple "effacer le filtre".

### Renforcer la robustesse du filtre

- Verifier que `sourceFolderFilter` pointe vers un dossier qui existe encore dans les medias ; sinon le remettre a null automatiquement.

## Modifications techniques

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useMediaStore.ts` | Ajouter `removeMediaByFolder(folder: string)` qui supprime tous les medias dont `sourceFolder === folder`, et remet `sourceFolderFilter` a null si c'etait le dossier actif |
| `src/components/MediaHeader.tsx` | Ajouter un bouton Trash2 a cote du X quand un dossier est filtre, qui appelle `removeMediaByFolder` + supprime de l'historique + appel serveur DELETE. Ajouter aussi une icone de suppression dans chaque item du SelectContent |

