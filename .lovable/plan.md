
# Rendre la fenetre d'informations adaptative

## Probleme

La fenetre d'informations (`MediaInfoDialog`) a deux problemes :

1. **Largeur fixe trop petite** : `sm:max-w-md` (448px) coupe le contenu horizontalement, obligeant a scroller
2. **Preview figee en 16:9** : La classe `aspect-video` force un ratio fixe, donc les photos en portrait ou en carre sont mal affichees

## Solution

### Changements dans `src/components/MediaInfoDialog.tsx`

1. **Elargir la fenetre** : Remplacer `sm:max-w-md` par `sm:max-w-2xl` (672px) pour donner plus de place au contenu et a la preview

2. **Preview adaptative** : Supprimer le ratio fixe `aspect-video` et utiliser une hauteur max (`max-h-[50vh]`) avec `w-auto` et `object-contain` pour que l'image ou la video s'affiche dans ses proportions naturelles sans etre coupee

3. **Scroll interne propre** : Garder `max-h-[90vh] overflow-y-auto` pour que la fenetre reste dans l'ecran meme avec beaucoup de contenu, mais le contenu ne sera plus coupe horizontalement

### Resultat attendu

- Photo en paysage : la preview est large et basse
- Photo en portrait : la preview est etroite et haute (limitee a 50% de la hauteur d'ecran)
- Video : meme comportement adaptatif
- Toutes les informations (nom, tags, metadonnees) restent visibles sans scroll horizontal
