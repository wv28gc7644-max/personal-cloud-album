

# Page de demo interactive : 6 concepts de Card Designer

## Objectif

Creer une page temporaire `/demo-card-editor` avec les 6 concepts presentes precedemment, chacun fonctionnel et interactif. Tu pourras naviguer entre les 6 avec des onglets numerotes, tester le drag-and-drop, et me dire lequel tu preferes.

## Ce que tu verras

- **6 onglets** en haut : "1 - Finder", "2 - Builder", "3 - Stack", "4 - Split", "5 - Direct", "6 - macOS+"
- Chaque onglet montre un prototype fonctionnel du concept avec :
  - De vrais elements draggables (Titre, Media, Actions, Metadonnees, Badge, Info)
  - Une zone de preview de carte qui reagit au drag-and-drop
  - Le look and feel propre a chaque concept
- Un bouton "Je choisis celui-ci" sur chaque onglet

## Details techniques

### Fichier a creer

| Fichier | Description |
|---------|-------------|
| `src/pages/DemoCardEditor.tsx` | Page complete avec les 6 concepts en onglets, chacun avec du drag-and-drop fonctionnel via `@dnd-kit` |

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/App.tsx` | Ajouter la route `/demo-card-editor` pointant vers `DemoCardEditor` |

### Contenu de chaque onglet

**Concept 1 - Finder Style** : Palette d'elements en haut (icones + labels draggables), zone de drop en bas representant la carte, ligne de separateur "jeu par defaut"

**Concept 2 - Builder Canvas** : Preview de carte interactive a gauche, catalogue d'elements a droite avec toggles, lignes de connexion visuelles

**Concept 3 - Stack Constructor** : Carte verticale avec elements empiles, chaque element a une poignee de drag et un bouton supprimer, dock d'elements inutilises en bas

**Concept 4 - Split Panels** : 3 colonnes (liste elements | preview centrale | inspecteur de proprietes a droite)

**Concept 5 - Direct Interactive** : La carte elle-meme est l'editeur, chaque element a un handle au survol et un engrenage pour les reglages locaux

**Concept 6 - macOS Toolbar + Live** : Palette d'elements en haut fidelite au screenshot macOS, preview en bas, bouton "Avance" pour le fine-tuning

### Comportement commun aux 6 concepts

- Les elements disponibles : En-tete, Zone media, Titre, Metadonnees, Actions, Badge duree, Compteur vues, Bouton Info
- Drag-and-drop fonctionnel avec `@dnd-kit` (deja installe)
- Preview de carte qui se met a jour en temps reel
- Donnees fictives pour la preview (image placeholder, titre "Photo de vacances", tags, etc.)

### Acces

Une fois deploye, tu pourras y acceder en ajoutant `/demo-card-editor` a l'URL dans la barre d'adresse du navigateur. La page sera independante du reste de l'app -- c'est juste une zone de test.

Une fois ton choix fait, je supprimerai cette page et j'implementerai le concept choisi dans le vrai `CardDesignEditor`.

