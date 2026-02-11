
# Optimiser la fenetre d'informations media

## Problemes actuels

1. **Scroll horizontal/vertical inutile** : Le contenu deborde, forçant des scrolls qui rendent la navigation penible
2. **Pas responsive mobile** : La fenetre ne s'adapte pas correctement aux petits ecrans
3. **Chemin non cliquable** : Le chemin du fichier est juste du texte, impossible d'ouvrir le dossier directement

## Solution

### 1. Fenetre adaptative sans scroll

- Passer la fenetre en `sm:max-w-4xl` (896px) sur desktop pour afficher plus de contenu
- Sur mobile : plein ecran avec `max-w-[100vw] h-[100dvh]` pour utiliser tout l'espace disponible
- Reduire la hauteur max de la preview media a `max-h-[35vh]` sur mobile et `max-h-[40vh]` sur desktop pour laisser de la place aux infos en dessous
- Supprimer `overflow-y-auto` au profit d'un layout flex qui repartit l'espace naturellement entre preview et infos
- Utiliser `overflow-y-auto` uniquement sur la zone des metadonnees si vraiment necessaire, pas sur toute la fenetre

### 2. Layout deux colonnes sur desktop

Sur ecran large, afficher la preview a gauche et les infos a droite cote a cote pour eviter le scroll vertical :

```text
Desktop (>640px):
+---------------------------+-------------------+
|                           |  Nom: photo.jpg   |
|    Preview adaptative     |  Type: Photo      |
|    (occupe la hauteur)    |  Taille: 2.4 MB   |
|                           |  Date: 12 fev     |
|                           |  Chemin: /usr/...  |
|                           |  Tags: [Vac] [Ete]|
+---------------------------+-------------------+

Mobile:
+---------------------------+
|    Preview (35vh max)     |
+---------------------------+
|  Nom: photo.jpg           |
|  Type: Photo              |
|  Taille: 2.4 MB           |
|  Tags: [Vac] [Ete]        |
+---------------------------+
```

### 3. Chemin cliquable pour ouvrir le gestionnaire de fichiers

Pour la ligne "Chemin", transformer le texte en lien cliquable :
- Utiliser le protocole `file:///` pour construire l'URL du dossier parent
- Le clic ouvrira le gestionnaire de fichiers du systeme (Finder sur macOS, Explorateur sur Windows)
- Garder aussi le bouton Copier a cote
- Ajouter une icone `ExternalLink` pour indiquer que c'est cliquable

Note : le protocole `file:///` fonctionne quand l'app tourne en local. En mode web pur, le navigateur peut bloquer l'ouverture, donc on affichera un toast d'erreur dans ce cas.

## Detail technique

| Fichier | Modification |
|---------|-------------|
| `src/components/MediaInfoDialog.tsx` | Refonte du layout : deux colonnes sur desktop, empile sur mobile. Preview adaptative. InfoRow pour "Chemin" transforme en lien cliquable avec `file:///`. Ajout d'une fonction `openInFileManager` qui extrait le dossier parent du chemin et ouvre via `window.open('file:///...')`. Responsive complet avec classes Tailwind conditionnelles. |
