

## Probleme identifie

La page de maintenance tourne dans le vide parce que les scripts `.bat` de mise a jour **n'ecrivent jamais dans le fichier `update-progress.json`**. Voici ce qui se passe :

1. L'interface envoie `POST /api/update` au serveur
2. Le serveur ecrit `update-progress.json` avec `{step: 0, percent: 0, complete: false}` et met `isUpdating = true`
3. Le serveur lance le `.bat` en arriere-plan
4. Le `.bat` fait son travail (git pull, npm install, npm build) **sans jamais mettre a jour `update-progress.json`**
5. Le `.bat` reconstruit `dist/` et redEmarre le serveur -- mais le fichier `update-progress.json` reste bloque a `complete: false`
6. Le serveur redemarre, relit `update-progress.json`, voit `complete: false`, et affiche la page de maintenance a tout le monde
7. La page de maintenance poll `/api/update/status` qui retourne toujours `complete: false` -- boucle infinie

## Solution en 3 parties

### Partie 1 : Les scripts `.bat` ecrivent la progression dans `update-progress.json`

Modifier la generation des deux scripts bat (normal et silencieux) dans `UpdatesSettings.tsx` pour ajouter des ecritures `update-progress.json` a chaque etape :

- Etape 0 (sauvegarde) : `{step: 0, percent: 10, status: "Sauvegarde...", complete: false}`
- Etape 1 (git/zip) : `{step: 1, percent: 30, status: "Telechargement...", complete: false}`
- Etape 2 (npm install) : `{step: 2, percent: 50, status: "Installation...", complete: false}`
- Etape 3 (npm build) : `{step: 3, percent: 70, status: "Reconstruction...", complete: false}`
- Etape 4 (restauration) : `{step: 4, percent: 90, status: "Finalisation...", complete: false}`
- Fin : `{step: 5, percent: 100, status: "Termine", complete: true}`

L'ecriture se fait via une commande PowerShell inline dans le bat :
```text
powershell -NoProfile -Command "'{\"step\":1,\"percent\":30,\"status\":\"Telechargement...\",\"complete\":false}' | Set-Content '%MV_ROOT%update-progress.json'"
```

### Partie 2 : Nettoyage automatique dans le serveur

Modifier `server.cjs` (dans le template `serverTemplate.ts` ou directement) pour :
- Au demarrage du serveur, verifier si `update-progress.json` existe avec `complete: true` -- si oui, supprimer le fichier et mettre `isUpdating = false`
- Ajouter un timeout de securite : si `isUpdating` est vrai depuis plus de 10 minutes, forcer `isUpdating = false` (protection contre les blocages)

### Partie 3 : Option pour activer/desactiver la page de maintenance

Ajouter dans `UpdatesSettings.tsx` une checkbox "Afficher la page de maintenance pendant les mises a jour". Cette preference est stockee en localStorage (`mediavault-show-maintenance-page`) et transmise au serveur via le body de `POST /api/update` comme `showMaintenance: true/false`.

Dans le serveur, si `showMaintenance` est `false`, `isUpdating` n'est pas mis a `true` et les utilisateurs continuent de voir l'app normalement (la mise a jour se fait en fond, l'app sera simplement indisponible pendant le redemarrage).

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/settings/UpdatesSettings.tsx` | 1. Ajouter des lignes `powershell Set-Content update-progress.json` dans les deux scripts bat (normal + silencieux) a chaque etape |
|                                                 | 2. Ajouter une checkbox "Afficher la page de maintenance" avec stockage localStorage |
|                                                 | 3. Passer `showMaintenance` dans le body de `POST /api/update` |
| `src/components/UpdateProgressModal.tsx` | Passer `showMaintenance` dans l'appel `onStartUpdate` |
| `src/assets/serverTemplate.ts` | Ajouter logique de nettoyage au demarrage + timeout de securite + respect du flag `showMaintenance` |

## Resultat attendu

- La page de maintenance affiche une progression reelle (10%, 30%, 50%, etc.)
- Quand la mise a jour est terminee, la page se recharge automatiquement
- L'utilisateur peut choisir de ne pas afficher la page de maintenance
- Si quelque chose plante, le serveur se debloque apres 10 minutes au lieu de rester en maintenance eternellement

