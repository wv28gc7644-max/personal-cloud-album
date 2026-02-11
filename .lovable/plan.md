

# Optimisation des performances et ouverture de fichiers

## Deux problemes a resoudre

### Probleme 1 : Lenteur et RAM excessive avec beaucoup de fichiers

**Causes identifiees :**
- Les miniatures des fichiers lies pointent vers le fichier original en pleine resolution (une image de 5 Mo est chargee telle quelle pour un apercu de 200px)
- Toutes les cartes sont rendues dans le DOM en meme temps, meme celles hors ecran (2000+ elements DOM)
- Les videos se prelancent immediatement au survol sans delai, declenchant des chargements reseau meme en passant la souris par erreur
- Framer Motion applique des animations d'entree sur chaque carte (2000+ animations simultanees)

### Probleme 2 : Le lien "ouvrir l'emplacement" lance le media au lieu de le localiser

Le code actuel utilise `window.open('file:///...')` qui ouvre le fichier. Il faut un endpoint serveur qui execute la commande OS native pour reveler le fichier dans l'explorateur.

---

## Solution 1 : Miniatures en resolution reduite cote serveur

Ajouter un endpoint `/api/thumbnail` au serveur qui genere et met en cache des miniatures reduites (max 400px de large) via le module `sharp` ou, a defaut, sert le fichier original avec un header de mise en cache aggressive.

**Avantages :**
- Reduction massive de la bande passante (image de 5 Mo remplacee par ~50 Ko)
- Chargement quasi instantane des miniatures
- Cache serveur : la miniature n'est generee qu'une seule fois

**Inconvenients :**
- Necessite d'installer le module `sharp` (optionnel, fallback sur le fichier original)
- Premiere visite legerement plus lente (generation du cache)

## Solution 2 : Virtualisation de la grille (ne rendre que le visible)

Remplacer le rendu de toutes les cartes par une technique de "windowing" : seules les cartes visibles a l'ecran (+ un buffer) sont presentes dans le DOM. En scrollant, les cartes hors ecran sont detruites et les nouvelles sont creees.

**Avantages :**
- DOM reduit de 2000+ elements a ~30-50 elements visibles
- RAM divisee par 10-20x pour les grandes collections
- Scrolling fluide meme avec 10 000+ fichiers

**Inconvenients :**
- Leger travail de re-rendu au scroll (imperceptible avec les optimisations modernes)
- Les animations d'entree de carte seront simplifiees (plus d'animation par carte individuelle)

## Solution 3 : Delai sur le survol video (anti-declenchement accidentel)

Ajouter un delai de 500ms avant de lancer la video au survol. Si la souris quitte la carte avant ce delai, rien ne se passe.

**Avantages :**
- Elimine les chargements video accidentels en deplacant la souris
- Reduit drastiquement les requetes reseau inutiles
- Zero impact sur l'experience : 500ms est naturel et imperceptible quand on veut vraiment regarder

**Inconvenients :**
- Quasi aucun : le delai de 500ms est a peine perceptible pour un survol intentionnel

## Solution 4 : Endpoint serveur "Reveler dans l'explorateur"

Ajouter un endpoint `/api/reveal-in-explorer` au serveur qui execute la commande OS native :
- Windows : `explorer /select,"C:\chemin\vers\fichier.mp4"`
- macOS : `open -R "/chemin/vers/fichier"`
- Linux : `xdg-open` sur le dossier parent

Le bouton dans la fenetre d'informations appellera cet endpoint au lieu de `window.open('file:///')`.

**Avantages :**
- Ouvre l'explorateur Windows/Finder au bon emplacement avec le fichier pre-selectionne
- Fonctionne sur tous les OS

**Inconvenients :**
- Necessite que le serveur local soit lance (ce qui est deja le cas pour les fichiers lies)

---

## Plan d'implementation combine (les 4 solutions ensemble)

### Recommandation : Appliquer les 4 solutions

Elles sont complementaires et s'attaquent chacune a un aspect different du probleme. Ensemble, elles resolvent la lenteur a plus de 80%.

## Details techniques

| Fichier | Modification |
|---------|-------------|
| `server.cjs` | Ajouter endpoint `GET /api/thumbnail/:encodedPath` qui sert une version reduite (400px max) avec cache disque. Ajouter endpoint `POST /api/reveal-in-explorer` qui execute `explorer /select` / `open -R` |
| `src/components/MediaCardTwitter.tsx` | Ajouter un `setTimeout` de 500ms sur `handleMouseEnter` pour les videos, annule si la souris quitte avant. Changer `preload="metadata"` en `preload="none"` |
| `src/components/MediaGrid.tsx` | Implementer la virtualisation avec `IntersectionObserver` : ne rendre que les cartes visibles + buffer. Supprimer les animations Framer Motion individuelles (garder une animation globale legere) |
| `src/components/MediaInfoDialog.tsx` | Remplacer `window.open('file:///')` par un appel fetch a `/api/reveal-in-explorer` |
| `src/components/FolderScanner.tsx` | Lors du scan, construire les `thumbnailUrl` vers le nouvel endpoint `/api/thumbnail/` au lieu du fichier original |

