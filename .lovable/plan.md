
# Plan d'Amélioration MediaVault

## Résumé des demandes

1. **MediaViewer plus grand** - Le média s'affiche trop petit avec trop d'espace autour
2. **Qualité vidéo** - Sélecteur de qualité dans le lecteur
3. **Format durée** - Afficher heures:minutes:secondes (voire jours)
4. **Vitesse x4** - Étendre les vitesses de lecture jusqu'à x4
5. **Bouton téléchargement** - Ajouter un bouton DL dans les contrôles vidéo
6. **Heatmap amélioré** - Courbe lisse au-dessus de la timeline (style YouTube)
7. **Scan de dossiers** - Importer des médias par référence (sans copie)
8. **Grille adaptive** - Nouveau mode grille style Twitter (sans zoom/crop)
9. **Éditeur de cartes amélioré** - Écran partagé preview/settings
10. **Badges version** - Pastilles "New" dynamiques par version
11. **Numéro de version** - Afficher version + date dans le footer sidebar
12. **Vérification automatique** - Check GitHub toutes les 10 secondes + auto-update au démarrage

---

## 1. MediaViewer - Média plus grand

### Problème actuel
Le média utilise `max-w-5xl` et des paddings larges (`p-4 sm:p-8 md:p-16`) qui réduisent l'espace disponible.

### Solution
Réduire les marges et utiliser une logique "fill to edge" :
- Le média doit toucher soit le bord horizontal, soit le bord vertical
- Conserver un espace minimal de sécurité (16px) pour les contrôles
- Garder le clic en dehors pour fermer

### Fichier à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/MediaViewer.tsx` | Réduire paddings, retirer `max-w-5xl`, utiliser `w-full h-full` avec `object-contain` |

---

## 2. Sélecteur de Qualité Vidéo

### Analyse technique
Pour proposer plusieurs qualités (480p, 720p, 1080p...), il faudrait :
- **Option A** : Avoir plusieurs fichiers sources pré-encodés (comme YouTube)
- **Option B** : Un transcodage à la volée côté serveur (très lourd)

### Verdict
Ton serveur actuel (`server.cjs`) sert les fichiers bruts. Sans système de transcodage (comme FFmpeg ou un CDN), on ne peut pas proposer de vraies qualités alternatives.

### Alternative proposée
Afficher la résolution native de la vidéo + une option "qualité réduite" qui diminue la résolution CSS (pas la vraie qualité, mais réduit le débit pour les connexions lentes).

### Recommandation
**Ne pas implémenter maintenant** - Nécessiterait un pipeline de transcodage FFmpeg côté serveur. Je peux le prévoir pour plus tard si tu veux.

---

## 3. Format Durée (heures:minutes:secondes:jours)

### Problème actuel
La fonction `formatTime()` affiche uniquement `minutes:secondes`.

### Solution
Nouvelle fonction qui gère :
- Moins de 60 min : `mm:ss`
- 1h à 24h : `h:mm:ss`
- Plus de 24h : `Xj hh:mm:ss`

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/video-player/VideoControls.tsx` | Nouvelle fonction `formatDuration()` |
| `src/components/video-player/VideoProgressBar.tsx` | Même fonction pour le tooltip |

---

## 4. Vitesse de lecture jusqu'à x4

### Changement simple
Modifier le tableau `PLAYBACK_RATES` :

```typescript
// Avant
const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Après
const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
```

### Fichier à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/video-player/VideoControls.tsx` | Étendre `PLAYBACK_RATES` |

---

## 5. Bouton Téléchargement dans le lecteur

### Implémentation
Ajouter un bouton Download à côté de Settings/PiP/Fullscreen.

