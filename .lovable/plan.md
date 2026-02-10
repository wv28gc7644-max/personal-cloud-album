

## Diagnostic des problemes

### Probleme 1 : Le bouton poubelle ne fonctionne pas dans le dropdown

Le bouton poubelle est place **a l'interieur** du composant `SelectContent` de Radix UI. Or, Radix Select **intercepte tous les clics** dans son contenu pour selectionner un item et **ferme immediatement le dropdown**. Le `e.stopPropagation()` ne suffit pas car Radix utilise des gestionnaires d'evenements internes qui empechent le clic sur le bouton poubelle d'atteindre `handleUnlinkFolder`.

C'est pour ca que le clic semble ne rien faire : le Select se ferme avant que l'action ne s'execute.

### Probleme 2 : Le dropdown ne se met pas a jour apres un import

Apres l'import dans FolderScanner, le dialog se ferme mais le dropdown du filtre dossier ne reflate pas immediatement les nouveaux dossiers car le composant Select peut conserver son etat d'affichage interne.

### Probleme 3 : Pourquoi ca marche via Parametres > Synchronisation

La synchronisation automatique (`useAutoSync`) compare les medias du store avec les fichiers du serveur. Les fichiers lies ont des URLs `localhost`. Quand le sync detecte qu'un fichier n'est plus servi par le serveur (par exemple apres un unlink cote serveur), il le supprime du store. C'est une suppression indirecte qui fonctionne par coincidence.

## Solution : Remplacer le dropdown par un systeme fiable

Au lieu de mettre un bouton poubelle a l'interieur d'un Select (ce qui ne fonctionne pas avec Radix), on va separer clairement les deux actions :

1. **Le Select** reste pour filtrer par dossier (sans bouton poubelle dedans)
2. **Un bouton poubelle** a cote du Select apparait uniquement quand un dossier est selectionne dans le filtre, pour le delier

Et on ajoute aussi un **Popover de gestion des dossiers** accessible via un petit bouton, qui liste tous les dossiers lies avec des boutons de suppression individuels (en dehors du Select).

## Modifications techniques

### 1. `src/components/MediaHeader.tsx`

- **Retirer le bouton Trash2 de l'interieur du `SelectContent`** : les `<div>` avec le bouton poubelle a cote de chaque `<SelectItem>` seront remplaces par de simples `<SelectItem>`
- **Garder le bouton poubelle a cote du Select** (celui qui existe deja quand un filtre est actif) -- il est deja la et fonctionne correctement
- **Ajouter un bouton "Gerer les dossiers"** (icone `Settings2` ou `FolderTree`) qui ouvre un **Popover** listant tous les dossiers lies avec :
  - Le nom court du dossier
  - Le chemin complet en sous-texte
  - Un bouton poubelle individuel pour chaque dossier
  - Ce Popover est en dehors du Select, donc les clics fonctionnent normalement

### 2. Structure du nouveau Popover de gestion

```text
[Icone FolderTree] --> Popover :
  +-------------------------------------+
  | Dossiers lies                        |
  +-------------------------------------+
  | Pictures              [Poubelle]     |
  | C:\Users\jimmy\Pictures              |
  +-------------------------------------+
  | Videos                [Poubelle]     |
  | D:\Media\Videos                      |
  +-------------------------------------+
```

Chaque bouton poubelle dans ce Popover appelle `handleUnlinkFolder(folder)` qui :
- Supprime les medias du store (`removeMediaByFolder`)
- Nettoie l'historique localStorage
- Envoie le DELETE au serveur
- Affiche un toast de confirmation

### 3. Nettoyage du code

- Retirer les `<div>` wrapper autour des `<SelectItem>` dans le dropdown (qui causaient aussi un DOM invalide car `<div>` n'est pas un enfant valide de `<SelectContent>`)
- Le Select redevient un simple filtre propre

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/MediaHeader.tsx` | 1. Retirer les boutons Trash2 de l'interieur du SelectContent |
|                                   | 2. Ajouter un import de `Popover, PopoverContent, PopoverTrigger` |
|                                   | 3. Ajouter un bouton avec Popover de gestion des dossiers a cote du Select |
|                                   | 4. Garder le bouton poubelle existant a cote du Select quand un filtre est actif |

Aucun autre fichier n'a besoin d'etre modifie. Le `removeMediaByFolder` du store fonctionne correctement, le probleme etait uniquement l'interface (clics bloques par Radix Select).

