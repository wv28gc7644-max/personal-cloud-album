
# Plan d'Amélioration MediaVault

## Résumé des 3 demandes

1. **Scroll des paramètres** - Le panneau de paramètres ne descend pas jusqu'en bas de l'écran
2. **Mise à jour silencieuse** - Un nouveau mode de mise à jour qui fonctionne entièrement en arrière-plan sans fenêtres visibles
3. **Lecteur vidéo personnalisé** - Un lecteur style YouTube avec heatmap d'audience intégrée

---

## 1. Correction du Scroll des Paramètres

### Problème identifié
Dans `SettingsGrid.tsx` (ligne 202), la `ScrollArea` utilise une hauteur fixe :
```tsx
<ScrollArea className="h-[calc(100vh-280px)]">
```

Cette valeur fixe de `280px` ne s'adapte pas correctement à toutes les configurations d'écran et de contenu.

### Solution
- Modifier le layout du `SettingsGrid` pour utiliser `flex-1` et `min-h-0` (pattern identifié dans la sidebar)
- Adapter aussi `SettingsView.tsx` pour que le conteneur parent permette au scroll de fonctionner correctement
- Utiliser `h-full` au lieu d'une hauteur calculée

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/settings/SettingsGrid.tsx` | Remplacer `h-[calc(100vh-280px)]` par `flex-1 min-h-0` + wrapper flex |
| `src/components/settings/SettingsView.tsx` | S'assurer que le conteneur parent utilise `flex flex-col h-full` |

---

## 2. Mise à Jour Silencieuse (Background Update)

### Fonctionnement actuel
Le script `Mettre a jour MediaVault.bat` fonctionne mais :
- Ouvre une fenêtre terminal visible
- Affiche les logs en temps réel
- Ouvre Notepad à la fin

### Solution proposée
Créer un **nouveau script compagnon** `Mettre a jour MediaVault (silencieux).bat` qui :
1. Exécute exactement les mêmes opérations que le script existant
2. Redirige TOUT vers des fichiers logs (pas d'affichage terminal)
3. Utilise `start /min` ou PowerShell en mode caché pour ne rien montrer
4. Envoie une notification système Windows à la fin (succès ou échec)

### Nouveau script : Comportement
```text
1. Démarre en mode totalement invisible (PowerShell -WindowStyle Hidden)
2. Exécute les mêmes étapes :
   - Sauvegarde media/ + data.json + AI/
   - Git fetch/reset OU téléchargement ZIP
   - npm install
   - npm run build
   - Restauration des données
