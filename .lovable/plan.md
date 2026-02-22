
# Installation automatique du service ESRGAN (Upscaling IA)

## Situation actuelle

- Le bouton "Upscaler" existe deja sur chaque carte media et ouvre un modal fonctionnel
- Le serveur a l'endpoint `/api/upscale-media` qui appelle ESRGAN sur le port 9004
- Dans les parametres, la section ESRGAN affiche seulement "Disponible" ou "Non disponible" avec un bouton "Verifier"
- **Aucun moyen d'installer ESRGAN** depuis l'interface --- juste une ligne de commande Docker en texte

## Solution : installation 1-clic de Real-ESRGAN portable

ESRGAN necessite Python + PyTorch + le modele RealESRGAN. Pour simplifier au maximum, l'installation se fera en **3 etapes automatiques** via un seul bouton :

1. Telechargement de l'executable portable Real-ESRGAN (pas besoin de Python ni Docker)
2. Telechargement du modele pre-entraine (~67 Mo)
3. Lancement d'un micro-serveur Flask local sur le port 9004

### Pourquoi l'executable portable ?

Le projet `xinntao/Real-ESRGAN` fournit des **binaires Windows portables** (pas besoin de Python) :
- `realesrgan-ncnn-vulkan.exe` : fonctionne avec GPU Vulkan (NVIDIA, AMD, Intel)
- Taille totale : ~50 Mo + modeles (~67 Mo)
- Pas de CUDA requis, pas de Python, pas de Docker

Comme ce binaire ne fournit pas de serveur HTTP, le serveur local (`server.cjs`) fera office de proxy : au lieu d'appeler le port 9004, il executera directement le binaire avec `child_process.execFile()` pour traiter chaque image.

---

## Modifications prevues

### 1. Serveur (`server.cjs` + `serverTemplate.ts`)

**Nouveau endpoint `POST /api/install-esrgan`** :
- Telecharge `realesrgan-ncnn-vulkan` depuis GitHub Releases
- Extrait dans `%USERPROFILE%\MediaVault-AI\esrgan\`
- Telecharge le modele `realesrgan-x4plus` automatiquement
- Suivi de progression via `global.esrganInstallStatus`

**Nouveau endpoint `GET /api/install-esrgan-status`** :
- Retourne `{ step, progress, message }` comme pour FFmpeg

**Nouveau endpoint `GET /api/check-esrgan`** :
- Verifie si `realesrgan-ncnn-vulkan.exe` existe dans le dossier d'installation
- Retourne `{ installed: true/false, path: '...' }`

**Modifier `POST /api/upscale-media`** :
- Au lieu d'appeler le port 9004 via HTTP, executer directement le binaire :
  ```text
  realesrgan-ncnn-vulkan.exe -i input.jpg -o output.jpg -s 4 -n realesrgan-x4plus
  ```
- Cela supprime la dependance au serveur Python Flask
- Fallback : si le port 9004 repond, utiliser le serveur Docker (pour ceux qui l'ont deja)

### 2. Interface (`ServerSettings.tsx`)

Remplacer la section ESRGAN actuelle par une interface complete (identique a Sharp/FFmpeg) :
- Detection automatique au montage via `/api/check-esrgan`
- Bouton "Installer ESRGAN" avec barre de progression
- Polling `/api/install-esrgan-status` toutes les 2 secondes
- Affichage "Installe" avec bouton "Reinstaller"
- Message d'erreur en cas d'echec

```text
Dependances serveur
+-- sharp          Installe          [Reinstaller]
+-- ffmpeg         Installe          [Reinstaller]
+-- ESRGAN         Non installe      [Installer ESRGAN]
                   -> Barre de progression
                   -> "ESRGAN installe ! (realesrgan-ncnn-vulkan)"
```

### 3. Verification du bouton Upscale sur les cartes

Les boutons existent deja dans `MediaCardTwitter.tsx` et `MediaCardAdaptive.tsx`. Verification :
- Le bouton Sparkles ouvre bien `UpscaleModal`
- Le modal appelle `/api/upscale-media` qui sera mis a jour pour utiliser le binaire local
- Le resultat est sauvegarde dans `upscaled/` et affiche en comparaison avant/apres

Aucune modification necessaire sur les cartes --- tout est deja cable.

---

## Details techniques

### Flux d'installation

```text
1. Clic "Installer ESRGAN"
2. POST /api/install-esrgan
3. Le serveur :
   a. Cree %USERPROFILE%\MediaVault-AI\esrgan\
   b. Telecharge realesrgan-ncnn-vulkan-windows.zip (~25 Mo)
   c. Extrait le zip (PowerShell Expand-Archive)
   d. Verifie que l'exe existe
4. Polling GET /api/install-esrgan-status toutes les 2s
   -> { step: 'downloading', progress: 30, message: 'Telechargement...' }
   -> { step: 'extracting', progress: 70, message: 'Extraction...' }
   -> { step: 'done', progress: 100, message: 'ESRGAN installe !' }
5. Re-verification via /api/check-esrgan
6. Affichage "Installe"
```

### Flux d'upscaling (modifie)

```text
1. Utilisateur clique Sparkles sur une carte -> UpscaleModal s'ouvre
2. Choisit l'echelle (x2, x4, x8) -> clique "Upscaler"
3. POST /api/upscale-media { mediaPath, scale }
4. Le serveur :
   a. Verifie que le binaire ESRGAN existe
   b. Copie le fichier source dans un temp
   c. Execute : realesrgan-ncnn-vulkan.exe -i temp/input -o temp/output -s 4
   d. Copie le resultat dans upscaled/[nom]_upscaled_4x.[ext]
   e. Retourne { url: '/media/.../upscaled/...' }
5. Le modal affiche le resultat avec comparaison avant/apres
```

### Prerequis pour l'utilisateur

- **Aucun** : le binaire portable inclut tout (pas de Python, pas de CUDA, pas de Docker)
- GPU Vulkan recommande (NVIDIA/AMD/Intel recent) mais fonctionne aussi en CPU
- Espace disque : ~100 Mo au total

### Fichiers modifies

| Fichier | Modifications |
|---------|--------------|
| `server.cjs` | Endpoints `/api/install-esrgan`, `/api/install-esrgan-status`, `/api/check-esrgan` + modifier `/api/upscale-media` pour utiliser le binaire |
| `src/assets/serverTemplate.ts` | Memes modifications (miroir) |
| `src/components/settings/ServerSettings.tsx` | Section ESRGAN complete avec bouton d'installation, progression, detection |
