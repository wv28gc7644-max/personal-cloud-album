

## Mise a jour silencieuse avec page de maintenance

### Ce qui sera fait

Quand tu cliques sur "Mettre a jour" depuis la notification ou le panneau admin, la mise a jour se lancera **sans ouvrir de terminal** (mode silencieux). Pendant ce temps, **tous les utilisateurs connectes** verront une page de maintenance professionnelle avec le logo MediaVault, une barre de progression et les etapes en temps reel. Une fois terminee, la page se deverrouille automatiquement.

### Comment ca marche

1. Le serveur lance le script de mise a jour en mode **cache** (PowerShell avec `-WindowStyle Hidden`)
2. Le serveur passe en "mode maintenance" et sert la page `maintenance.html` a toutes les requetes
3. Le serveur expose un endpoint `/api/update/status` qui retourne la progression en temps reel
4. La page de maintenance interroge ce endpoint toutes les 2 secondes pour afficher la progression
5. Quand la mise a jour est terminee et le serveur redemarre, la page se recharge automatiquement

### Modifications techniques

| Fichier | Modification |
|---------|-------------|
| **server.cjs** | 1. Ajouter une variable `isUpdating = false` et `updateProgress = { step, percent, status }` |
|                 | 2. Modifier `/api/update` POST pour lancer le script en mode silencieux via `powershell -WindowStyle Hidden` au lieu de `start cmd /c` |
|                 | 3. Ajouter un endpoint `GET /api/update/status` qui retourne `updateProgress` |
|                 | 4. Ajouter un middleware en haut du handler HTTP : si `isUpdating === true` et que la requete n'est pas `/api/update/status`, servir `maintenance.html` |
|                 | 5. Le script de mise a jour ecrit dans un fichier `update-progress.json` que le serveur lit pour suivre la progression reelle |
| **public/maintenance.html** | 1. Remplacer la simulation de progression par un polling reel vers `/api/update/status` |
|                              | 2. Ameliorer le design avec le logo MediaVault, les etapes reelles (sauvegarde, telechargement, installation, reconstruction, finalisation) |
|                              | 3. Ajouter un rechargement automatique quand le statut passe a "complete" |
| **src/components/AdminPanel.tsx** | Modifier `triggerUpdateScript` pour passer `{ silent: true }` dans le body du POST `/api/update` |
| **src/components/NotificationCenter.tsx** | Idem, passer `{ silent: true }` |
| **src/components/InAppUpdate.tsx** | Idem, passer `{ silent: true }` dans le body |

### Detail du flux

**Cote serveur (server.cjs)** :

```text
Requete POST /api/update { silent: true }
  |
  +-> isUpdating = true
  +-> Ecrire update-progress.json { step: 0, percent: 0, status: "Demarrage..." }
  +-> Lancer le .bat via PowerShell en mode cache :
      powershell -WindowStyle Hidden -Command "& 'Mettre a jour MediaVault.bat'"
  +-> Le .bat ecrit dans update-progress.json a chaque etape
  +-> Reponse 200 { success: true }

Middleware (toutes les requetes) :
  Si isUpdating ET pas /api/update/status ET pas /maintenance.html assets
    -> Servir maintenance.html

GET /api/update/status
  -> Lire update-progress.json
  -> Retourner { updating: true, step: 2, percent: 45, status: "Installation...", complete: false }
```

**Cote client (maintenance.html)** :

```text
Page chargee
  |
  +-> Polling /api/update/status toutes les 2s
  +-> Mise a jour barre de progression + etape active
  +-> Si complete === true : afficher "Mise a jour terminee !" + reload apres 3s
  +-> Si le serveur ne repond plus (redemarrage) : tenter de recharger toutes les 3s
```

### Gestion du fichier de progression

Le script `.bat` de mise a jour ecrira dans `C:\MediaVault\update-progress.json` a chaque etape :

- Etape 0 : `{ "step": 0, "percent": 5, "status": "Sauvegarde des donnees..." }`
- Etape 1 : `{ "step": 1, "percent": 25, "status": "Telechargement en cours..." }`
- Etape 2 : `{ "step": 2, "percent": 50, "status": "Installation des dependances..." }`
- Etape 3 : `{ "step": 3, "percent": 80, "status": "Reconstruction de l'application..." }`
- Etape 4 : `{ "step": 4, "percent": 95, "status": "Finalisation..." }`
- Fin : `{ "step": 5, "percent": 100, "status": "complete", "complete": true }`

Le serveur lit ce fichier pour `/api/update/status` et remet `isUpdating = false` quand `complete === true`.

### Ce que les utilisateurs verront

Pendant la mise a jour, toute personne accedant au site verra la page de maintenance avec :
- Le logo MediaVault anime
- Le titre "Mise a jour en cours"
- Une barre de progression reelle
- Les 5 etapes avec indicateurs (en attente / en cours / termine)
- Le temps estime restant
- Un rechargement automatique une fois termine
