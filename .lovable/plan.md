

# Refonte complete : Card Designer interactif avec drag-and-drop bidirectionnel

## Ce qui ne va pas actuellement

Les 6 prototypes actuels ont tous le meme defaut : la liste d'elements et la preview sont deux mondes separes. On ne peut pas prendre un element du "tiroir" et le deposer directement dans la carte, ni retirer un element de la carte en le faisant glisser dehors.

## Nouvelle experience

### Principe general

L'ecran sera divise en deux zones qui communiquent :

```text
+----------------------------------+-------------------+
|                                  |                   |
|        PREVIEW INTERACTIVE       |   TIROIR          |
|        (zone de drop)            |   D'ELEMENTS      |
|                                  |                   |
|   +-------------------------+    |   [Avatar]        |
|   | Avatar  |  Nom  | Date  |    |   [Nom]           |
|   +-------------------------+    |   [Date]           |
|   |                         |    |   [Media]          |
|   |       Zone Media        |    |   [Titre]          |
|   |                         |    |   [Tag 1]          |
|   +-------------------------+    |   [Tag 2]          |
|   | Titre                   |    |   [Taille]         |
|   +-------------------------+    |   [Voir]           |
|   | Tag1 | Tag2 | Taille    |    |   [J'aime]         |
|   +-------------------------+    |   [Telecharger]    |
|   | Voir | J'aime | DL      |    |   [Partager]       |
|   +-------------------------+    |   [Info]           |
|                                  |   [Badge duree]    |
|                                  |   [Compteur vues]  |
|                                  |                   |
|   [ + Ligne ]  [ + Colonne ]     |   --- Outils ---  |
|   [ + Espacement ]               |   [+ Ligne]       |
|                                  |   [+ Colonne]     |
|                                  |   [+ Espace]      |
+----------------------------------+-------------------+
```

### Interactions

1. **Tiroir vers Preview** : Tu prends un element dans le tiroir a droite, tu le fais glisser dans la preview. Un indicateur bleu te montre ou il va se placer. Tu laches, il apparait dans la carte.

2. **Preview vers dehors** : Tu prends un element dans la preview, tu le fais glisser en dehors de la carte (vers le tiroir ou n'importe ou en dehors). Il disparait de la preview et retourne dans le tiroir comme "disponible".

3. **Dans la preview** : Tu restes appuye sur un element, tu le deplaces vers le haut ou le bas pour changer l'ordre. Un guide visuel montre ou il va atterrir.

4. **Outils de mise en page** :
   - **Ligne** : Insere un conteneur horizontal (les elements dedans s'alignent en ligne)
   - **Colonne** : Insere un conteneur vertical
   - **Espacement** : Insere un espace vide configurable (petit, moyen, grand)

### Elements granulaires (15 items)

Chaque element est independant et draggable individuellement :

| ID | Element | Rendu dans la carte |
|---|---|---|
| avatar | Avatar | Rond avec icone utilisateur |
| username | Nom utilisateur | Texte "Utilisateur" |
| date | Date | Texte "Il y a 2h" |
| media | Zone media | Image placeholder |
| title | Titre | Texte "Photo de vacances" |
| tag-1 | Tag Vacances | Badge "Vacances" |
| tag-2 | Tag Ete | Badge "Ete" |
| filesize | Taille | Texte "2.4 MB" |
| btn-view | Voir | Icone oeil |
| btn-like | J'aime | Icone coeur |
| btn-download | Telecharger | Icone download |
| btn-share | Partager | Icone partager |
| btn-info | Info | Icone info |
| duration | Badge duree | Badge "02:34" |
| viewcount | Compteur vues | Texte "1 247 vues" |

### Ce qui va aussi fonctionner

- Les elements dans le tiroir qui sont deja dans la preview apparaissent grises/transparents
- Quand on survole la preview avec un element, une ligne bleue indique la position d'insertion
- Les outils de layout (ligne, colonne, espace) sont aussi des elements draggables

## Les 6 concepts restent

Les 6 onglets resteront mais chacun utilisera ce nouveau systeme bidirectionnel. La difference entre les concepts sera uniquement le style visuel et la disposition (tiroir a droite, en haut, en popup, etc.) :

1. **Finder** : Tiroir en haut comme une toolbar macOS
2. **Builder** : Tiroir a droite avec lignes de connexion
3. **Stack** : Tiroir en dock flottant en bas
4. **Split** : Tiroir a gauche + inspecteur a droite
5. **Direct** : Pas de tiroir visible, elements apparaissent au survol de la carte
6. **macOS+** : Tiroir en haut fidelite macOS avec drop zone en dessous

## Detail technique

| Fichier | Modification |
|---------|-------------|
| `src/pages/DemoCardEditor.tsx` | Recriture complete : nouveau systeme avec `DndContext` unifie gerant le tiroir ET la preview comme deux containers droppables. Elements granulaires (15 items). Outils de layout (ligne, colonne, espace). Detection de drop hors preview pour desactivation. Les 6 concepts partagent le meme moteur mais avec des styles differents. |

### Architecture du drag-and-drop

Le systeme utilisera un seul `DndContext` englobant le tiroir et la preview. Les deux zones seront des `useDroppable`. La logique :

- `onDragEnd` detecte si l'element est lache dans la preview (activer/positionner) ou hors de la preview (desactiver/retourner au tiroir)
- `onDragOver` affiche l'indicateur de position dans la preview
- Les outils de layout insereront des conteneurs speciaux (`row`, `column`, `spacer`) qui acceptent eux-memes des elements enfants

### Complexite

C'est faisable avec `@dnd-kit` qui est deja installe. La partie la plus complexe est la gestion des conteneurs imbriques (lignes/colonnes contenant des elements) mais `@dnd-kit` supporte nativement les conteneurs via `useDroppable` + detection de collision personnalisee.

