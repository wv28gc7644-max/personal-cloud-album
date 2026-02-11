
# Plan d'optimisation - IMPLÉMENTÉ

## Solutions appliquées

### ✅ Solution 1 : Miniatures serveur (`/api/thumbnail/`)
- Endpoint qui génère des miniatures 400px max via `sharp` (ou fallback original)
- Pour les vidéos : extraction d'une frame via `ffmpeg`
- Cache disque dans `.thumbnail-cache/`
- Les URLs de scan (`/api/scan-folder` et `/api/files`) pointent vers `/api/thumbnail/` au lieu du fichier original

### ✅ Solution 2 : Virtualisation de la grille
- `MediaGrid` et `FolderExplorer` n'affichent que 40 éléments à la fois
- Chargement progressif par lots de 40 via `IntersectionObserver`
- Suppression des animations Framer Motion individuelles (2000+ animations → 0)
- Compteur "X / Y médias affichés" en bas

### ❌ Solution 3 : Délai survol vidéo (non demandée par l'utilisateur)

### ✅ Solution 4 : Révéler dans l'explorateur natif
- Endpoint `POST /api/reveal-in-explorer` avec commande OS native
- Windows: `explorer /select,"chemin"` | macOS: `open -R` | Linux: `xdg-open`
- `MediaInfoDialog` appelle cet endpoint au lieu de `window.open('file:///')`
