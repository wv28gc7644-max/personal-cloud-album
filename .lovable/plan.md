
# Correction de l'erreur de syntaxe dans server.cjs

## Probleme

Le serveur ne demarre plus a cause d'une erreur `SyntaxError: Missing catch or finally after try` a la ligne 2295 de `server.cjs`.

## Diagnostic

Les lignes 2292-2295 contiennent le corps d'un endpoint `/api/install-ffmpeg-status` (retourne `global.ffmpegInstallStatus`) mais sans sa condition `if` correspondante. C'est un fragment orphelin qui a ete deconnecte de son bloc `if` lors d'une edition precedente.

Le code actuel (lignes 2290-2295) :

```text
    }  // fin du bloc /api/upscale-media


      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(global.ffmpegInstallStatus || { step: 'idle', progress: 0, message: '' }));
    }
```

Le `}` de la ligne 2295 ferme un bloc qui n'a jamais ete ouvert, d'ou l'erreur de syntaxe.

## Correction

Ajouter la condition `if` manquante avant la ligne 2293 pour recreer l'endpoint `/api/install-ffmpeg-status` :

```text
    if (pathname === '/api/install-ffmpeg-status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(global.ffmpegInstallStatus || { step: 'idle', progress: 0, message: '' }));
    }
```

La meme verification sera faite dans `src/assets/serverTemplate.ts` pour maintenir la coherence entre les deux fichiers.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `server.cjs` | Ajouter le `if` manquant pour `/api/install-ffmpeg-status` (ligne 2292) |
| `src/assets/serverTemplate.ts` | Verifier et corriger le meme bloc si necessaire |
