

# Optimisation serveur, cache, et parametres de previsualisation video

## Problemes identifies

1. **Sharp non installe** : Le serveur tombe en fallback (sert le fichier original) car `sharp` n'est pas installe. Aucun guide dans l'interface pour l'installer.
2. **"Reveler dans l'explorateur" ne fonctionne pas** : La commande `exec` sur Windows a un probleme de formatage du chemin avec les guillemets et les backslashes. Le serveur repond `success: true` mais `exec` echoue silencieusement.
3. **Videos prechargees inutilement** : `preload="metadata"` charge encore des donnees. Les videos se lancent instantanement au survol sans delai, causant des chargements accidentels.
4. **Serveur sature** : Trop de requetes simultanees (miniatures + fichiers) causent un crash du serveur Node.js. Pas de limite de connexions.
5. **Miniatures perdues au rafraichissement** : Le cache serveur existe (`.thumbnail-cache/`) mais le navigateur ne le conserve pas toujours. Pas de visibilite sur le cache.
6. **Pas de controle utilisateur** : Aucun reglage pour le delai de survol, la duree de previsualisation, ou la gestion du cache.

## Plan d'implementation

### 1. Corriger "Reveler dans l'explorateur" (server.cjs)

Le probleme vient du formatage Windows. La commande `explorer /select,"path"` necessite que le chemin utilise des backslashes et soit entre guillemets correctement. On va aussi capturer les erreurs de `exec` au lieu de les ignorer.

| Fichier | Modification |
|---------|-------------|
| `server.cjs` | Corriger le formatage du chemin pour Windows : remplacer les `/` par `\`, utiliser `spawn` au lieu de `exec` pour eviter les problemes de guillemets. Ajouter un callback d'erreur sur `exec` pour loguer les echecs. |

### 2. Section "Serveur et optimisation" dans les parametres (ServerSettings.tsx)

Ajouter des cartes dans la page "Serveur local" pour :

**Carte "Dependances serveur"** :
- Verifier si `sharp` est installe via un nouvel endpoint `/api/check-sharp`
- Afficher l'etat (installe / non installe) avec un bouton "Installer" qui lance `npm install sharp` via un endpoint `/api/install-sharp`
- Expliquer a quoi sert sharp (miniatures reduites = chargement plus rapide)

**Carte "Cache des miniatures"** :
- Afficher la taille du cache via un endpoint `/api/cache-stats` (nombre de fichiers, taille totale)
- Bouton "Vider le cache" via `DELETE /api/cache`
- Explication : "Les miniatures sont generees une seule fois puis stockees sur le serveur pour accelerer le chargement"

| Fichier | Modification |
|---------|-------------|
| `server.cjs` | Ajouter `GET /api/check-sharp` (teste `require('sharp')`), `POST /api/install-sharp` (lance `npm install sharp` dans `__dirname`), `GET /api/cache-stats` (compte les fichiers dans `.thumbnail-cache`), `DELETE /api/cache` (vide `.thumbnail-cache`) |
| `src/components/settings/ServerSettings.tsx` | Ajouter les cartes "Dependances" et "Cache" avec etats et boutons |

### 3. Parametres de previsualisation video (ServerSettings.tsx)

Ajouter une carte "Previsualisation video" avec :

**Delai de survol** :
- Switch activer/desactiver
- Slider de 0 a 5000ms : de 0 a 1000ms par pas de 1ms (precision fine), de 1000 a 5000ms par pas de 500ms
- Champ de saisie pour entrer une valeur precise en millisecondes
- Explication : "Temps d'attente avant de lancer la video quand vous survolez une miniature. Evite les chargements accidentels."

**Previsualisation video** :
- Switch activer/desactiver
- Slider de 0 a 30 secondes par pas de 1s
- Explication : "Si active, seules les X premieres secondes de la video sont chargees au survol. Si desactive, la video ne joue qu'au clic."
- Quand desactive : la video ne se lance pas du tout au survol, uniquement au clic pour l'ouvrir en grand

Ces reglages sont sauvegardes en localStorage et lus par `MediaCardTwitter`.

| Fichier | Modification |
|---------|-------------|
| `src/components/settings/ServerSettings.tsx` | Ajouter la carte "Previsualisation video" avec les deux reglages (delai + duree) |
| `src/components/MediaCardTwitter.tsx` | Lire les reglages depuis localStorage. Appliquer le delai (`setTimeout`) sur `handleMouseEnter`. Changer `preload="metadata"` en `preload="none"`. Si previsualisation desactivee, ne pas lancer la video au survol. Si duree limitee, arreter la video apres X secondes. |

### 4. Protection contre la saturation du serveur (server.cjs)

- Ajouter un compteur de requetes actives pour les miniatures
- Limiter a 10 requetes de miniatures simultanees (les suivantes attendent)
- Ajouter un timeout de 30s sur les requetes de miniatures
- Loguer les depassements pour diagnostiquer

| Fichier | Modification |
|---------|-------------|
| `server.cjs` | Ajouter un semaphore simple (compteur) sur l'endpoint `/api/thumbnail/` pour limiter la concurrence |

### 5. Video preload="none" (MediaCardTwitter.tsx)

Changer `preload="metadata"` en `preload="none"` pour empecher tout prechargement des videos. La miniature serveur (image JPG) sera affichee a la place. La video ne se charge que lorsque le survol est intentionnel (apres le delai configure).

| Fichier | Modification |
|---------|-------------|
| `src/components/MediaCardTwitter.tsx` | `preload="none"` au lieu de `preload="metadata"` |

---

## Resume des fichiers modifies

| Fichier | Actions |
|---------|---------|
| `server.cjs` | Corriger reveal-in-explorer, ajouter check-sharp, install-sharp, cache-stats, delete cache, semaphore miniatures |
| `src/components/settings/ServerSettings.tsx` | Ajouter cartes : Dependances, Cache miniatures, Previsualisation video |
| `src/components/MediaCardTwitter.tsx` | Lire reglages localStorage, appliquer delai survol, preload="none", duree limitee |

