

## Diagnostic : Ajout de logs de debug

Le code semble correct en theorie, mais quelque chose empeche la suppression. Pour identifier le probleme exact, je vais ajouter des `console.log` temporaires a deux endroits cles :

### 1. Dans `removeMediaByFolder` (useMediaStore.ts)

Ajouter des logs pour voir :
- La valeur de `folder` recue
- Le nombre total de medias avant filtrage
- Pour chaque media lie : sa valeur `sourceFolder`, `isLinked`, `sourcePath`
- Le nombre de medias restants apres filtrage

Cela permettra de voir si les criteres de matching fonctionnent ou si une valeur inattendue empeche la correspondance.

### 2. Dans `handleUnlinkFolder` (MediaHeader.tsx)

Ajouter un log pour voir :
- La valeur exacte de `folder` passee au clic
- Le `mediaBefore` et `mediaAfter` pour confirmer si des items ont ete retires

### 3. Securite supplementaire

En plus des logs, je vais ajouter un **critere supplementaire** dans `removeMediaByFolder` : verifier si l'URL du media contient le chemin du dossier encode. Cela couvre le cas ou `sourceFolder` et `sourcePath` seraient tous les deux vides/incorrects mais l'URL pointe bien vers le serveur local.

## Modifications techniques

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useMediaStore.ts` | Ajouter des console.log dans `removeMediaByFolder` pour tracer les valeurs comparees + ajouter critere de matching par URL |
| `src/components/MediaHeader.tsx` | Ajouter des console.log dans `handleUnlinkFolder` pour tracer folder et counts |

Une fois que tu auras teste et que les logs apparaitront dans la console, je pourrai voir exactement pourquoi la suppression echoue et corriger de facon ciblee.
