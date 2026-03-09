import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OSState, OSWindow, OSSettings, OSApp, DesktopIcon, OSWindowData } from '@/types/os';
import { systemApps, defaultDockApps, defaultDesktopIcons, webStoreApps, serverStoreApps } from '@/data/osApps';
import defaultOceanWallpaper from '@/assets/wallpapers/default-ocean.jpg';

const defaultSettings: OSSettings = {
  wallpaper: defaultOceanWallpaper,
  wallpaperName: 'Océan',
  dockApps: defaultDockApps,
  desktopIcons: defaultDesktopIcons,
  dockSize: 'medium',
  dockMagnification: true,
  appearance: 'auto',
  accentColor: 'blue',
  showDesktopIcons: true,
  autoHideDock: false,
  dockPosition: 'bottom',
  requirePassword: false,
};

interface OSStore extends OSState {
  // Window management
  openWindow: (appId: string, data?: OSWindowData) => void;
  openFileInApp: (appId: string, data: OSWindowData) => void;
  getWindowData: (windowId: string) => OSWindowData | undefined;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, x: number, y: number) => void;
  updateWindowSize: (windowId: string, width: number, height: number) => void;
  
  // App management
  installApp: (app: OSApp) => void;
  uninstallApp: (appId: string) => void;
  getApp: (appId: string) => OSApp | undefined;
  getAllApps: () => OSApp[];
  
  // Dock management
  addToDock: (appId: string) => void;
  removeFromDock: (appId: string) => void;
  reorderDock: (appIds: string[]) => void;
  
  // Desktop icons
  addDesktopIcon: (icon: DesktopIcon) => void;
  removeDesktopIcon: (iconId: string) => void;
  updateDesktopIconPosition: (iconId: string, x: number, y: number) => void;
  
  // Settings
  updateSettings: (settings: Partial<OSSettings>) => void;
  
  // Lock screen
  lock: () => void;
  unlock: () => void;
}

