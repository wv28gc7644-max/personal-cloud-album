

# Plan complet : Layout fixe, menu contextuel, cartes unifiees, mises a jour automatiques

## Problemes identifies

1. **Scroll** : Le header et la sidebar scrollent avec le contenu. Il faut les fixer.
2. **Menu contextuel (clic droit)** : Le composant `MediaContextMenu` existe et est branche dans `MediaGrid`, mais le `ContextMenuTrigger` utilise `asChild` sur un `motion.div` qui ne forwarde pas correctement le ref. C'est pour ca que le clic droit ne fonctionne pas.
3. **Icone Info (i)** absente des cartes media.
4. **Parametres de grille** non unifies entre les vues.
5. **Mises a jour** : le hook `useRealtimeUpdateCheck` existe deja mais n'est probablement pas active, et le serveur ouvre un fichier texte apres la mise a jour.

---

## Partie 1 : Layout fixe (header + sidebar)

Le layout actuel dans `Index.tsx` utilise `flex min-h-screen` avec `overflow-hidden` sur le main, mais le header est `sticky` au lieu d'etre dans un layout flex fixe.

**Changement** : Restructurer le layout pour que :
- La sidebar soit `h-screen` fixe (deja le cas)
- Le `main` soit `flex flex-col h-screen overflow-hidden`
- Le header soit un element fixe en haut (pas sticky, juste un element flex sans shrink)
- Seule la zone de contenu sous le header ait `overflow-y-auto`

Cela s'applique a TOUTES les vues (timeline, calendar, albums, etc.), pas seulement la grille.

| Fichier | Modification |
|---------|-------------|
| `src/pages/Index.tsx` | Changer `min-h-screen` en `h-screen` sur le wrapper, s'assurer que chaque branche de vue a le header fixe + contenu scrollable |
| `src/components/MediaHeader.tsx` | Retirer `sticky top-0` du header (le layout flex s'en charge), garder juste `shrink-0` |

---

## Partie 2 : Corriger le menu contextuel (clic droit)

Le probleme est que `ContextMenuTrigger asChild` passe un ref au composant enfant, mais l'enfant est un `motion.div` dans `MediaGrid.tsx` qui ne forwarde pas ce ref.

**Solution** : Inverser l'imbrication -- placer le `MediaContextMenu` **a l'interieur** du `motion.div` au lieu de l'envelopper autour. Ou bien, mettre le `ContextMenuTrigger` directement autour de la carte (pas du motion.div).

| Fichier | Modification |
|---------|-------------|
| `src/components/MediaGrid.tsx` | Deplacer `MediaContextMenu` a l'interieur du `motion.div`, envelopper directement la carte (`MediaCardTwitter`, etc.) |

---

## Partie 3 : Ajouter l'icone Info (i) sur les cartes

Ajouter un petit bouton `(i)` en overlay sur chaque carte qui ouvre le `MediaInfoDialog`.

| Fichier | Modification |
|---------|-------------|
| `src/components/MediaCardTwitter.tsx` | Ajouter un bouton Info en overlay (coin superieur gauche ou dans la barre d'actions) qui ouvre `MediaInfoDialog` |
| `src/components/MediaCardAdaptive.tsx` | Meme ajout |
| `src/components/MediaCardMinimal.tsx` | Meme ajout (en overlay au survol) |

---

## Partie 4 : Unifier les parametres de grille

Actuellement, `GridSettings` modifie `gridColumns` dans les settings admin, mais la grille utilise des classes Tailwind codees en dur (`grid-cols-2 lg:grid-cols-3`) sans utiliser cette valeur.

**Solution** : Faire en sorte que `getGridClasses()` dans `MediaGrid.tsx` utilise la valeur `gridColumns` des parametres admin pour TOUTES les vues (grid, adaptive, masonry, etc.). Le selecteur dans `GridSettings` indiquera clairement que le reglage s'applique a toutes les vues.

| Fichier | Modification |
|---------|-------------|
| `src/components/MediaGrid.tsx` | Utiliser `gridColumns` de `getAdminSettings()` pour generer les classes CSS dynamiquement au lieu de classes codees en dur |
| `src/components/settings/GridSettings.tsx` | Ajouter une mention "S'applique a toutes les vues" sous le titre |

---

## Partie 5 : Mises a jour automatiques en temps reel

Le hook `useRealtimeUpdateCheck` est deja code et fonctionnel. Il faut :

1. S'assurer qu'il est active par defaut (verifier ou il est utilise)
2. Reduire l'intervalle au minimum (10 secondes deja en place)
3. Dans le script de mise a jour (`Mettre a jour MediaVault.bat`), ajouter un flag pour le mode silencieux : ne pas ouvrir le fichier texte de log, rediriger les logs vers le dossier `logs/`

| Fichier | Modification |
|---------|-------------|
| `src/components/settings/UpdatesSettings.tsx` | Verifier que l'option "Verification en temps reel" est activee par defaut |
| `src/hooks/useStartupUpdateCheck.ts` | S'assurer que le hook de verification est branche au demarrage |

---

## Partie 6 : Ameliorer le CardDesignEditor (scroll)

L'editeur de design a deja un layout split (preview a gauche, settings a droite). Le probleme est que le conteneur parent ne contraint pas la hauteur.

**Solution** : Forcer le conteneur parent dans `SettingsView` a donner une hauteur fixe au `CardDesignEditor`, pour que le cote droit scrolle independamment et que la preview + presets restent fixes.

| Fichier | Modification |
|---------|-------------|
| `src/components/CardDesignEditor.tsx` | Ajuster le layout : preview + presets fixes en haut, personnalisation avancee scrollable en dessous |

---

## Resume des fichiers a modifier

| Fichier | Type |
|---------|------|
| `src/pages/Index.tsx` | Layout fixe h-screen |
| `src/components/MediaHeader.tsx` | Retirer sticky, ajouter shrink-0 |
| `src/components/MediaGrid.tsx` | Fix context menu + colonnes dynamiques |
| `src/components/MediaCardTwitter.tsx` | Ajouter bouton Info (i) |
| `src/components/MediaCardAdaptive.tsx` | Ajouter bouton Info (i) |
| `src/components/MediaCardMinimal.tsx` | Ajouter bouton Info (i) |
| `src/components/settings/GridSettings.tsx` | Clarifier "toutes les vues" |
| `src/components/CardDesignEditor.tsx` | Fix scroll du panneau |

