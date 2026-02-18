
# État actuel — Corrections cache + FFmpeg + hash MD5

## ✅ Corrections appliquées

### 1. Hash MD5 (anti-doublons de miniatures)
- **server.cjs** et **serverTemplate.ts** : remplacé `Buffer.from(path).toString('base64url')...slice(0,100)` par `require('crypto').createHash('md5').update(path).digest('hex')` dans `/api/thumbnail/` et `/api/generate-thumbnails`.
- ⚠️ **Action utilisateur requise** : vider le cache existant puis re-générer (les anciens noms de fichiers ne correspondent plus au nouveau hash).

### 2. Bouton d'installation FFmpeg dans l'interface
- Section FFmpeg ajoutée dans la carte "Dépendances serveur" de `ServerSettings.tsx`
- Détection automatique au montage (appel `/api/check-ffmpeg`)
- Bouton "Installer FFmpeg" avec barre de progression (polling `/api/ffmpeg-install-status`)
- Bouton "Réinstaller" quand déjà installé
- Affichage de la version détectée

### 3. Auto-connexion + dossiers liés (précédemment implémenté)
- `useEffect` auto-connexion au montage
- `/api/generate-thumbnails` et `/api/cache-diagnostic` scannent les linkedFolders de data.json

### 4. Curseurs de préchargement avancé (précédemment implémenté)
- 3 curseurs dans "Prévisualisation vidéo" : médias préchargés, lignes pré-scroll, tampon vidéo

## Instructions pour l'utilisateur

1. **Mettre à jour server.cjs** : télécharger la nouvelle version via Paramètres → Mises à jour
2. **Redémarrer le serveur** local
3. **Vider le cache** : Paramètres → Serveur local → Cache des miniatures → Vider
4. **Installer FFmpeg** : Paramètres → Serveur local → Dépendances serveur → Installer FFmpeg
5. **Pré-générer** : cliquer "Pré-générer toutes les miniatures" — les vidéos seront maintenant traitées
