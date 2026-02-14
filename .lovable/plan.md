

# Corrections completes : Explorer, Sharp, Cache, Miniatures unifiees et Diagnostic

## Problemes identifies et solutions

### 1. "Reveler dans l'explorateur" -- script PowerShell OEM intercepte la commande

**Probleme** : Sur ta machine, un script `C:\Windows\OEM\Explorer.ps1` intercepte la commande `explorer`. Le `server.cjs` actuel utilise `exec('explorer /select,"...')` sans chemin absolu, donc Windows execute le script PowerShell au lieu de `explorer.exe`.

**Solution** : Utiliser le chemin absolu `C:\\Windows\\explorer.exe` dans `server.cjs` (le fichier que tu telecharges depuis les parametres).

| Fichier | Modification |
|---------|-------------|
| `server.cjs` ligne 415 | `exec('C:\\Windows\\explorer.exe /select,"' + winPath + '"', ...)` |
| `src/assets/serverTemplate.ts` ligne 582 | Meme correction (template de secours) |

---

### 2. Sharp, Cache, boutons inactifs -- probleme de synchronisation serveur

**Probleme** : Le fichier `server.cjs` dans le projet contient deja les endpoints `/api/check-sharp`, `/api/install-sharp`, `/api/cache-stats` et `DELETE /api/cache`. Mais quand tu telecharges via le bouton dans "Mises a jour", c'est bien CE fichier qui est telecharge (`import('../../../server.cjs?raw')`). Donc si tu as bien remplace et redemarre, ces endpoints devraient fonctionner.

**Solution pour debugger** : Ajouter un **bouton de diagnostic** dans `ServerSettings.tsx` qui :
- Appelle `/api/health`, `/api/check-sharp`, `/api/cache-stats` en sequence
- Affiche les resultats detailles (reponse HTTP, erreur, contenu) directement dans l'interface
- Permet de copier le rapport pour me l'envoyer

Cela permettra de comprendre exactement pourquoi ca ne repond pas (serveur pas demarre, mauvais port, vieux fichier, etc.)

| Fichier | Modification |
|---------|-------------|
| `src/components/settings/ServerSettings.tsx` | Ajouter un bouton "Diagnostic" qui teste chaque endpoint et affiche les resultats |

---

### 3. Miniatures videos non unifiees sur toutes les grilles

**Probleme** : Seul `MediaCardTwitter.tsx` utilise les reglages de previsualisation video (`getVideoPreviewSettings`). Les autres composants (`MediaCardMinimal`, `MediaCardAdaptive`, `MediaCardMulti`) ont `preload="metadata"` (charge des donnees video inutilement) et ne respectent pas le delai de survol ni la duree de previsualisation.

**Corrections par fichier** :

| Fichier | Modifications |
|---------|--------------|
| `src/components/MediaCardMinimal.tsx` | Changer `preload="metadata"` en `preload="none"`. Importer `getVideoPreviewSettings`. Ajouter des refs `hoverTimerRef`/`previewTimerRef`. Modifier `handleMouseEnter`/`handleMouseLeave` pour appliquer le delai et la duree configures (meme logique que `MediaCardTwitter.tsx`). |
| `src/components/MediaCardAdaptive.tsx` | Changer `preload="metadata"` en `preload="none"`. Supprimer le `document.createElement('video')` (lignes 42-49) qui charge la video entiere juste pour obtenir le ratio -- utiliser `16/9` par defaut pour les videos. Ajouter la logique de survol avec delai/duree comme `MediaCardTwitter.tsx`. |
| `src/components/MediaCardMulti.tsx` | Ajouter `preload="none"` sur les deux elements `<video>` (lignes 77 et 170). |
| `src/components/MediaInfoDialog.tsx` | Changer `preload="metadata"` en `preload="none"` (ligne 148). |

---

### 4. Bouton de diagnostic serveur (nouveau)

Un nouveau bouton "Tester les endpoints" dans la carte "Connexion au serveur local" qui :
1. Appelle `/api/health` et affiche le resultat
2. Appelle `/api/check-sharp` et affiche si sharp est detecte
3. Appelle `/api/cache-stats` et affiche les stats du cache
4. En cas d'erreur, affiche le message exact pour que tu puisses me le copier-coller

Le resultat s'affiche dans un bloc de texte dans l'interface, pas besoin d'ouvrir le terminal.

| Fichier | Modification |
|---------|-------------|
| `src/components/settings/ServerSettings.tsx` | Ajouter un bouton "Diagnostic complet" et un bloc d'affichage des resultats |

---

## Resume de tous les fichiers modifies

| Fichier | Actions |
|---------|---------|
| `server.cjs` | Chemin absolu `C:\Windows\explorer.exe` pour reveal |
| `src/assets/serverTemplate.ts` | Meme correction reveal |
| `src/components/settings/ServerSettings.tsx` | Ajouter bouton diagnostic avec affichage resultats |
| `src/components/MediaCardMinimal.tsx` | `preload="none"`, delai/duree de survol unifies |
| `src/components/MediaCardAdaptive.tsx` | `preload="none"`, supprimer chargement video pour ratio, ajouter hover avec delai |
| `src/components/MediaCardMulti.tsx` | Ajouter `preload="none"` sur les 2 video |
| `src/components/MediaInfoDialog.tsx` | `preload="none"` |