### Changements
- Ajouter prop `onDownload` à `VideoControls`
- Ajouter prop `onDownload` à `CustomVideoPlayer`
- Passer `onDownload` depuis `MediaViewer`

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/video-player/VideoControls.tsx` | Ajouter bouton Download |
| `src/components/video-player/CustomVideoPlayer.tsx` | Ajouter prop onDownload |
| `src/components/MediaViewer.tsx` | Passer onDownload au player |

---

## 6. Heatmap amélioré (courbe lisse style YouTube)

### Problème actuel
Le heatmap actuel affiche des barres de couleur en arrière-plan de la progress bar.

### Solution YouTube
Une courbe continue (area chart) **au-dessus** de la timeline qui apparaît au survol.

### Implémentation
- Dessiner un SVG avec une courbe smooth (bezier) au-dessus de la barre
- Opacité 0 par défaut, visible au hover
- Couleur dégradée du bleu au rouge selon l'intensité

### Fichier à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/video-player/VideoProgressBar.tsx` | Ajouter SVG courbe au-dessus |

---

## 7. Scan de dossiers (import par référence)

### Concept
Permettre à l'utilisateur de "lier" un dossier local au lieu de copier les fichiers.

### Composants nécessaires
1. **UI de sélection** : Bouton "Lier un dossier" dans le header ou modal d'upload
2. **API serveur** : Endpoint pour scanner un chemin et retourner les fichiers média
3. **Stockage** : Sauvegarder les chemins absolus dans `data.json` avec un flag `isLinked: true`

### Nouveaux fichiers
| Fichier | Description |
|---------|-------------|
| `src/components/FolderScanner.tsx` | Modal de scan de dossiers |
| Modification de `server.cjs` | Endpoint `/api/scan-folder` |

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| `src/hooks/useMediaStore.ts` | Support des médias liés |
| `src/components/MediaHeader.tsx` | Bouton "Lier un dossier" |

---

## 8. Grille Adaptive (style Twitter)

### Concept
Un nouveau mode de grille où chaque carte s'adapte à l'aspect ratio du média sans crop.

### Comportement
- Pas de `aspect-square` ou `aspect-video` fixe
- Le conteneur s'adapte à l'image/vidéo
- Layout CSS Grid avec `grid-auto-rows: min-content`
- Style Masonry-like

### Nouveaux fichiers
| Fichier | Description |
|---------|-------------|
| `src/components/MediaCardAdaptive.tsx` | Nouvelle carte adaptive |

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/MediaGrid.tsx` | Nouveau mode `adaptive` |
| `src/types/views.ts` | Ajouter type `grid-adaptive` |

---

## 9. Éditeur de cartes amélioré (split screen)

### Problème actuel
`CardDesignEditor.tsx` affiche preview et settings empilés verticalement.

### Solution
Layout en deux colonnes :
- **Gauche** (fixe) : Preview live qui ne scroll pas
- **Droite** (scrollable) : Tous les paramètres

### Changements
- Wrapper flex avec `flex-row`
- Colonne gauche : `sticky top-0` ou `flex-shrink-0`
- Colonne droite : `overflow-y-auto`

### Fichier à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/CardDesignEditor.tsx` | Refonte layout split |

---

## 10. Badges "New" dynamiques par version

### Concept
Les badges "New" doivent :
- Apparaître uniquement pour les features de la version actuelle
- Disparaître après le premier affichage OU après changement de version
- Être définis dans un fichier de configuration

### Implémentation
1. Créer un fichier `src/config/versionFeatures.ts` :
```typescript
export const VERSION = "1.5.0";
export const NEW_FEATURES = [
  "timeline",
  "calendar", 
  "custom-video-player",
  // ...
];
```

2. Comparer avec `localStorage` : `mediavault-seen-features-version`
3. Si version différente → reset les "vus"
4. Au clic sur un feature → marquer comme "vu"

### Nouveaux fichiers
| Fichier | Description |
|---------|-------------|
| `src/config/versionFeatures.ts` | Liste des features par version |
| `src/hooks/useNewFeatures.ts` | Logique de gestion des badges |

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/Sidebar.tsx` | Utiliser `useNewFeatures` pour `isNew` |
| `src/components/WhatsNew.tsx` | Idem |

---

## 11. Numéro de version dans le footer sidebar

### Changement
En bas de la sidebar, ajouter :
```
v1.5.0 • 27 jan. 2025 à 14:32
```

### Source de données
- Version : depuis `src/config/versionFeatures.ts`
- Date : depuis `localStorage.getItem('mediavault-last-update-date')` ou build time

### Fichier à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/Sidebar.tsx` | Ajouter footer avec version |

