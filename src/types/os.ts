// Types for the macOS-style OS

export interface OSApp {
  id: string;
  name: string;
  icon: string; // Lucide icon name or image URL
  component?: string; // Component to render (e.g., 'MediaVault', 'Settings', 'AppStore')
  isSystemApp?: boolean;
  isInstalled?: boolean;
  storeType?: 'web' | 'server'; // For App Store categorization
  description?: string;
  version?: string;
  installScript?: string; // .bat file path for server apps
}

export interface OSWindowData {
  // Data to pass to the app when opening
  filePath?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'video' | 'audio' | 'file';
  thumbnailUrl?: string;
}

export interface OSWindow {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isActive: boolean;
  zIndex: number;
  data?: OSWindowData; // Data passed to the app
}

export interface DesktopIcon {
  id: string;
  appId: string;
  x: number;
  y: number;
}

export interface OSSettings {
  wallpaper: string;
  wallpaperName: string;
  dockApps: string[]; // App IDs in dock order
  desktopIcons: DesktopIcon[];
  dockSize: 'small' | 'medium' | 'large';
  dockMagnification: boolean;
  appearance: 'light' | 'dark' | 'auto';
  accentColor: string;
  showDesktopIcons: boolean;
  autoHideDock: boolean;
  dockPosition: 'bottom' | 'left' | 'right';
  userName?: string;
  userAvatar?: string;
  requirePassword?: boolean;
}

export interface Wallpaper {
  id: string;
  name: string;
  src: string;
  thumbnail?: string;
  category: 'dynamic' | 'landscape' | 'abstract' | 'custom';
}

export type DockPosition = 'bottom' | 'left' | 'right';

export interface OSState {
  windows: OSWindow[];
  activeWindowId: string | null;
  settings: OSSettings;
  installedApps: OSApp[];
  isLocked: boolean;
  nextZIndex: number;
}