3. Écrit les logs dans logs/silent/
4. À la fin : notification Windows via PowerShell (New-BurntToastNotification ou balloon tip)
5. Si erreur : ouvre automatiquement le log d'erreur
```

### Intégration UI
- Dans `UpdatesSettings.tsx`, ajouter un nouveau bouton "Télécharger Mise à jour silencieuse.bat"
- Dans les paramètres de notifications, ajouter une option "Mode mise à jour silencieuse par défaut"

### Fichiers à modifier/créer
| Fichier | Action |
|---------|--------|
| `src/components/settings/UpdatesSettings.tsx` | Ajouter bouton de téléchargement du script silencieux |
| `src/components/settings/NotificationsSettings.tsx` | Ajouter option "Mise à jour silencieuse" |
| Script généré dynamiquement | Créer `Mettre a jour MediaVault (silencieux).bat` |

---

## 3. Lecteur Vidéo Personnalisé Style YouTube

### Analyse de l'existant
- `MediaViewer.tsx` utilise actuellement `<video controls>` → lecteur natif du navigateur
- `VideoHeatmapInteractive.tsx` affiche déjà un heatmap des segments les plus vus
- `useMediaStats.ts` stocke les statistiques par segment (5 secondes)
- `StatsPanel.tsx` affiche les statistiques globales

### Fonctionnalités YouTube à reproduire

#### 3.1 Interface du lecteur
- Barre de contrôle personnalisée (pas les contrôles natifs)
- Bouton play/pause centré + sur la barre
- Timeline avec preview au survol
- Volume avec slider
- Paramètres (vitesse, qualité si applicable)
- Mode plein écran
- Bouton picture-in-picture
- Affichage temps actuel / durée totale

#### 3.2 Heatmap d'audience (comme YouTube)
- Superposé sur la barre de progression
- Couleurs : bleu froid → rouge chaud selon le nombre de vues du segment
- Cliquable pour naviguer

#### 3.3 Statistiques d'audience enrichies
Le heatmap représente les "moments les plus regardés" basés sur :
- Nombre de fois que ce segment a été visionné
- Détection des replays (seek backwards)
- Segments où les gens quittent souvent

### Architecture proposée

```text
src/components/video-player/
├── CustomVideoPlayer.tsx       # Composant principal
├── VideoControls.tsx           # Barre de contrôle personnalisée
├── VideoProgressBar.tsx        # Timeline avec heatmap intégré
├── VolumeControl.tsx           # Contrôle du volume
├── PlaybackSpeed.tsx           # Sélecteur de vitesse
├── VideoSettings.tsx           # Menu paramètres (vitesse, PiP)
└── VideoTimeDisplay.tsx        # Affichage temps
```

### Données de statistiques
Les statistiques existantes (`useMediaStats`) sont déjà suffisantes :
- `segments: { start, end, views }[]` - exactement ce qu'il faut pour le heatmap

### Intégration
- Remplacer le `<video controls>` dans `MediaViewer.tsx` par `<CustomVideoPlayer>`
- Conserver la compatibilité avec le heatmap existant

### Fichiers à créer
| Fichier | Description |
|---------|-------------|
| `src/components/video-player/CustomVideoPlayer.tsx` | Player principal |
| `src/components/video-player/VideoControls.tsx` | Barre de contrôles |
| `src/components/video-player/VideoProgressBar.tsx` | Progress bar + heatmap |
| `src/components/video-player/VolumeControl.tsx` | Volume slider |
| `src/components/video-player/PlaybackSpeed.tsx` | Vitesse x0.5 à x2 |
| `src/components/video-player/VideoSettings.tsx` | Menu settings |

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| `src/components/MediaViewer.tsx` | Utiliser CustomVideoPlayer au lieu de `<video controls>` |

---

## Ordre d'implémentation

1. **Scroll paramètres** (rapide, ~5 min)
2. **Script mise à jour silencieuse** (~15 min)
3. **Lecteur vidéo personnalisé** (~45 min)
   - D'abord le player de base avec contrôles
   - Puis le heatmap intégré
   - Puis les fonctionnalités avancées (vitesse, PiP)

---

## Section Technique

### 1. Scroll - Code cible

**SettingsView.tsx**
```tsx
<div className="h-full flex flex-col">
  {/* contenu */}
</div>
```

**SettingsGrid.tsx**
```tsx
<div className="relative h-full flex flex-col min-h-0">
  {/* header */}
  <ScrollArea className="flex-1 min-h-0">
    {/* catégories */}
  </ScrollArea>
</div>
```

### 2. Script silencieux - Points clés

```batch
@echo off
:: Lancer en mode caché via PowerShell
powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0silent-update.ps1"
exit /b
```

Le script PowerShell fait le travail en arrière-plan et envoie une notification :
```powershell
# À la fin
[Windows.UI.Notifications.ToastNotificationManager, ...]
# Ou via balloon tip (plus simple)
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.BalloonTipTitle = "MediaVault"
$notify.BalloonTipText = "Mise à jour terminée !"
$notify.ShowBalloonTip(5000)
```

### 3. Lecteur vidéo - Structure HTML/CSS

Le player sera un `<div>` contenant :
- `<video>` sans attribut `controls`
- Une `<div>` overlay pour les contrôles personnalisés
- Le heatmap intégré dans la barre de progression

Comportement :
- Masquer les contrôles après 3s d'inactivité
- Afficher au mouvement de souris
- Raccourcis clavier (Espace, M, F, flèches)
