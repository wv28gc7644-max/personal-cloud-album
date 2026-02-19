
# 3 fonctionnalités : MediaViewer adaptatif, latence vidéo, et Upscaling IA sur les cartes

## Problème 1 : Zone morte dans le MediaViewer (portrait/carré)

### Diagnostic
Le conteneur media dans `MediaViewer.tsx` (ligne 222) force `w-full h-full` :
```
className="flex flex-col items-center w-full h-full max-w-[98vw] ... cursor-default"
```
Le media s'affiche en `object-contain` à l'intérieur de cette boite fixe 16:9. Pour une photo portrait (3:4), le media occupe seulement ~60% de la largeur, mais la zone "cursor-default" (qui bloque le clic de fermeture) couvre toujours 100% de la largeur. Résultat : on ne peut pas cliquer à côté pour fermer.

### Solution
Remplacer la logique de conteneur fixe par un conteneur qui se redimensionne selon le média :
- Pour les **images** : utiliser `max-w-fit` + `max-h-[calc(100vh-80px)]` + `object-contain` sur l'image, mais placer `onClick(e.stopPropagation())` directement sur l'`<img>` plutôt que sur le conteneur parent.
- Pour les **vidéos** : même principe, le player wrap autour du contenu réel.
- Le backdrop (fond noir) reste cliquable partout, y compris dans les zones libres à gauche/droite d'une photo portrait.

**Fichier modifié** : `src/components/MediaViewer.tsx`

**Technique** : supprimer `w-full h-full` du conteneur `mediaContainerRef`, le passer en `inline-flex` avec `max-w` et `max-h` contraints, et déplacer le `stopPropagation` sur l'élément `<img>` ou `<video>` lui-même. Le clic en dehors du media réel sera automatiquement capté par le backdrop.

---

## Problème 2 : Latence énorme sur l'aperçu vidéo au survol

### Diagnostic
Dans `MediaCardTwitter.tsx` et `MediaCardAdaptive.tsx`, la vidéo a `preload="none"` — elle ne charge **rien** avant le survol. Quand `handleMouseEnter` appelle `.play()`, le navigateur doit :
1. Établir la connexion HTTP au serveur local
2. Télécharger les premiers Mo de données vidéo
3. Décoder et afficher la première image

Tout cela prend 1 à 5 secondes selon la taille du fichier, d'où la latence visible.

### Solution en 2 parties

**Partie A — Préchargement progressif après scroll** : quand un item vidéo entre dans le viewport (IntersectionObserver), passer son `<video>` en `preload="metadata"`. Cela charge uniquement les métadonnées + première frame (~quelques Ko), sans charger la totalité de la vidéo. Quand l'utilisateur survole, la première image est déjà en mémoire et la lecture démarre instantanément.

**Partie B — Indicateur de chargement** : pendant que la vidéo commence à jouer (entre le survol et la réception des premières données), afficher un petit spinner sur la vignette pour signaler que le contenu est en cours de chargement, plutôt qu'une image figée sans feedback.

**Fichiers modifiés** :
- `src/components/MediaCardTwitter.tsx` : ajouter IntersectionObserver + `preload="metadata"` dynamique + spinner
- `src/components/MediaCardAdaptive.tsx` : même correction

---

## Problème 3 : Bouton Upscale sur les cartes + vue dédiée

### Architecture

L'upscaling ESRGAN est déjà câblé dans `server.cjs` (port 9004, endpoint `/api/ai/esrgan/upscale`). Il faut :
1. Un **bouton "Upscaler"** sur les cartes media (visible au survol)
2. Un **modal d'upscaling** avec avant/après et choix d'options
3. Une **vue "Upscaler"** dans la sidebar pour retrouver les fichiers upscalés
4. Un **endpoint serveur** `/api/upscale-media` qui lit le fichier local, appelle ESRGAN, et sauvegarde dans `upscaled/` côte à côte avec le fichier original
5. Un **bouton d'installation ESRGAN** dans ServerSettings (comme Sharp/FFmpeg)

