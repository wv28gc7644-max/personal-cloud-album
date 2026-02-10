

# Ajouter un bouton "Tester les prototypes" dans Design des cartes

## Probleme

La page de demo existe a `/demo-card-editor` mais il n'y a aucun bouton pour y acceder. L'utilisateur doit manuellement taper l'URL, ce qui n'est pas du tout intuitif.

## Solution

Ajouter un bouton bien visible tout en haut du `CardDesignEditor` qui ouvre la page de demo des prototypes. Le bouton utilisera `react-router-dom` pour naviguer vers `/demo-card-editor`.

## Ce qui va changer

Un bouton "Tester les prototypes" avec une icone sera ajoute en haut du composant `CardDesignEditor.tsx`, juste avant les onglets de vues. Il sera visible immediatement quand on ouvre **Parametres > Design des cartes**.

## Detail technique

| Fichier | Modification |
|---------|-------------|
| `src/components/CardDesignEditor.tsx` | Ajouter un import de `useNavigate` depuis `react-router-dom`, puis un bouton en haut du composant (avant les onglets de vue) qui navigue vers `/demo-card-editor` |

Le bouton aura le style `variant="outline"` avec une icone `Layers` et le texte "Tester les prototypes". Il sera place dans un bandeau d'information en haut qui explique brievement : "Testez 6 concepts differents de personnalisation de carte".

