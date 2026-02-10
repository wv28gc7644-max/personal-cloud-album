

# Simplifier et fiabiliser la gestion des dossiers lies

## Constat

Actuellement, le bouton poubelle pour supprimer un dossier lie est cache dans deux endroits peu visibles :
- Derriere un menu deroulant (il faut d'abord selectionner un dossier)
- Derriere une icone engrenage minuscule

En plus, quand on clique sur la poubelle, la suppression ne fonctionne pas (le bug principal).

## Ce qui va changer

### 1. Rendre le bouton de suppression visible et accessible

Remplacer le systeme actuel (engrenage + popover) par un panneau de gestion des dossiers integre directement dans la boite de dialogue "Lier un dossier" (FolderScanner). Quand on ouvre le FolderScanner, on verra :
- En haut : la liste des dossiers deja lies, chacun avec un gros bouton poubelle rouge bien visible
- En dessous : le formulaire pour scanner un nouveau dossier

Cela signifie qu'un seul endroit gere tout : le bouton "Lier un dossier" dans le header.

### 2. Ajouter un guide etape par etape

Dans cette meme boite de dialogue, un accordeon "Guide d'utilisation" expliquera les 5 etapes :
1. Scanner -- Entrer un chemin ou parcourir, puis cliquer Scanner
2. Selectionner -- Choisir les fichiers a importer
3. Importer -- Cliquer sur Importer la selection
4. Voir -- Les medias apparaissent dans la galerie avec un indicateur de lien
5. Supprimer -- Cliquer sur la poubelle rouge a cote du dossier dans cette meme fenetre

### 3. Fiabiliser la suppression avec diagnostic

Garder les logs de diagnostic dans la console (F12) pour pouvoir comprendre pourquoi la suppression echoue, avec les fallbacks par `sourcePath` et `url`.

## Modifications par fichier

| Fichier | Ce qui change |
|---------|--------------|
| `src/components/FolderScanner.tsx` | Ajouter en haut du dialog : (1) la liste des dossiers lies avec bouton poubelle, (2) le guide en accordeon |
| `src/components/MediaHeader.tsx` | Simplifier la zone des dossiers : retirer le popover engrenage (devenu inutile car tout est dans FolderScanner), garder le filtre dropdown et le bouton aide |

## Resultat attendu

- Un seul endroit pour tout gerer : le bouton "Lier un dossier" ouvre une fenetre avec la liste des dossiers (et leur poubelle) + le scanner + le guide
- Le bouton poubelle est gros et visible, pas cache derriere un engrenage
- Les logs console permettent de diagnostiquer le bug de suppression

