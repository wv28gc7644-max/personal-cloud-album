

## Probleme identifie

Le bouton de suppression (croix/poubelle) appelle `handleUnlinkFolder(folder)` ou `folder` est le **nom court** du dossier (ex: `"Pictures"`), extrait de `media.sourceFolder`. Or :

1. **Le serveur attend un `id`** pour supprimer un dossier lie (`data.linkedFolders.filter(f => f.id !== body.id)`), mais le client envoie `{ path: "Pictures" }` -- le serveur ne trouve jamais le dossier a supprimer.

2. **L'historique localStorage** stocke le **chemin complet** (ex: `C:\Users\jimmy\Pictures`) dans `h.path`, mais le filtre de nettoyage compare avec le nom court `"Pictures"` -- jamais de correspondance, donc l'historique n'est jamais nettoye.

3. **`removeMediaByFolder`** fonctionne correctement (il compare `m.sourceFolder` avec le nom court), mais les deux autres operations echouent silencieusement, donnant l'impression que rien ne se passe.

## Solution

### 1. Stocker le chemin complet dans `sourceFolder` (FolderScanner.tsx)

Actuellement ligne 213 : `sourceFolder: folderName` (nom court).
Changer en : `sourceFolder: scanResult.path` (chemin complet, ex: `C:\Users\jimmy\Pictures`).

Cela aligne `sourceFolder` avec ce qui est stocke dans l'historique (`h.path`) et sur le serveur.

### 2. Corriger le DELETE serveur (server.cjs)

Ligne 779 : `data.linkedFolders.filter(f => f.id !== body.id)`
Changer en : filtrer aussi par `f.path` pour supporter `{ path: "..." }` envoye par le client.

### 3. Corriger handleUnlinkFolder (MediaHeader.tsx)

Envoyer `{ path: folder }` au serveur (deja fait) mais aussi envoyer `{ id: folder }` pour couvrir les deux cas, ou mieux : le serveur accepte les deux.

### 4. Afficher le nom court dans le dropdown

Puisque `sourceFolder` contiendra maintenant le chemin complet, afficher seulement le dernier segment dans le dropdown pour la lisibilite (ex: `C:\Users\jimmy\Pictures` affiche `Pictures`).

## Modifications techniques

| Fichier | Modification |
|---------|-------------|
| `src/components/FolderScanner.tsx` | Ligne 213 : changer `sourceFolder: folderName` en `sourceFolder: scanResult.path` pour stocker le chemin complet |
| `src/components/MediaHeader.tsx` | 1. Afficher le dernier segment du chemin dans le dropdown (`folder.split(/[/\\]/).pop()`) au lieu du chemin complet |
| | 2. Envoyer `{ path: folder, id: folder }` au serveur DELETE pour maximiser la compatibilite |
| `server.cjs` | Ligne 779 : changer le filtre pour accepter suppression par `path` OU par `id` : `data.linkedFolders.filter(f => f.id !== body.id && f.path !== body.path)` |

Ces 3 corrections alignent les identifiants entre le store, l'historique localStorage et le serveur, ce qui fait que le bouton de suppression fonctionne reellement.

