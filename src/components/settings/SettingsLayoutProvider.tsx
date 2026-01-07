import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsLayout } from '@/hooks/useSettingsLayout';
import { SettingsLayoutConfig, SettingsModule, SettingsCategory, SettingsLayoutStyle, SettingsOrientation } from '@/types/settings';

interface SettingsLayoutContextType {
  config: SettingsLayoutConfig;
  setStyle: (style: SettingsLayoutStyle) => void;
  setOrientation: (orientation: SettingsOrientation) => void;
  toggleEditMode: () => void;
  setEditMode: (editMode: boolean) => void;
  updateModule: (moduleId: string, updates: Partial<SettingsModule>) => void;
  updateCategory: (categoryId: string, updates: Partial<SettingsCategory>) => void;
  moveModule: (moduleId: string, targetCategoryId: string, newOrder: number) => void;
  reorderModules: (categoryId: string, moduleIds: string[]) => void;
  reorderCategories: (categoryIds: string[]) => void;
  createCustomGroup: (name: string, icon: string, moduleIds: string[]) => string;
  deleteCustomGroup: (groupId: string) => void;
  resetToDefaults: () => void;
  getModulesByCategory: (categoryId: string) => SettingsModule[];
  getAllCategories: () => SettingsCategory[];
}

const SettingsLayoutContext = createContext<SettingsLayoutContextType | null>(null);

export function SettingsLayoutProvider({ children }: { children: ReactNode }) {
  const layoutHook = useSettingsLayout();
  
  return (
    <SettingsLayoutContext.Provider value={layoutHook}>
      {children}
    </SettingsLayoutContext.Provider>
  );
}

export function useSettingsLayoutContext() {
  const context = useContext(SettingsLayoutContext);
  if (!context) {
    throw new Error('useSettingsLayoutContext must be used within SettingsLayoutProvider');
  }
  return context;
}
