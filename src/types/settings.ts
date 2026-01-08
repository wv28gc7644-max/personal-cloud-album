// Types pour le système de paramètres Windows 11 style

export type SettingsLayoutStyle = 
  | 'windows11'    // Default - tuiles modernes avec icônes colorées
  | 'material'     // Material Design avec shadows
  | 'minimal'      // Épuré, peu de bordures
  | 'dashboard'    // Style tableau de bord avec stats
  | 'mosaic'       // Mosaïque compacte
  | 'list'         // Liste verticale
  | 'glass'        // Glassmorphism
  | 'neon'         // Néon/Cyberpunk
  | 'retro'        // Retro/Pixel
  | 'mono';        // Texte seulement

export type SettingsOrientation = 'horizontal' | 'vertical';

export interface SettingsModule {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  iconColor?: string; // HSL or hex color
  category: string;
  component: string; // Component name to render
  order: number;
  visible: boolean;
  size?: 'small' | 'medium' | 'large'; // Tile size
}

export interface SettingsCategory {
  id: string;
  name: string;
  icon: string;
  iconColor?: string;
  order: number;
  visible: boolean;
  modules: string[]; // Module IDs
}

export interface SettingsLayoutConfig {
  style: SettingsLayoutStyle;
  orientation: SettingsOrientation;
  editMode: boolean;
  categories: SettingsCategory[];
  modules: SettingsModule[];
  customGroups: SettingsCategory[]; // User-created groups
}

// Default modules definition
export const DEFAULT_MODULES: SettingsModule[] = [
  // Système
  { id: 'notifications', name: 'Notifications', description: 'Sons et alertes système', icon: 'Bell', iconColor: 'hsl(38, 92%, 50%)', category: 'system', component: 'NotificationsSettings', order: 0, visible: true },
  { id: 'aiNotifications', name: 'Notifications IA', description: 'Alertes temps réel IA', icon: 'BellRing', iconColor: 'hsl(271, 91%, 65%)', category: 'system', component: 'AINotificationsPanel', order: 1, visible: true },
  { id: 'updates', name: 'Mises à jour', description: 'Vérification et historique', icon: 'Download', iconColor: 'hsl(142, 71%, 45%)', category: 'system', component: 'UpdatesSettings', order: 2, visible: true },
  { id: 'security', name: 'Sécurité', description: 'Mots de passe et accès', icon: 'Shield', iconColor: 'hsl(0, 84%, 60%)', category: 'system', component: 'SecuritySettings', order: 3, visible: true },
  { id: 'server', name: 'Serveur local', description: 'Connexion et synchronisation', icon: 'Server', iconColor: 'hsl(221, 83%, 53%)', category: 'system', component: 'ServerSettings', order: 4, visible: true },
  { id: 'ffmpeg', name: 'FFmpeg', description: 'Traitement vidéo/audio', icon: 'Film', iconColor: 'hsl(280, 87%, 55%)', category: 'system', component: 'FFmpegManager', order: 5, visible: true },
  
  // Apparence
  { id: 'theme', name: 'Thèmes', description: 'Presets et couleurs personnalisées', icon: 'Palette', iconColor: 'hsl(326, 100%, 74%)', category: 'appearance', component: 'ThemePresetsPanel', order: 0, visible: true, size: 'medium' },
  { id: 'colorEditor', name: 'Couleurs', description: 'Éditeur avancé HSL/Gradient', icon: 'Pipette', iconColor: 'hsl(280, 87%, 55%)', category: 'appearance', component: 'AdvancedColorEditor', order: 1, visible: true },
  { id: 'cards', name: 'Design des cartes', description: 'Apparence de la galerie', icon: 'LayoutGrid', iconColor: 'hsl(199, 89%, 48%)', category: 'appearance', component: 'CardDesignEditor', order: 2, visible: true },
  { id: 'grid', name: 'Grille', description: 'Colonnes et disposition', icon: 'Grid3X3', iconColor: 'hsl(262, 83%, 58%)', category: 'appearance', component: 'GridSettings', order: 3, visible: true },
  { id: 'cardDisplay', name: 'Affichage cartes', description: 'Métadonnées et boutons', icon: 'LayoutList', iconColor: 'hsl(174, 72%, 40%)', category: 'appearance', component: 'CardDisplaySettings', order: 4, visible: true },
  
  // IA & Modèles
  { id: 'localAI', name: 'IA Locale', description: 'Ollama, ComfyUI, services', icon: 'Brain', iconColor: 'hsl(271, 91%, 65%)', category: 'ai', component: 'LocalAISettingsReorganized', order: 0, visible: true, size: 'large' },
  { id: 'personalAI', name: 'Mon IA', description: 'Personnalité et prompts', icon: 'Sparkles', iconColor: 'hsl(47, 100%, 50%)', category: 'ai', component: 'PersonalAISettings', order: 1, visible: true },
  { id: 'aiCharacters', name: 'Personnages IA', description: 'Avatars et voix', icon: 'Users', iconColor: 'hsl(340, 82%, 52%)', category: 'ai', component: 'AICharacters', order: 2, visible: true },
  
  // Médias
  { id: 'tags', name: 'Tags', description: 'Gestion des étiquettes', icon: 'Tags', iconColor: 'hsl(25, 95%, 53%)', category: 'media', component: 'TagsSettings', order: 0, visible: true },
  { id: 'playlists', name: 'Playlists', description: 'Collections de médias', icon: 'ListMusic', iconColor: 'hsl(217, 91%, 60%)', category: 'media', component: 'PlaylistsSettings', order: 1, visible: true },
  { id: 'autoSync', name: 'Synchronisation', description: 'Import automatique', icon: 'RefreshCw', iconColor: 'hsl(142, 76%, 36%)', category: 'media', component: 'AutoSyncSettings', order: 2, visible: true },
  
  // Intégrations
  { id: 'homeHub', name: 'MediaVault Home', description: 'Hub domotique complet', icon: 'Home', iconColor: 'hsl(199, 89%, 48%)', category: 'integrations', component: 'HomeAutomationHub', order: 0, visible: true, size: 'large' },
  { id: 'discord', name: 'Discord', description: 'Bot et webhooks', icon: 'MessageCircle', iconColor: 'hsl(235, 86%, 65%)', category: 'integrations', component: 'DiscordIntegration', order: 1, visible: true },
  { id: 'telegram', name: 'Telegram', description: 'Bot Telegram', icon: 'Send', iconColor: 'hsl(200, 100%, 50%)', category: 'integrations', component: 'TelegramIntegration', order: 2, visible: true },
  { id: 'webhooks', name: 'Webhooks', description: 'Notifications externes', icon: 'Webhook', iconColor: 'hsl(47, 100%, 50%)', category: 'integrations', component: 'WebhookNotifications', order: 3, visible: true },
];

