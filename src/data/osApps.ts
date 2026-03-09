import { OSApp, Wallpaper } from '@/types/os';

// Built-in system apps
export const systemApps: OSApp[] = [
  {
    id: 'mediavault',
    name: 'MediaVault',
    icon: 'Image',
    component: 'MediaVault',
    isSystemApp: true,
    isInstalled: true,
    description: 'Gestionnaire de médias personnel avec IA',
    version: '2.0.0',
  },
  {
    id: 'media-viewer',
    name: 'Visionneuse',
    icon: 'Play',
    component: 'MediaViewer',
    isSystemApp: true,
    isInstalled: true,
    description: 'Visualiseur d\'images et vidéos',
    version: '1.0.0',
  },
  {
    id: 'settings',
    name: 'Préférences Système',
    icon: 'Settings',
    component: 'SystemPreferences',
    isSystemApp: true,
    isInstalled: true,
    description: 'Configurez votre système',
  },
  {
    id: 'appstore',
    name: 'App Store',
    icon: 'Store',
    component: 'AppStore',
    isSystemApp: true,
    isInstalled: true,
    description: 'Téléchargez des applications',
  },
  {
    id: 'finder',
    name: 'Finder',
    icon: 'Folder',
    component: 'Finder',
    isSystemApp: true,
    isInstalled: true,
    description: 'Gestionnaire de fichiers',
  },
  {
    id: 'launchpad',
    name: 'Launchpad',
    icon: 'LayoutGrid',
    component: 'Launchpad',
    isSystemApp: true,
    isInstalled: true,
    description: 'Tiroir d\'applications',
  },
  {
    id: 'trash',
    name: 'Corbeille',
    icon: 'Trash2',
    component: 'Trash',
    isSystemApp: true,
    isInstalled: true,
    description: 'Éléments supprimés',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: 'Terminal',
    component: 'Terminal',
    isSystemApp: true,
    isInstalled: true,
    description: 'Interface en ligne de commande',
  },
  {
    id: 'calculator',
    name: 'Calculatrice',
    icon: 'Calculator',
    component: 'Calculator',
    isSystemApp: true,
    isInstalled: true,
    description: 'Calculatrice scientifique',
  },
];

// Apps available in the Web App Store (no installation required)
export const webStoreApps: OSApp[] = [
  {
    id: 'notes',
    name: 'Notes',
    icon: 'StickyNote',
    component: 'Notes',
    storeType: 'web',
    description: 'Prenez des notes rapidement',
    version: '1.0.0',
  },
  {
    id: 'weather',
    name: 'Météo',
    icon: 'CloudSun',
    component: 'Weather',
    storeType: 'web',
    description: 'Prévisions météorologiques',
    version: '1.0.0',
  },
  {
    id: 'calendar-app',
    name: 'Calendrier',
    icon: 'CalendarDays',
    component: 'CalendarApp',
    storeType: 'web',
    description: 'Gérez vos événements',
    version: '1.0.0',
  },
  {
    id: 'music',
    name: 'Musique',
    icon: 'Music',
    component: 'MusicPlayer',
    storeType: 'web',
    description: 'Lecteur de musique',
    version: '1.0.0',
  },
];

// Apps available in the Server App Store (require local installation)
export const serverStoreApps: OSApp[] = [
  {
    id: 'ollama',
    name: 'Ollama AI',
    icon: 'Bot',
    component: 'OllamaManager',
    storeType: 'server',
    description: 'Exécutez des LLM en local',
    version: '0.3.0',
    installScript: 'install-ollama.bat',
  },
  {
    id: 'comfyui',
    name: 'ComfyUI',
    icon: 'Paintbrush',
    component: 'ComfyUIManager',
    storeType: 'server',
    description: 'Génération d\'images par IA',
    version: '1.0.0',
    installScript: 'install-comfyui.bat',
  },
  {
    id: 'whisper',
    name: 'Whisper STT',
    icon: 'Mic',
    component: 'WhisperManager',
    storeType: 'server',
    description: 'Transcription vocale locale',
    version: '1.0.0',
    installScript: 'install-whisper.bat',
  },
  {
    id: 'stable-diffusion',
    name: 'Stable Diffusion',
    icon: 'Sparkles',
    component: 'StableDiffusionManager',
    storeType: 'server',
    description: 'Génération d\'images avancée',
    version: '2.0.0',
    installScript: 'install-sd.bat',
  },
];

// Default wallpapers
export const defaultWallpapers: Wallpaper[] = [
  {
    id: 'ocean',
    name: 'Océan',
    src: '/wallpapers/default-ocean.jpg',
    category: 'abstract',
  },
  {
    id: 'sunset',
    name: 'Coucher de soleil',
    src: '/wallpapers/sunset-silk.jpg',
    category: 'abstract',
  },
  {
    id: 'aurora',
    name: 'Aurore',
    src: '/wallpapers/aurora-dark.jpg',
    category: 'abstract',
  },
];

// Default dock configuration
export const defaultDockApps = ['finder', 'mediavault', 'appstore', 'settings'];

// Default desktop icons
export const defaultDesktopIcons = [
  { id: '1', appId: 'mediavault', x: 20, y: 20 },
];
