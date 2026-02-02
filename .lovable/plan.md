
Objectif (immédiat)
- Retirer proprement toutes les fonctionnalités “IA” du site (UI + navigation + réglages) pour revenir à une app “MediaVault” stable centrée médias.
- Te donner une procédure simple et fiable pour désinstaller toute la partie IA sur ton PC (dossiers + services + Ollama), sans bricolage.
- Ensuite (optionnel), proposer une approche “fonctionnalité par fonctionnalité” plus simple et testable, sans essayer d’installer un “gros bloc” d’un coup.

Important (sur ta demande “IA sans restrictions”)
- Je ne peux pas t’aider à mettre en place une IA “sans restriction” visant à contourner des garde-fous, des lois, ou des politiques de sécurité.  
- En revanche, je peux te proposer une approche plus simple et progressive: installer un seul outil qui marche (ex: chat local) puis ajouter une fonctionnalité à la fois (STT, TTS, image, etc.) avec tests à chaque étape.

--------------------------------------------------------------------------------
A) Désinstallation complète IA sur ton PC (tout supprimer)
Tu as choisi “Tout supprimer”. L’objectif est: arrêter les services, supprimer les dossiers IA, désinstaller Ollama et supprimer ses modèles.

1) Stopper tout ce qui tourne
- Ferme l’application MediaVault (le navigateur peut rester ouvert).
- Dans le Gestionnaire des tâches (Ctrl+Shift+Esc):
  - Termine les processus “python.exe” liés aux serveurs IA si tu en vois.
  - Termine “ollama.exe” si présent.

2) Lancer la désinstallation “one-click” (recommandé)
- Utilise le script déjà fourni par le projet:
  - public/scripts/uninstall-ai-suite.bat
  - (il appelle uninstall-ai-suite.ps1 et demande les droits admin)
- Choisis “N” quand il te demande “Conserver les modèles Ollama ?” (tu veux tout supprimer).
- Le script:
  - arrête les services,
  - supprime les dossiers IA,
  - désinstalle Ollama via winget si possible,
  - supprime ~/.ollama si tu n’as pas gardé les modèles,
  - supprime les raccourcis et fichiers de config.

3) Vérifier que tout est réellement parti
- Vérifie que le dossier %USERPROFILE%\MediaVault-AI n’existe plus (ou est vide).
- Vérifie que %USERPROFILE%\.ollama n’existe plus (si tu as choisi de supprimer les modèles).
- Vérifie qu’Ollama n’apparaît plus dans “Applications installées”.

4) Si tu as testé Docker (si applicable)
- Dans le dossier où est docker-compose.yml:
  - docker-compose down -v
- Puis supprime les volumes si besoin (selon ton usage).
(Je le mets en “si applicable” car tu n’es pas obligé d’avoir Docker.)

Résultat attendu
- Plus aucun service IA (ComfyUI/Whisper/XTTS/MusicGen/Demucs/CLIP/ESRGAN) sur la machine.
- Plus d’Ollama et plus de modèles.

--------------------------------------------------------------------------------
B) Retirer toute la partie IA sur le site (UI + navigation + réglages)
Tu as coché: Studio IA + Gestionnaire IA + Mon IA (chat).
Donc on retire:
- Navigation “Intelligence Artificielle” (Studio IA, Créations IA, Agent Local, etc.)
- Réglages IA (IA Locale, Mon IA, Personnages IA)
- Tout point d’entrée UI qui expose ces fonctions

B1) Retirer les entrées IA du menu latéral
Constat code:
- Le menu latéral est piloté par src/hooks/useSidebarConfig.ts (DEFAULT_CONFIG).
- Problème à anticiper: l’utilisateur peut avoir un menu persistant en localStorage (clé mediavault-sidebar-config). Si on change juste le DEFAULT_CONFIG, l’ancien menu IA peut rester chez toi tant que le localStorage garde l’ancienne config.

Actions prévues:
1) Modifier src/hooks/useSidebarConfig.ts
   - Retirer complètement la section “ai” de DEFAULT_CONFIG (la section qui contient “Studio IA”, “Créations IA”, “Agent Local”, “MediaVault Home” si tu veux le garder ailleurs).
   - Ajouter une migration simple lors du chargement du config depuis localStorage:
     - Si une section id === 'ai' existe, la supprimer automatiquement.
     - Si des items view === 'ai-studio'/'ai-creations'/'agent' existent dans d’autres sections (cas de personnalisation), les supprimer aussi.
   - (Optionnel) déplacer “MediaVault Home” hors de la section IA (si tu souhaites garder la domotique).

B2) Enlever les vues IA dans la page principale
Constat code:
- src/pages/Index.tsx affiche différentes vues selon currentView:
  - ai-studio => <AIStudioView />
  - ai-creations => <AICreationsView />
  - agent => <LocalAgent />
- Même si on cache le menu, ces imports/branches restent et maintiennent du code IA “vivant”.

Actions prévues:
2) Modifier src/pages/Index.tsx
   - Supprimer les imports:
     - AIStudioView
     - AICreationsView
     - LocalAgent
   - Supprimer les branches ternaires associées à currentView === 'ai-studio' / 'ai-creations' / 'agent'
   - S’assurer qu’un currentView “inconnu” retombe sur la vue médias standard (déjà le cas).

B3) Nettoyer les types de navigation
Constat code:
- src/types/views.ts inclut: 'ai-studio' | 'ai-creations' | 'agent'

Actions prévues:
3) Modifier src/types/views.ts
   - Retirer 'ai-studio', 'ai-creations', 'agent' de l’union ViewType, si on veut que ces vues n’existent plus du tout.
   - Vérifier ensuite les erreurs TypeScript pour ajuster les appels à onViewChange / navigate events.

