

# Corrections : Cache fonctionnel, auto-connexion et curseurs de prechargement

## Problemes identifies

### 1. "Total: 0 fichiers" lors de la pre-generation
Le endpoint `/api/generate-thumbnails` ne scanne que `MEDIA_FOLDER` (`C:\Users\jimmy\Pictures`). Or les medias de l'utilisateur sont dans des **dossiers lies** (linked folders) stockes dans `data.json`. Ces dossiers ne sont pas du tout parcourus par la pre-generation, d'ou le resultat "total: 0".

**Meme probleme** dans `/api/cache-diagnostic` : il ne compte que les fichiers de `MEDIA_FOLDER`, pas les dossiers lies.

### 2. Pas d'auto-connexion
L'utilisateur doit cliquer manuellement "Tester la connexion" pour debloquer les boutons Sharp et Cache. Il n'y a aucun `useEffect` d'auto-connexion au montage du composant.

### 3. Pas de curseurs de prechargement avance
La carte "Previsualisation video" ne contient que le delai de survol et la duree de previsualisation. Il manque les 3 curseurs demandes.

---

## Corrections prevues

### 1. Pre-generation qui inclut les dossiers lies (server.cjs + serverTemplate.ts)

Modifier `/api/generate-thumbnails` pour :
1. Scanner `MEDIA_FOLDER` (comme avant)
2. Lire `data.json` pour obtenir la liste des `linkedFolders`
3. Scanner chaque dossier lie egalement
4. Generer les miniatures pour TOUS les fichiers trouves

Meme correction pour `/api/cache-diagnostic` : compter les medias de TOUS les dossiers (pas seulement MEDIA_FOLDER).

### 2. Auto-connexion au montage (ServerSettings.tsx)

Ajouter un `useEffect` qui appelle `testConnection({ silent: true })` des le montage du composant. Plus besoin de cliquer manuellement.

### 3. Trois curseurs de prechargement avance (ServerSettings.tsx)

Ajouter dans la carte "Previsualisation video" une nouvelle section avec :

| Curseur | Fonction | Plage |
|---------|----------|-------|
| **Medias precharges** | Nombre total de medias dont la miniature est chargee en avance | 0 a "Tous" (illimite) avec champ de saisie libre |
| **Lignes pre-scroll** | Nombre de lignes preparees sous l'ecran visible | 0 a "Toutes" (illimite) avec champ de saisie libre |
| **Tampon video (secondes)** | Duree de video prebufferisee en avance | 0s a "Illimite" avec graduations secondes/minutes/heures |

Valeur `-1` = illimite pour chaque curseur. Les valeurs sont stockees dans localStorage via `VideoPreviewSettings`.

---

## Details techniques

### Fichiers modifies

| Fichier | Modifications |
|---------|--------------|
| `server.cjs` | `/api/generate-thumbnails` : scanner aussi les linkedFolders de data.json. `/api/cache-diagnostic` : compter aussi les medias des linkedFolders. |
| `src/assets/serverTemplate.ts` | Memes corrections que server.cjs |
| `src/components/settings/ServerSettings.tsx` | Ajouter `useEffect` auto-connexion. Ajouter 3 curseurs de prechargement dans la carte "Previsualisation video". Etendre `VideoPreviewSettings` avec `preloadMediaCount`, `preloadScrollRows`, `preloadBufferSeconds`. |

### Correction du scan dans generate-thumbnails

```text
POST /api/generate-thumbnails
  1. Collecter fichiers de MEDIA_FOLDER (existant)
  2. NOUVEAU: Lire data.json → linkedFolders
  3. Pour chaque linkedFolder, scanner recursivement
  4. Fusionner toutes les listes (dedupliquer par chemin absolu)
  5. Generer les miniatures manquantes
  6. Retourner { total, generated, skipped, errors, mediaFolder, linkedFoldersScanned }
```

### Chemin d'acces pour l'utilisateur

Tout se trouve dans **Parametres → Serveur local** :
- **Auto-connexion** : automatique au chargement de la page, plus besoin de cliquer
- **Installer Sharp** : carte "Dependances serveur" → bouton visible des la connexion
- **Pre-generer les miniatures** : carte "Cache des miniatures" → bouton "Pre-generer toutes les miniatures" (scannera maintenant TOUS vos dossiers)
- **Diagnostiquer le cache** : carte "Cache des miniatures" → bouton "Diagnostiquer le cache"
- **Curseurs de prechargement** : carte "Previsualisation video" → section "Prechargement avance" (3 curseurs + champs de saisie)

