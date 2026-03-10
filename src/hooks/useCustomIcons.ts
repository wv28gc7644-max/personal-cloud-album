import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomIcon {
  appId: string;
  imageUrl: string; // base64 or URL
  useGlassmorphism: boolean;
}

interface CustomIconsStore {
  customIcons: Record<string, CustomIcon>;
  setCustomIcon: (appId: string, imageUrl: string, useGlassmorphism: boolean) => void;
  removeCustomIcon: (appId: string) => void;
  getCustomIcon: (appId: string) => CustomIcon | undefined;
  resetAll: () => void;
}

export const useCustomIcons = create<CustomIconsStore>()(
  persist(
    (set, get) => ({
      customIcons: {},

      setCustomIcon: (appId, imageUrl, useGlassmorphism) => {
        set(state => ({
          customIcons: {
            ...state.customIcons,
            [appId]: { appId, imageUrl, useGlassmorphism },
          },
        }));
      },

      removeCustomIcon: (appId) => {
        set(state => {
          const { [appId]: _, ...rest } = state.customIcons;
          return { customIcons: rest };
        });
      },

      getCustomIcon: (appId) => get().customIcons[appId],

      resetAll: () => set({ customIcons: {} }),
    }),
    { name: 'cloudos-custom-icons' }
  )
);