### Détail des composants

#### A. Bouton sur les cartes
Dans `MediaCardTwitter.tsx` et `MediaCardAdaptive.tsx`, ajouter un bouton `ZoomIn` dans la zone d'actions au survol (à côté de Download). Quand cliqué, ouvre le modal `UpscaleModal`.

**Accès** : Survoler n'importe quelle carte → bouton ↑ en haut à droite → ouvre le modal.

#### B. Modal d'upscaling (`src/components/UpscaleModal.tsx`)
Interface en 3 colonnes :
- **Gauche** : aperçu "Avant" (miniature actuelle)
- **Droite** : aperçu "Après" (résultat upscalé)
- **Centre** : contrôles (échelle ×2/×4/×8, modèle, réduction bruit)
- Barre de progression réelle pendant le traitement
- Bouton "Comparer" (slider interactif avant/après)
- Bouton "Sauvegarder" → envoie au serveur local qui sauvegarde dans `[dossier_source]/upscaled/[nom]_upscaled_4x.[ext]`

#### C. Vue Upscaler dans la sidebar
Ajouter `'upscaler'` à `ViewType` + une entrée dans la sidebar (icône `ZoomIn`, label "Upscalés"). Cette vue liste les fichiers dans les dossiers `upscaled/` des dossiers liés + MEDIA_FOLDER.

#### D. Endpoint serveur (`server.cjs`)
Nouveau endpoint `POST /api/upscale-media` :
```text
1. Reçoit { mediaPath, scale, model, denoise }
2. Lit le fichier depuis le chemin absolu local
3. Envoie en multipart à ESRGAN (port 9004)
4. Reçoit l'image upscalée
5. Crée le dossier upscaled/ si nécessaire
6. Sauvegarde [nom]_upscaled_Xx.[ext]
7. Retourne { savedPath, url }
```

#### E. Détection ESRGAN dans ServerSettings
Ajouter une 3ème dépendance "ESRGAN (Upscaling)" dans la carte "Dépendances serveur" :
- Vérification du service sur port 9004 via `/health`
- Instructions d'installation (Docker ou script Python)
- Lien vers la documentation

**Accès** : Paramètres → Serveur local → carte "Dépendances serveur" → section "ESRGAN"

---

## Résumé des fichiers modifiés

| Fichier | Modifications |
|---------|--------------|
| `src/components/MediaViewer.tsx` | Conteneur adaptatif (supprime zone morte autour des photos portrait) |
| `src/components/MediaCardTwitter.tsx` | `preload="metadata"` via IntersectionObserver + spinner + bouton Upscale |
| `src/components/MediaCardAdaptive.tsx` | Même optimisation de préchargement |
| `src/components/UpscaleModal.tsx` | Nouveau composant : modal upscaling avec avant/après, progression, sauvegarde |
| `src/types/views.ts` | Ajouter `'upscaler'` |
| `src/pages/Index.tsx` | Gérer la vue `'upscaler'` |
| `src/components/Sidebar.tsx` | Entrée "Upscalés" avec icône ZoomIn |
| `server.cjs` | Endpoint `POST /api/upscale-media`, détection ESRGAN |
| `src/assets/serverTemplate.ts` | Mirror du même endpoint |
| `src/components/settings/ServerSettings.tsx` | Section ESRGAN dans "Dépendances serveur" |

---

## Chemins d'accès pour l'utilisateur

- **Bouton Upscale** : Survol d'une carte media → icône `↑` en haut à droite → modal d'upscaling
- **Vue fichiers upscalés** : Barre latérale → "Upscalés" (icône loupe+)
- **Statut ESRGAN** : Paramètres → Serveur local → carte "Dépendances serveur" → ligne "ESRGAN"
- **Fermer le viewer** : Cliquer n'importe où en dehors de la photo/vidéo réelle (même à gauche/droite d'une photo portrait)
