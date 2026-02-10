

## Probleme identifie

Le code de suppression (`removeMediaByFolder`) est correct en theorie, mais il y a un probleme probable : **la persistence Zustand serialise `sourceFolder` tel quel**, or quand on compare le `folder` venant du bouton poubelle avec le `sourceFolder` stocke dans le media, il peut y avoir un decalage (par exemple espaces en fin de chaine, ou le `sourceFolder` n'a jamais ete ecrit correctement a l'import).

Le vrai souci est que `getSourceFolders()` lit les `sourceFolder` des medias en memoire, et le bouton poubelle passe cette meme valeur a `removeMediaByFolder`. Donc normalement ca devrait matcher. **Sauf si** le `sourceFolder` n'est pas du tout present sur les medias apres rechargement de la page (perdu a la deserialisation).

## Plan en 2 parties

### Partie 1 : Fiabiliser la suppression avec logs de diagnostic

Ajouter des `console.log` temporaires dans `removeMediaByFolder` pour voir exactement ce qui se passe quand on clique sur la poubelle :
- Le `folder` recu en parametre
- Le nombre de medias avec un `sourceFolder`
- Les valeurs de `sourceFolder` de chaque media
- Le nombre de medias supprimes vs gardes

Cela permettra de voir en console pourquoi rien n'est supprime.

En plus, ajouter un fallback : si aucun media n'est supprime par `sourceFolder`, tenter la suppression par `sourcePath` (si le chemin du media commence par le dossier).

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useMediaStore.ts` | Ajouter logs de diagnostic + fallback par `sourcePath` dans `removeMediaByFolder` |

### Partie 2 : Guide interactif dans le FolderScanner

Ajouter un panneau d'aide (accordeon ou onglet "Guide") dans la boite de dialogue `FolderScanner` qui explique visuellement chaque etape :

**Etapes du guide :**
1. **Scanner** -- Cliquer sur "Parcourir" ou entrer un chemin, puis "Scanner"
2. **Selectionner** -- Choisir les sous-dossiers et types de fichiers a importer
3. **Importer** -- Cliquer sur "Importer la selection" pour lier les fichiers
4. **Voir** -- Les medias apparaissent dans la galerie avec un indicateur "lie"
5. **Supprimer** -- Cliquer sur l'icone engrenage (parametres) dans le header, puis sur la poubelle a cote du dossier pour retirer les medias

Chaque etape aura une icone, un titre court et une description d'une ligne.

On ajoutera aussi un petit bandeau d'aide contextuel dans le header (a cote du popover de gestion des dossiers) avec un tooltip "Comment ca marche ?"

| Fichier | Modification |
|---------|-------------|
| `src/components/FolderScanner.tsx` | Ajouter un accordeon "Guide d'utilisation" en haut du dialog avec les 5 etapes illustrees |
| `src/components/MediaHeader.tsx` | Ajouter un bouton info/aide a cote du popover des dossiers lies, avec un tooltip expliquant le processus |

## Resultat attendu

- En ouvrant la console du navigateur et en cliquant sur la poubelle, on verra exactement pourquoi les medias ne sont pas supprimes
- Le fallback par `sourcePath` couvre le cas ou `sourceFolder` serait corrompu
- L'utilisateur a un guide clair et visuel pour scanner, importer et supprimer des dossiers

