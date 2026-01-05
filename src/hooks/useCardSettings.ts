import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CardDisplaySettings } from '@/types/media';
import { useEffect, useState } from 'react';

interface CardSettingsStore {
  settings: CardDisplaySettings;
  updateSetting: <K extends keyof CardDisplaySettings>(key: K, value: CardDisplaySettings[K]) => void;
  resetSettings: () => void;
  syncFromLocalStorage: () => void;
}

const getSettingsFromLocalStorage = (): CardDisplaySettings => ({
  showMetadata: localStorage.getItem('mediavault-card-show-metadata') !== 'false',
  showTitle: localStorage.getItem('mediavault-card-show-title') !== 'false',
  showActionText: localStorage.getItem('mediavault-card-show-action-text') !== 'false',
  layoutOrder: (localStorage.getItem('mediavault-card-layout-order') as 'header-first' | 'media-first') || 'header-first',
  videoHoverSound: localStorage.getItem('mediavault-card-video-hover-sound') === 'true',
  videoHoverStart: (localStorage.getItem('mediavault-card-video-hover-start') as 'beginning' | 'preview') || 'beginning',
});

const defaultSettings: CardDisplaySettings = {
  showMetadata: true,
  showTitle: true,
  showActionText: true,
  layoutOrder: 'header-first',
  videoHoverSound: false,
  videoHoverStart: 'beginning',
};

export const useCardSettings = create<CardSettingsStore>()(
  persist(
    (set) => ({
      settings: typeof window !== 'undefined' ? getSettingsFromLocalStorage() : defaultSettings,

      updateSetting: (key, value) => {
        // Also save to localStorage for AdminPanel compatibility
        localStorage.setItem(`mediavault-card-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, String(value));
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        }));
      },

      resetSettings: () => {
        Object.keys(defaultSettings).forEach(key => {
          localStorage.removeItem(`mediavault-card-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
        });
        set({ settings: defaultSettings });
      },

      syncFromLocalStorage: () => {
        set({ settings: getSettingsFromLocalStorage() });
      },
    }),
    {
      name: 'mediavault-card-settings',
    }
  )
);

// Hook to listen for settings changes from AdminPanel
export const useCardSettingsSync = () => {
  const syncFromLocalStorage = useCardSettings(state => state.syncFromLocalStorage);
  
  useEffect(() => {
    const handleSettingsChange = () => {
      syncFromLocalStorage();
    };
    
    window.addEventListener('mediavault-card-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('mediavault-card-settings-changed', handleSettingsChange);
  }, [syncFromLocalStorage]);
};