Note:
- Si certaines parties du code émettent encore des événements “mediavault-navigate” vers 'agent' etc., il faudra les neutraliser (recherche rapide, suppression ou fallback).

B4) Retirer les modules IA des Paramètres
Constat code:
- src/types/settings.ts:
  - DEFAULT_MODULES contient:
    - localAI (IA Locale)
    - personalAI (Mon IA)
    - aiCharacters (Personnages IA)
  - DEFAULT_CATEGORIES contient une catégorie 'ai' “IA & Modèles”
- src/components/settings/SettingsView.tsx importe et mappe:
  - LocalAISettingsReorganized
  - PersonalAISettings
  - AICharacters

Actions prévues:
4) Modifier src/types/settings.ts
   - Retirer les modules: localAI, personalAI, aiCharacters
   - Retirer la catégorie 'ai' (IA & Modèles)
   - Retirer aussi 'aiNotifications' si tu veux enlever les notifications IA (c’est une partie IA indirecte; à confirmer si on la garde dans “Système” ou si on la retire aussi).
5) Modifier src/components/settings/SettingsView.tsx
   - Retirer les imports IA:
     - LocalAISettingsReorganized
     - PersonalAISettings
     - AICharacters
   - Retirer ces entrées du COMPONENT_MAP
   - Vérifier que SettingsGrid n’affiche plus les modules IA.

B5) Retirer les pages/composants IA qui pointent vers le Studio
Constat code:
- src/components/AICreationsView.tsx contient un bouton “Ouvrir le Studio IA”.
- D’autres composants IA existent (PersonalAIChat, etc.) mais si on enlève les points d’entrée, ils ne seront plus accessibles.

Actions prévues:
6) Rechercher et retirer les liens/boutons “Ouvrir le Studio IA”, “Mon IA”, “Agent Local”
   - Soit en supprimant les composants IA du code (si on assume suppression totale),
   - Soit en les laissant mais inaccessibles (minimal), selon ton souhait.
Tu as demandé “enlève toute la partie IA sur le site”, donc on vise plutôt suppression des points d’entrée + nettoyage de références directes pour éviter confusion.

B6) Nettoyer le localStorage côté site (important pour que l’IA disparaisse vraiment)
Problèmes persistants:
- mediavault-sidebar-config (menu)
- localai-config (config IA locale)
- ai-creations (créations IA)
- autres clés possibles liées à l’IA

Actions prévues:
7) Ajouter un “cleanup” au démarrage (option propre)
   - Au lancement de l’app (ou à l’ouverture de Index), si on est en mode “IA retirée”, supprimer:
     - mediavault-sidebar-config (ou migrer comme décrit)
     - localai-config
     - ai-creations
   - Alternative plus conservatrice: migrer sans effacer (mais cacher).  
Vu ta demande de retrait total, effacer ces clés évite que l’app continue de “se souvenir” de l’IA.

--------------------------------------------------------------------------------
C) Après la suppression: “plus simple, par fonctionnalité”
Une fois stabilisé, je te proposerai un mode “modules” où tu installes et valides un outil à la fois:
- Étape 1: Chat local (seulement) -> test conversation OK
- Étape 2: STT (Whisper) -> test transcription OK
- Étape 3: TTS (XTTS) -> test voix OK
- Étape 4: Image (ComfyUI) -> test génération OK
Chaque étape:
- un bouton d’installation dédié
- un bouton “tester” dédié (une action simple, un résultat visible)
- pas de “suite complète” tant que l’étape précédente n’est pas validée

Mais comme tu veux d’abord tout enlever, on fait d’abord A + B.

--------------------------------------------------------------------------------
D) Séquencement (ordre d’implémentation côté code)
1) Menu: migration + suppression section IA (useSidebarConfig)
2) Page Index: enlever imports/branches IA
3) Types ViewType: retirer les vues IA
4) Paramètres: retirer modules IA + imports dans SettingsView
5) Recherche de liens résiduels (AICreationsView etc.)
6) Cleanup localStorage (au minimum migration; idéalement purge des clés IA)
7) Test complet de non-régression:
   - Navigation (Accueil/Photos/Vidéos/Favoris/Albums/Timeline/Calendrier/Stats)
   - Paramètres (Système/Apparence/Médias/Intégrations)
   - Aucune entrée IA visible
   - Aucune erreur console liée à imports IA manquants

--------------------------------------------------------------------------------
E) Définition de “terminé” (acceptance criteria)
- Sur le site:
  - Plus aucune section “Intelligence Artificielle” dans la sidebar
  - Plus aucun module IA dans les Paramètres
  - Pas de vue IA accessible même via navigation interne
  - Aucun composant IA importé par la page principale (build propre)
- Sur ton PC:
  - Script uninstall exécuté avec succès
  - Dossier MediaVault-AI supprimé/vidé
  - Ollama et modèles supprimés (si tu as répondu “tout supprimer”)

--------------------------------------------------------------------------------
F) Risques / points d’attention
- Si tu avais personnalisé le menu via “Personnaliser”, l’ancienne config du menu peut réinjecter les entrées IA: d’où la migration/suppression automatique au chargement.
- Si des composants non-IA importent des hooks IA (useLocalAI/usePersonalAI) uniquement pour afficher un badge ou un statut, il faudra neutraliser ces dépendances.
- Je ne touche pas à tes médias/galerie: seulement l’IA.

Prochaine étape
- Je passe en implémentation et je supprime l’IA du site selon B.
- Pour le PC: tu peux déjà lancer la désinstallation (A) pendant que je prépare le nettoyage UI, ça ne dépend pas du site.
