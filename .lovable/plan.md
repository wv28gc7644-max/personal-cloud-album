

# Corrections manquantes a appliquer

## Probleme 1 : Warning ref dans MediaGrid (affecte le menu contextuel)

La console montre `Function components cannot be given refs` dans `MediaGrid`. Le `ContextMenuTrigger asChild` passe un ref au `<div>` enfant, ce qui devrait fonctionner. Mais le probleme vient du fait que `MediaContextMenu` est un composant fonction sans `forwardRef`, et `ContextMenuTrigger asChild` tente de passer un ref a travers lui.

**Solution** : Dans `MediaContextMenu.tsx`, le `<div>` wrapper autour de `{children}` doit etre suffisant, mais il faut aussi verifier que le composant entier peut recevoir un ref si necessaire. On va aussi s'assurer que le `motion.div` parent dans `MediaGrid` ne cree pas de conflit en retirant le `layout` prop qui peut interferer avec les refs.

| Fichier | Modification |
|---------|-------------|
| `src/components/MediaContextMenu.tsx` | Aucun changement necessaire -- le wrapper `<div>` est correct |
| `src/components/MediaGrid.tsx` | Verifier que les `motion.div` ne causent pas de conflit de ref avec le `ContextMenu` |

---

## Probleme 2 : SettingsView ne contraint pas la hauteur du CardDesignEditor

Le `SettingsView` affiche le `CardDesignEditor` dans un `<div className="space-y-4">` sans contrainte de hauteur. Le `CardDesignEditor` a un layout split (`flex gap-6 h-full`) mais `h-full` ne fonctionne que si le parent a une hauteur definie.

**Solution** : Quand le module actif est `CardDesignEditor`, le conteneur parent doit utiliser `flex-1 overflow-y-auto` au lieu de `space-y-4` simple. On va restructurer `SettingsView` pour que le conteneur du module actif prenne toute la hauteur disponible.

| Fichier | Modification |
|---------|-------------|
| `src/components/settings/SettingsView.tsx` | Changer le conteneur du module actif : remplacer `space-y-4` par `flex flex-col flex-1 min-h-0`, et le wrapper du composant par `flex-1 min-h-0 overflow-y-auto` |

---

## Probleme 3 : SettingsView n'a pas de scroll propre

La vue parametres est dans `main > flex-col overflow-hidden` mais le `SettingsView` lui-meme n'a pas de `overflow-y-auto`. Quand on ouvre un module comme `GridSettings` ou `NotificationsSettings`, le contenu depasse sans scroll.

**Solution** : Ajouter `overflow-y-auto` au conteneur de `SettingsView` dans `Index.tsx`, comme c'est fait pour les autres vues.

| Fichier | Modification |
|---------|-------------|
| `src/pages/Index.tsx` | Envelopper `<SettingsView />` dans `<div className="flex-1 overflow-y-auto">` |

---

## Probleme 4 : CardDesignEditor -- preview et presets fixes, avance scrollable

Le `CardDesignEditor` a deja un layout split mais le cote droit (`overflow-y-auto`) scrolle tout (presets + personnalisation avancee). L'utilisateur veut que les presets restent fixes en haut et que seule la personnalisation avancee scrolle.

**Solution** : Restructurer le cote droit en deux zones : une zone fixe (presets) et une zone scrollable (personnalisation avancee).

| Fichier | Modification |
|---------|-------------|
| `src/components/CardDesignEditor.tsx` | Restructurer le cote droit : presets en `shrink-0`, personnalisation avancee en `flex-1 overflow-y-auto` |

---

## Resume des fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/Index.tsx` | Ajouter `flex-1 overflow-y-auto` autour de `SettingsView` |
| `src/components/settings/SettingsView.tsx` | Restructurer le conteneur du module actif pour supporter la hauteur pleine |
| `src/components/CardDesignEditor.tsx` | Separer presets (fixes) et personnalisation avancee (scrollable) dans le panneau droit |
| `src/components/MediaGrid.tsx` | Corriger le warning de ref en ajustant l'imbrication motion.div / ContextMenu |