export const DEFAULT_CATEGORIES: SettingsCategory[] = [
  { id: 'system', name: 'Système', icon: 'Settings', iconColor: 'hsl(215, 20%, 65%)', order: 0, visible: true, modules: ['notifications', 'aiNotifications', 'updates', 'security', 'server', 'ffmpeg'] },
  { id: 'appearance', name: 'Apparence', icon: 'Palette', iconColor: 'hsl(326, 100%, 74%)', order: 1, visible: true, modules: ['theme', 'colorEditor', 'cards', 'grid', 'cardDisplay'] },
  { id: 'ai', name: 'IA & Modèles', icon: 'Brain', iconColor: 'hsl(271, 91%, 65%)', order: 2, visible: true, modules: ['localAI', 'personalAI', 'aiCharacters'] },
  { id: 'media', name: 'Médias', icon: 'Image', iconColor: 'hsl(199, 89%, 48%)', order: 3, visible: true, modules: ['tags', 'playlists', 'autoSync'] },
  { id: 'integrations', name: 'Intégrations', icon: 'Plug', iconColor: 'hsl(142, 71%, 45%)', order: 4, visible: true, modules: ['homeHub', 'discord', 'telegram', 'webhooks'] },
];

export const DEFAULT_LAYOUT_CONFIG: SettingsLayoutConfig = {
  style: 'windows11',
  orientation: 'horizontal',
  editMode: false,
  categories: DEFAULT_CATEGORIES,
  modules: DEFAULT_MODULES,
  customGroups: [],
};
