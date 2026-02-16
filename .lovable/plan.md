

# Installation de Sharp, cache fonctionnel et miniatures fiables

## Diagnostic de la situation actuelle

Le diagnostic serveur confirme :
- Le serveur repond bien sur `/api/health` (200 OK)
- Sharp **n'est pas installe** (`installed: false`)
- Le cache est **vide** (0 fichiers)

Sans Sharp, les miniatures images sont servies en taille originale (lent, gros fichiers). Sans Sharp NI FFmpeg, les miniatures videos retournent un code 204 (vide) -- donc les cartes video restent blanches.

De plus, un bug dans `MediaCardMinimal` fait que les images utilisent `src={item.url}` (fichier original) au lieu de `src={thumbnailUrl}` (miniature optimisee). Les miniatures serveur ne sont donc meme pas utilisees sur certaines vues.

---

## Corrections prevues

### 1. Installation de Sharp amelioree (server.cjs + serverTemplate.ts)

Le probleme actuel : `npm install sharp` est lance dans le dossier du serveur, mais il n'y a probablement pas de `package.json` dans ce dossier, ce qui peut causer des erreurs silencieuses.

**Corrections :**
- Avant d'executer `npm install sharp`, verifier/creer un `package.json` minimal dans le dossier du serveur s'il n'existe pas
- Attendre la fin de l'installation avant de repondre (au lieu de repondre immediatement "Installation lancee")
- Retourner le stdout + stderr complet pour savoir exactement ce qui s'est passe
- Ajouter un endpoint `/api/install-sharp-status` pour verifier l'avancement si l'installation prend du temps

### 2. Interface d'installation Sharp amelioree (ServerSettings.tsx)

**Corrections :**
- Le bouton "Installer" affichera un spinner + barre de progression
- Apres l'installation, re-verifier automatiquement le statut de Sharp
- Afficher un message clair : "Sharp installe avec succes. Redemarrez le serveur pour activer les miniatures."
- En cas d'erreur, afficher les details de l'erreur (stdout/stderr du npm install)
- Ajouter un bouton "Reinstaller" visible meme quand Sharp est deja installe

### 3. Bouton "Pre-generer le cache" (server.cjs + ServerSettings.tsx)

Un nouveau endpoint `/api/generate-thumbnails` qui :
- Parcourt tous les fichiers medias du dossier
- Genere les miniatures une par une (images via sharp, videos via ffmpeg)
- Retourne le nombre de miniatures generees

Dans l'interface, un bouton "Pre-generer toutes les miniatures" dans la carte Cache qui lance cette operation et affiche la progression.

### 4. Diagnostic specifique au cache (ServerSettings.tsx)

Un bouton "Diagnostiquer le cache" qui teste :
- Est-ce que le dossier `.thumbnail-cache` existe ?
- Est-ce que Sharp peut generer une miniature test ?
- Est-ce que FFmpeg est disponible pour les videos ?
- Combien de fichiers media n'ont pas encore de miniature en cache ?

Le rapport s'affiche directement dans l'interface.

### 5. Corriger les miniatures sur toutes les vues

**MediaCardMinimal.tsx** (ligne 125-126) : les images utilisent `src={item.url}` au lieu de `src={thumbnailUrl || item.url}`. Cela charge le fichier original entier au lieu de la miniature optimisee.

**Correction sur tous les composants :**

| Composant | Correction |
|-----------|-----------|
| `MediaCardMinimal.tsx` | Changer `src={item.url}` en `src={thumbnailUrl &#x7C;&#x7C; item.url}` pour les images |
| `MediaCardAdaptive.tsx` | Deja correct (`src={item.thumbnailUrl &#x7C;&#x7C; item.url}`) |
| `MediaCardTwitter.tsx` | Deja correct (`src={thumbnailUrl &#x7C;&#x7C; item.url}`) |

---

## Details techniques

### Fichiers modifies

| Fichier | Modifications |
|---------|--------------|
| `server.cjs` | Creer `package.json` avant `npm install sharp`, attendre la fin, retourner le resultat complet. Ajouter `/api/generate-thumbnails` pour pre-generer le cache. Ajouter `/api/cache-diagnostic` pour tester le cache. |
| `src/assets/serverTemplate.ts` | Memes corrections que server.cjs |
| `src/components/settings/ServerSettings.tsx` | Ameliorer le flux d'installation Sharp (spinner, resultat, re-verification auto). Ajouter bouton "Pre-generer le cache". Ajouter bouton "Diagnostiquer le cache". |
| `src/components/MediaCardMinimal.tsx` | Corriger `src={item.url}` en `src={thumbnailUrl &#x7C;&#x7C; item.url}` pour les images |

### Flux d'installation Sharp (cote serveur)

```text
POST /api/install-sharp
  1. Verifier si package.json existe dans __dirname
     -> Si non, creer { "name": "mediavault-server", "private": true }
  2. Executer: npm install sharp --save
  3. Attendre la fin (timeout 120s)
  4. Retourner: { success: true/false, output: "...", message: "..." }
```

### Flux pre-generation du cache (cote serveur)

```text
POST /api/generate-thumbnails
  1. Lister tous les fichiers media du MEDIA_FOLDER
  2. Pour chaque fichier, verifier si une miniature existe dans .thumbnail-cache
  3. Si non, generer la miniature (sharp pour images, ffmpeg pour videos)
  4. Retourner: { total: N, generated: M, skipped: S, errors: E }
```