export const useOS = create<OSStore>()(
  persist(
    (set, get) => ({
      windows: [],
      activeWindowId: null,
      settings: defaultSettings,
      installedApps: [...systemApps],
      isLocked: false,
      nextZIndex: 100,

      openWindow: (appId: string) => {
        const app = get().getApp(appId);
        if (!app) return;

        // Check if window already exists
        const existingWindow = get().windows.find(w => w.appId === appId);
        if (existingWindow) {
          if (existingWindow.isMinimized) {
            get().restoreWindow(existingWindow.id);
          } else {
            get().focusWindow(existingWindow.id);
          }
          return;
        }

        const windowId = `window-${appId}-${Date.now()}`;
        const nextZ = get().nextZIndex;
        
        // Center the window
        const width = app.id === 'mediavault' ? 1200 : 800;
        const height = app.id === 'mediavault' ? 800 : 600;
        const x = Math.max(50, (window.innerWidth - width) / 2);
        const y = Math.max(50, (window.innerHeight - height) / 2 - 40);

        const newWindow: OSWindow = {
          id: windowId,
          appId,
          title: app.name,
          x,
          y,
          width,
          height,
          minWidth: 400,
          minHeight: 300,
          isMinimized: false,
          isMaximized: false,
          isActive: true,
          zIndex: nextZ,
        };

        set(state => ({
          windows: state.windows.map(w => ({ ...w, isActive: false })).concat(newWindow),
          activeWindowId: windowId,
          nextZIndex: nextZ + 1,
        }));
      },

      closeWindow: (windowId: string) => {
        set(state => {
          const remainingWindows = state.windows.filter(w => w.id !== windowId);
          const newActive = remainingWindows.length > 0 
            ? remainingWindows.reduce((a, b) => a.zIndex > b.zIndex ? a : b).id 
            : null;
          return {
            windows: remainingWindows.map(w => ({
              ...w,
              isActive: w.id === newActive
            })),
            activeWindowId: newActive,
          };
        });
      },

      minimizeWindow: (windowId: string) => {
        set(state => ({
          windows: state.windows.map(w =>
            w.id === windowId ? { ...w, isMinimized: true, isActive: false } : w
          ),
          activeWindowId: state.activeWindowId === windowId ? null : state.activeWindowId,
        }));
      },

      maximizeWindow: (windowId: string) => {
        set(state => ({
          windows: state.windows.map(w =>
            w.id === windowId ? { ...w, isMaximized: true } : w
          ),
        }));
      },

      restoreWindow: (windowId: string) => {
        const nextZ = get().nextZIndex;
        set(state => ({
          windows: state.windows.map(w =>
            w.id === windowId 
              ? { ...w, isMinimized: false, isMaximized: false, isActive: true, zIndex: nextZ } 
              : { ...w, isActive: false }
          ),
          activeWindowId: windowId,
          nextZIndex: nextZ + 1,
        }));
      },

      focusWindow: (windowId: string) => {
        const nextZ = get().nextZIndex;
        set(state => ({
          windows: state.windows.map(w => ({
            ...w,
            isActive: w.id === windowId,
            zIndex: w.id === windowId ? nextZ : w.zIndex,
          })),
          activeWindowId: windowId,
          nextZIndex: nextZ + 1,
        }));
      },

      updateWindowPosition: (windowId: string, x: number, y: number) => {
        set(state => ({
          windows: state.windows.map(w =>
            w.id === windowId ? { ...w, x, y } : w
          ),
        }));
      },

      updateWindowSize: (windowId: string, width: number, height: number) => {
        set(state => ({
          windows: state.windows.map(w =>
            w.id === windowId ? { ...w, width, height } : w
          ),
        }));
      },

      installApp: (app: OSApp) => {
        set(state => ({
          installedApps: [...state.installedApps, { ...app, isInstalled: true }],
        }));
      },

      uninstallApp: (appId: string) => {
        set(state => ({
          installedApps: state.installedApps.filter(a => a.id !== appId || a.isSystemApp),
          settings: {
            ...state.settings,
            dockApps: state.settings.dockApps.filter(id => id !== appId),
          },
        }));
      },

      getApp: (appId: string) => {
        const installed = get().installedApps.find(a => a.id === appId);
        if (installed) return installed;
        const webApp = webStoreApps.find(a => a.id === appId);
        if (webApp) return webApp;
        return serverStoreApps.find(a => a.id === appId);
      },

      getAllApps: () => {
        return [...get().installedApps, ...webStoreApps, ...serverStoreApps];
      },

      addToDock: (appId: string) => {
        set(state => ({
          settings: {
            ...state.settings,
            dockApps: state.settings.dockApps.includes(appId)
              ? state.settings.dockApps
              : [...state.settings.dockApps, appId],
          },
        }));
      },

      removeFromDock: (appId: string) => {
        set(state => ({
          settings: {
            ...state.settings,
            dockApps: state.settings.dockApps.filter(id => id !== appId),
          },
        }));
      },

      reorderDock: (appIds: string[]) => {
        set(state => ({
          settings: { ...state.settings, dockApps: appIds },
        }));
      },

      addDesktopIcon: (icon: DesktopIcon) => {
        set(state => ({
          settings: {
            ...state.settings,
            desktopIcons: [...state.settings.desktopIcons, icon],
          },
        }));
      },

      removeDesktopIcon: (iconId: string) => {
        set(state => ({
          settings: {
            ...state.settings,
            desktopIcons: state.settings.desktopIcons.filter(i => i.id !== iconId),
          },
        }));
      },

      updateDesktopIconPosition: (iconId: string, x: number, y: number) => {
        set(state => ({
          settings: {
            ...state.settings,
            desktopIcons: state.settings.desktopIcons.map(i =>
              i.id === iconId ? { ...i, x, y } : i
            ),
          },
        }));
      },

      updateSettings: (newSettings: Partial<OSSettings>) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      lock: () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false }),
    }),
    {
      name: 'os-storage',
      partialize: (state) => ({
        settings: state.settings,
        installedApps: state.installedApps,
      }),
    }
  )
);
