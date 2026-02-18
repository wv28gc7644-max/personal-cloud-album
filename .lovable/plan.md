

# Ajout de l'installation FFmpeg dans l'interface + corrections cache

## Problemes identifies

### 1. FFmpeg non installe = 99 erreurs video
Le diagnostic montre clairement **FFmpeg: Non trouve**. Le serveur possede deja les endpoints `/api/check-ffmpeg`, `/api/install-ffmpeg` et `/api/install-ffmpeg-status`, mais **aucun bouton** n'existe dans l'interface pour les utiliser. L'utilisateur n'a donc aucun moyen d'installer FFmpeg depuis les parametres.

Sur 163 fichiers : 8 images generees avec Sharp, 56 deja en cache, et **99 erreurs** = toutes les videos, car sans FFmpeg il est impossible d'extraire une frame.

### 2. Miniatures dupliquees (meme image sur plusieurs cartes)
Le hash utilise pour nommer les fichiers cache est genere avec `base64url` du chemin complet, puis **tronque a 100 caracteres**. Si deux fichiers ont des chemins longs avec le meme prefixe, ils peuvent produire le meme hash tronque, resultant en la meme miniature affichee pour des fichiers differents.

**Correction** : utiliser un hash cryptographique (MD5 ou SHA1) du chemin complet au lieu de base64url tronque. Cela garantit l'unicite quel que soit la longueur du chemin.

---

## Corrections prevues

### 1. Bouton d'installation FFmpeg dans l'interface

Ajouter dans la carte "Dependances serveur" de `ServerSettings.tsx` une section FFmpeg identique a celle de Sharp :
- Detection automatique au montage (appel `/api/check-ffmpeg`)
- Bouton "Installer FFmpeg" si non installe
- Barre de progression pendant le telechargement/extraction
- Suivi du statut via `/api/install-ffmpeg-status` (polling toutes les 2 secondes)
- Bouton "Reinstaller" meme quand deja installe
- Affichage de la version detectee

### 2. Corriger le hash des miniatures pour eviter les doublons

Dans `server.cjs` et `serverTemplate.ts`, remplacer :
```text
AVANT: Buffer.from(filePath).toString('base64url').replace(...).slice(0, 100)
APRES: require('crypto').createHash('md5').update(filePath).digest('hex')
```

Le hash MD5 produit toujours 32 caracteres, est unique pour chaque chemin, et ne risque pas de collision par troncature.

**Important** : vider le cache existant apres cette modification (les anciens noms de fichiers ne correspondront plus). Un message dans l'interface demandera a l'utilisateur de vider et regenerer le cache.

### 3. Re-generation automatique des miniatures manquantes

Quand le diagnostic detecte des miniatures manquantes, afficher un bouton "Regenerer les manquantes" dans la carte Cache. Ce bouton appelle `/api/generate-thumbnails` qui ne regenerera que les fichiers sans miniature en cache (les existants sont ignores grace au `skipped`).

---

## Details techniques

### Fichiers modifies

| Fichier | Modifications |
|---------|--------------|
| `src/components/settings/ServerSettings.tsx` | Ajouter section FFmpeg dans "Dependances serveur" avec detection auto, bouton d'installation, progression, et reinstallation. |
| `server.cjs` | Remplacer le hash base64url tronque par MD5 dans `/api/thumbnail/`, `/api/generate-thumbnails`, et toute reference au hash de cache. |
| `src/assets/serverTemplate.ts` | Memes corrections de hash que server.cjs. |

### Section FFmpeg dans l'interface

La section apparaitra juste en dessous de Sharp dans la carte "Dependances serveur" :

```text
Dependances serveur
├── sharp          ✅ Installe          [Reinstaller]
└── ffmpeg         ❌ Non installe      [Installer FFmpeg]
                   ↳ Barre de progression pendant le telechargement
                   ↳ "FFmpeg installe ! Version: 7.x"
```

### Flux d'installation FFmpeg

```text
1. Clic sur "Installer FFmpeg"
2. POST /api/install-ffmpeg (lance le telechargement en arriere-plan)
3. Polling GET /api/install-ffmpeg-status toutes les 2s
   → { step: 'downloading', progress: 45, message: 'Telechargement...' }
   → { step: 'extracting', progress: 80, message: 'Extraction...' }
   → { step: 'done', progress: 100, message: 'FFmpeg installe !' }
4. Re-verification automatique via /api/check-ffmpeg
5. Affichage "✅ Installe - Version X.Y"
```

### Chemin d'acces pour l'utilisateur

Tout se trouve dans **Parametres → Serveur local** :
- **Installer FFmpeg** : carte "Dependances serveur" → section "ffmpeg" → bouton "Installer FFmpeg"
- **Verifier l'installation** : le statut s'affiche automatiquement a cote du nom "ffmpeg"
- **Apres installation** : cliquer "Pre-generer toutes les miniatures" dans la carte Cache pour generer les miniatures videos manquantes