---

## 12. Vérification automatique des mises à jour

### État actuel
Le hook `useRealtimeUpdateCheck` vérifie déjà GitHub à intervalle configurable.

### Améliorations demandées
1. **Réduire l'intervalle** : Actuellement configurable, le mettre à 10 secondes par défaut
2. **Check au refresh** : Déjà fait (check initial après 5s)
3. **Auto-update au démarrage serveur** : Modifier `Lancer MediaVault.bat` pour vérifier et mettre à jour avant de lancer
4. **Page de maintenance** : Créer une page "Site en cours de mise à jour" avec progression

### Limitation GitHub Webhooks
Les webhooks GitHub nécessitent une URL publique accessible. Pour un serveur local, ce n'est pas possible sans tunnel (ngrok, etc.). La solution polling (toutes les 10s) est plus fiable.

### Nouveaux fichiers
| Fichier | Description |
|---------|-------------|
| `public/maintenance.html` | Page de maintenance statique |

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| `src/hooks/useRealtimeUpdateCheck.ts` | Intervalle 10s par défaut |
| Script `Lancer MediaVault.bat` | Check update avant lancement |

---

## Ordre d'implémentation

| Priorité | Tâche | Durée estimée |
|----------|-------|---------------|
| 1 | MediaViewer plus grand | ~5 min |
| 2 | Format durée h:m:s | ~5 min |
| 3 | Vitesse x4 | ~2 min |
| 4 | Bouton DL dans player | ~5 min |
| 5 | Heatmap courbe | ~15 min |
| 6 | Badges version dynamiques | ~15 min |
| 7 | Footer version sidebar | ~5 min |
| 8 | Éditeur cartes split | ~15 min |
| 9 | Grille adaptive | ~20 min |
| 10 | Scan dossiers | ~30 min |
| 11 | Auto-update 10s | ~5 min |

**Total estimé : ~2h**

---

## Ce qui n'est PAS faisable facilement

| Demande | Raison | Alternative |
|---------|--------|-------------|
| Qualité vidéo (480p/720p) | Nécessite transcodage serveur (FFmpeg pipeline) | Afficher résolution native |
| Webhook GitHub push | Nécessite URL publique | Polling toutes les 10s |
| Update automatique pendant utilisation | Risque de corruption | Notification + bouton 1-clic |

---

## Propositions supplémentaires pour la personnalisation des cartes

Tu as demandé des idées pour enrichir l'éditeur de cartes. Voici des options à cocher :

1. **Ombre portée** - Intensité et couleur de l'ombre
2. **Bordure colorée** - Épaisseur et couleur de bordure
3. **Animation au survol** - Scale, rotation, glow
4. **Position des tags** - En haut, en bas, cachés
5. **Overlay gradient** - Direction et intensité du dégradé
6. **Mode sombre/clair** - Preview dans les deux thèmes
7. **Espacement entre cartes** - Gap configurable
8. **Coins arrondis différenciés** - Par coin (top-left, etc.)

---

## Section Technique

### Format durée amélioré
```typescript
const formatDuration = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}j ${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```

### Structure heatmap SVG
```tsx
<svg className="absolute bottom-full left-0 right-0 h-8 opacity-0 group-hover:opacity-100">
  <defs>
    <linearGradient id="heatGradient" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
      <stop offset="100%" stopColor="rgba(239, 68, 68, 0.6)" />
    </linearGradient>
  </defs>
  <path d={generateSmoothPath(heatmapData)} fill="url(#heatGradient)" />
</svg>
```

### Version features config
```typescript
// src/config/versionFeatures.ts
export const APP_VERSION = "1.5.0";
export const BUILD_DATE = "2025-01-27T14:32:00Z";

export const VERSION_FEATURES: Record<string, string[]> = {
  "1.5.0": ["custom-video-player", "heatmap", "silent-update"],
  "1.4.0": ["timeline", "calendar", "albums"],
};
```
