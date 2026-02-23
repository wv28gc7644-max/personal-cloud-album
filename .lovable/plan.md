

# Correction de l'upscaling : image non affichee apres traitement

## Probleme identifie

Le processus d'upscaling fonctionne (le binaire ESRGAN s'execute et cree le fichier), mais **l'image upscalee ne s'affiche pas** dans le modal car l'URL renvoyee par le serveur est incorrecte pour les fichiers provenant de dossiers lies.

### Cause racine

Le serveur construit l'URL du resultat avec :
```text
path.relative(MEDIA_FOLDER, outPath)  -->  "/media/../../LinkedFolder/upscaled/file.jpg"
```

Pour un fichier dans un dossier lie (ex: `D:\Photos\`), le chemin upscale (`D:\Photos\upscaled\file_upscaled_4x.jpg`) est **en dehors** de MEDIA_FOLDER. Le `path.relative()` produit un chemin avec `../..` qui :
1. N'est pas une URL valide pour la route `/media/`
2. Est bloque par le controle de securite `filePath.startsWith(MEDIA_FOLDER)` (ligne 3186)

Meme pour les fichiers dans MEDIA_FOLDER, l'URL utilise `encodeURIComponent` sur le chemin complet puis remplace `%2F` par `/`, ce qui peut causer des problemes avec les espaces et caracteres speciaux dans les noms de dossiers.

## Solution

### 1. Serveur (`server.cjs` + `serverTemplate.ts`)

Modifier le endpoint `POST /api/upscale-media` pour construire l'URL correcte selon l'origine du fichier :

- **Fichier dans MEDIA_FOLDER** : continuer a utiliser `/media/chemin/relatif`
- **Fichier dans un dossier lie** : utiliser `/linked-media/` + encodage base64url du chemin absolu du fichier upscale

```text
// Apres l'upscaling, determiner la bonne URL :
if (outPath est dans MEDIA_FOLDER) {
  url = '/media/' + chemin_relatif_encode
} else {
  url = '/linked-media/' + Buffer.from(outPath).toString('base64url')
}
```

### 2. Modal (`UpscaleModal.tsx`)

Corriger l'affichage de l'image "Apres" : actuellement le code prefixe toujours `serverBase` devant `resultUrl`. Mais si l'URL est deja correcte (commence par `/media/` ou `/linked-media/`), il suffit de prefixer `serverBase` — ce qui est deja fait. Donc le modal n'a pas besoin de changement si le serveur renvoie la bonne URL.

Cependant, ajouter une gestion d'erreur sur l'image "Apres" (`onError`) pour afficher un message utile si l'image ne charge pas.

### 3. Verification de l'encodage URL

Remplacer la construction d'URL actuelle :
```text
// AVANT (bugge pour les espaces et caracteres speciaux) :
'/media/' + encodeURIComponent(relToMedia).replace(/%2F/g, '/')

// APRES (encode correctement chaque segment) :
'/media/' + relToMedia.split('/').map(s => encodeURIComponent(s)).join('/')
```

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `server.cjs` | Corriger la construction d'URL dans `/api/upscale-media` (methode 1 binaire + methode 2 Docker) |
| `src/assets/serverTemplate.ts` | Meme correction (miroir) |
| `src/components/UpscaleModal.tsx` | Ajouter `onError` sur les images resultat pour feedback visuel en cas d'echec de chargement |

## Detail technique de la correction serveur

Dans le endpoint `/api/upscale-media`, apres la creation du fichier upscale :

```text
// Determiner si le fichier est dans MEDIA_FOLDER ou dans un dossier lie
const normalizedOut = path.normalize(outPath);
const normalizedMedia = path.normalize(MEDIA_FOLDER);

let url;
if (normalizedOut.startsWith(normalizedMedia)) {
  // Fichier dans MEDIA_FOLDER : URL classique /media/
  const rel = path.relative(MEDIA_FOLDER, outPath).replace(/\\/g, '/');
  url = '/media/' + rel.split('/').map(s => encodeURIComponent(s)).join('/');
} else {
  // Fichier dans un dossier lie : URL /linked-media/ avec base64url
  url = '/linked-media/' + Buffer.from(outPath).toString('base64url');
}
```

Cette correction s'applique aux deux endroits ou l'URL est construite : apres l'upscaling par binaire portable (ligne 2382) et apres l'upscaling par Docker (ligne 2418).

