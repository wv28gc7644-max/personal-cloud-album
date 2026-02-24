

# Diagnostic et correction de l'affichage de l'image upscalee

## Analyse des logs

Les logs console montrent une situation contradictoire :
- Le serveur retourne HTTP 200 avec une URL valide
- `onLoad` se declenche : "Image Apres chargee OK"
- Mais l'utilisateur ne voit rien dans le panneau "Apres"

## Causes probables identifiees

### 1. Le serveur ne verifie pas que le fichier de sortie existe reellement

Apres l'execution du binaire ESRGAN, le serveur retourne immediatement une URL **sans verifier** que le fichier upscale a ete cree avec succes. Si ESRGAN echoue silencieusement (exit code 0 mais pas de fichier cree), le serveur renvoie quand meme un succes.

### 2. Fichier cree mais vide ou corrompu

ESRGAN pourrait creer un fichier de 0 octets (erreur GPU, format non supporte, etc.). Le serveur le sert quand meme, le navigateur fait `onLoad` sur une image vide, et rien ne s'affiche visuellement.

### 3. Warning DialogContent manque `Description`

Le warning `Missing Description or aria-describedby` indique que le Dialog peut avoir un comportement instable.

## Solution

### Fichier 1 : `server.cjs` (+ `serverTemplate.ts`)

Ajouter une **verification post-traitement** apres l'execution d'ESRGAN :

```text
// Apres doUpscale()...
if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
  res.writeHead(500, { ... });
  return res.end(JSON.stringify({ 
    error: 'ESRGAN n\'a pas produit de fichier de sortie valide',
    inputPath: absPath, 
    expectedOutput: outPath 
  }));
}
const fileSize = fs.statSync(outPath).size;
// Retourner aussi la taille dans la reponse :
res.end(JSON.stringify({ savedPath: outPath, url, fileSize }));
```

Appliquer la meme verification pour la methode Docker (fallback port 9004).

### Fichier 2 : `src/components/UpscaleModal.tsx`

1. **Ajouter `DialogDescription`** pour corriger le warning :
   ```text
   <DialogDescription>Comparez l'image originale et upscalee</DialogDescription>
   ```

2. **Afficher la taille du fichier** dans le resultat pour confirmer visuellement que le fichier est valide :
   ```text
   Upscale x4 - 2.3 Mo
   ```

3. **Ajouter un cache-buster** sur l'URL de l'image pour eviter le cache navigateur d'un ancien fichier vide :
   ```text
   src={`${serverBase}${resultUrl}?t=${Date.now()}`}
   ```

4. **Logger les dimensions** de l'image chargee via `onLoad` pour confirmer qu'elle a une taille reelle :
   ```text
   onLoad={(e) => {
     const img = e.currentTarget;
     console.log('[Upscale] Dimensions:', img.naturalWidth, 'x', img.naturalHeight);
   }}
   ```

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `server.cjs` | Verification fichier sortie existe + taille > 0 apres ESRGAN (binaire + Docker) |
| `src/assets/serverTemplate.ts` | Meme verification (miroir) |
| `src/components/UpscaleModal.tsx` | DialogDescription, cache-buster URL, affichage taille fichier, log dimensions |

