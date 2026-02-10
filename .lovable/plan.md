

# Refonte du Design des Cartes + Personnalisation du clic droit

## Ce qui va changer

### 1. Remplacement des presets par les vraies vues

Les 3 presets actuels (Normal, Minimaliste, Compact) dans le **Design des cartes** seront remplaces par les 6 vues reelles de l'application :

| Vue | Description |
|-----|-------------|
| Grille | Cartes alignees en rangees |
| Grande grille | Cartes plus grandes, 2 colonnes |
| Liste | Vue en ligne horizontale |
| Mosaique | Colonnes decalees style Pinterest |
| Media seul | Photo/video sans decoration |
| Adaptatif | Ratio original preserve |

Quand on clique sur une vue, la preview a gauche affiche exactement a quoi ressemble cette vue. Et les parametres de personnalisation avancee a droite s'appliquent specifiquement a cette vue. Chaque vue a ses propres reglages sauvegardes independamment.

### 2. Editeur drag-and-drop des elements de carte (style widgets Mac)

Un nouveau panneau "Constructeur" sera ajoute sous les presets de vue, permettant de :

- **Voir tous les elements disponibles** : En-tete, Zone media, Metadonnees, Actions, Titre, Badge duree, Compteur de vues, Bouton Info (i)
- **Activer/desactiver** chaque element avec un switch
- **Reordonner** les elements par drag-and-drop (en utilisant `@dnd-kit` deja installe)
- **Ajouter/supprimer** des elements depuis un catalogue lateral

La preview se met a jour en temps reel au fur et a mesure des modifications.

### 3. Personnalisation du menu contextuel (clic droit)

Un nouveau module dans **Apparence** > **Menu contextuel** permettra de :

- Voir la liste de toutes les actions disponibles (Voir, Informations, Telecharger, Enregistrer sous, Favoris, Copier le chemin, Supprimer, plus de futures actions)
- **Activer/desactiver** chaque action
- **Reordonner** les actions par drag-and-drop
- **Ajouter des separateurs** entre les groupes d'actions
- Preview en temps reel du menu contextuel resultant

Le `MediaContextMenu` lira cette configuration depuis le store pour afficher uniquement les actions choisies, dans l'ordre choisi.

---

## Details techniques

### Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/hooks/useContextMenuConfig.ts` | Store Zustand pour la configuration du menu contextuel (actions actives, ordre, separateurs) |
| `src/components/settings/ContextMenuSettings.tsx` | Module de parametres avec drag-and-drop pour personnaliser le clic droit |

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/CardDesignEditor.tsx` | Remplacer les 3 presets par les 6 vues reelles. Ajouter un panneau "Constructeur" avec drag-and-drop des elements de carte. Sauvegarder les settings par vue (cle `mediavault-card-settings-{viewMode}`). La preview reflette la vue selectionnee. |
| `src/components/MediaContextMenu.tsx` | Lire la config depuis `useContextMenuConfig` pour filtrer et ordonner les actions affichees |
| `src/types/settings.ts` | Ajouter le module `ContextMenuSettings` dans `DEFAULT_LAYOUT_CONFIG` (categorie Apparence) |
| `src/components/settings/SettingsView.tsx` | Ajouter `ContextMenuSettings` dans le `COMPONENT_MAP` |
| `src/hooks/useSettingsLayout.ts` | Ajouter le nouveau module dans les defaults |

### Architecture des settings par vue

```text
localStorage:
  mediavault-card-settings-grid       -> { showHeader, showActions, ... }
  mediavault-card-settings-grid-large -> { showHeader, showActions, ... }
  mediavault-card-settings-list       -> { ... }
  mediavault-card-settings-masonry    -> { ... }
  mediavault-card-settings-media-only -> { ... }
  mediavault-card-settings-adaptive   -> { ... }
```

Chaque vue a ses propres parametres. Le `CardDesignEditor` charge/sauvegarde les settings de la vue actuellement selectionnee dans l'editeur.

### Structure du store menu contextuel

```text
useContextMenuConfig:
  actions: [
    { id: 'view', label: 'Voir', icon: 'Eye', enabled: true, order: 0 },
    { id: 'info', label: 'Informations', icon: 'Info', enabled: true, order: 1 },
    { id: 'separator-1', type: 'separator', order: 2 },
    { id: 'download', label: 'Telecharger', icon: 'Download', enabled: true, order: 3 },
    ...
  ]
```

### Flux de donnees

```text
CardDesignEditor                    MediaGrid / MediaCards
       |                                    |
  [selectionne vue "grille"]         [lit viewMode actif]
       |                                    |
  [charge settings de "grid"]        [charge settings de viewMode]
       |                                    |
  [modifie via sliders/drag]         [applique les parametres]
       |                                    |
  [sauvegarde dans localStorage]     [ecoute 'settings-changed' event]


ContextMenuSettings                 MediaContextMenu
       |                                    |
  [drag-and-drop actions]           [lit config depuis store]
       |                                    |
  [sauvegarde dans store]           [affiche actions actives dans l'ordre]
```

