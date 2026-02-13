

# Corrections : Explorateur de fichiers, miniatures et parametres

## Problemes identifies

### 1. "Reveler dans l'explorateur" ouvre le mauvais emplacement
Le code actuel utilise `spawn('explorer', ['/select,', winPath])` qui passe `/select,` et le chemin comme deux arguments separes. Windows `explorer.exe` ne comprend pas ca et ouvre donc le dossier utilisateur par defaut. La solution est d'utiliser `exec` avec la commande complete en une seule chaine : `explorer /select,"C:\chemin\vers\fichier"`.

### 2. Dependances serveur et cache affichent "Non connecte"
C'est normal : ces fonctionnalites necessitent que le serveur local soit demarre et que `server.cjs` contienne les endpoints `/api/check-sharp`, `/api/install-sharp`, `/api/cache-stats` et `DELETE /api/cache`. Ces endpoints existent deja dans le code du serveur. Le probleme est que l'utilisateur n'a pas encore telecharge la derniere version de `server.cjs` sur sa machine. Une fois mis a jour et redemarre, tout fonctionnera :
- Le bouton "Installer" pour sharp lancera `npm install sharp` automatiquement
- Le cache affichera le nombre de fichiers et la taille
- Le bouton "Vider" supprimera les miniatures en cache

### 3. Parametres de previsualisation video
L'interface existe deja avec :
- Delai avant lecture (0-5000ms avec slider + saisie manuelle)
- Previsualisation au survol (1-30s avec switch activer/desactiver)
Le code dans `MediaCardTwitter.tsx` lit ces reglages et les applique. Pas de modification necessaire cote interface.

## Ce qui doit etre corrige dans le code

### Fichier : `server.cjs`

Remplacer la commande `spawn` par `exec` pour Windows dans l'endpoint `/api/reveal-in-explorer` :

```text
// AVANT (ne fonctionne pas) :
spawn('explorer', ['/select,', winPath], { shell: false, detached: true })

// APRES (fonctionne) :
exec('explorer /select,"' + winPath + '"')
```

Cela enverra la commande complete `explorer /select,"D:\Photos\image.jpg"` a Windows, qui ouvrira l'explorateur au bon emplacement avec le fichier selectionne.

### Fichier : `src/assets/serverTemplate.ts`

Si ce fichier contient une copie du template serveur pour le telechargement, il doit aussi etre mis a jour avec la meme correction.

## Resume

| Fichier | Modification |
|---------|-------------|
| `server.cjs` | Corriger reveal-in-explorer : utiliser `exec` au lieu de `spawn` avec la syntaxe `explorer /select,"chemin"` |
| `src/assets/serverTemplate.ts` | Meme correction dans le template telechargeable |

Tout le reste (sharp, cache, video settings) fonctionne deja dans le code. L'utilisateur doit simplement telecharger la nouvelle version de `server.cjs` via les parametres > Mises a jour, puis redemarrer le serveur.

