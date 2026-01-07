import { useState, useCallback, useEffect } from 'react';
import { 
  SettingsLayoutConfig, 
  SettingsModule, 
  SettingsCategory,
  SettingsLayoutStyle,
  SettingsOrientation,
  DEFAULT_LAYOUT_CONFIG 
} from '@/types/settings';

const STORAGE_KEY = 'mediavault-settings-layout';

export function useSettingsLayout() {
  const [config, setConfig] = useState<SettingsLayoutConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure new modules are included
        return {
          ...DEFAULT_LAYOUT_CONFIG,
          ...parsed,
          modules: mergeModules(DEFAULT_LAYOUT_CONFIG.modules, parsed.modules || []),
          categories: mergeCategories(DEFAULT_LAYOUT_CONFIG.categories, parsed.categories || []),
        };
      }
    } catch (e) {
      console.error('Failed to load settings layout:', e);
    }
    return DEFAULT_LAYOUT_CONFIG;
  });

  // Save to localStorage whenever config changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const setStyle = useCallback((style: SettingsLayoutStyle) => {
    setConfig(prev => ({ ...prev, style }));
  }, []);

  const setOrientation = useCallback((orientation: SettingsOrientation) => {
    setConfig(prev => ({ ...prev, orientation }));
  }, []);

  const toggleEditMode = useCallback(() => {
    setConfig(prev => ({ ...prev, editMode: !prev.editMode }));
  }, []);

  const setEditMode = useCallback((editMode: boolean) => {
    setConfig(prev => ({ ...prev, editMode }));
  }, []);

  const updateModule = useCallback((moduleId: string, updates: Partial<SettingsModule>) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => 
        m.id === moduleId ? { ...m, ...updates } : m
      ),
    }));
  }, []);

  const updateCategory = useCallback((categoryId: string, updates: Partial<SettingsCategory>) => {
    setConfig(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === categoryId ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const moveModule = useCallback((moduleId: string, targetCategoryId: string, newOrder: number) => {
    setConfig(prev => {
      // Remove module from old category
      const updatedCategories = prev.categories.map(cat => ({
        ...cat,
        modules: cat.modules.filter(id => id !== moduleId),
      }));

      // Add module to new category at specific position
      const targetCatIndex = updatedCategories.findIndex(c => c.id === targetCategoryId);
      if (targetCatIndex !== -1) {
        const newModules = [...updatedCategories[targetCatIndex].modules];
        newModules.splice(newOrder, 0, moduleId);
        updatedCategories[targetCatIndex] = {
          ...updatedCategories[targetCatIndex],
          modules: newModules,
        };
      }

      // Update module's category
      const updatedModules = prev.modules.map(m => 
        m.id === moduleId ? { ...m, category: targetCategoryId, order: newOrder } : m
      );

      return {
        ...prev,
        categories: updatedCategories,
        modules: updatedModules,
      };
    });
  }, []);

  const reorderModules = useCallback((categoryId: string, moduleIds: string[]) => {
    setConfig(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === categoryId ? { ...c, modules: moduleIds } : c
      ),
    }));
  }, []);

  const reorderCategories = useCallback((categoryIds: string[]) => {
    setConfig(prev => ({
      ...prev,
      categories: categoryIds.map((id, index) => {
        const cat = prev.categories.find(c => c.id === id);
        return cat ? { ...cat, order: index } : null;
      }).filter(Boolean) as SettingsCategory[],
    }));
  }, []);

  const createCustomGroup = useCallback((name: string, icon: string, moduleIds: string[]) => {
    const newGroup: SettingsCategory = {
      id: `custom-${Date.now()}`,
      name,
      icon,
      order: config.categories.length + config.customGroups.length,
      visible: true,
      modules: moduleIds,
    };

    setConfig(prev => {
      // Remove modules from their current categories
      const updatedCategories = prev.categories.map(cat => ({
        ...cat,
        modules: cat.modules.filter(id => !moduleIds.includes(id)),
      }));

      // Update modules' category
      const updatedModules = prev.modules.map(m => 
        moduleIds.includes(m.id) ? { ...m, category: newGroup.id } : m
      );

      return {
        ...prev,
        categories: updatedCategories,
        modules: updatedModules,
        customGroups: [...prev.customGroups, newGroup],
      };
    });

    return newGroup.id;
  }, [config]);

  const deleteCustomGroup = useCallback((groupId: string) => {
    setConfig(prev => {
      const group = prev.customGroups.find(g => g.id === groupId);
      if (!group) return prev;

      // Move modules back to their original categories or first category
      const defaultCategory = prev.categories[0]?.id || 'system';
      const updatedModules = prev.modules.map(m => 
        group.modules.includes(m.id) ? { ...m, category: defaultCategory } : m
      );

      // Add modules back to default category
      const updatedCategories = prev.categories.map(c => 
        c.id === defaultCategory 
          ? { ...c, modules: [...c.modules, ...group.modules] }
          : c
      );

      return {
        ...prev,
        categories: updatedCategories,
        modules: updatedModules,
        customGroups: prev.customGroups.filter(g => g.id !== groupId),
      };
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_LAYOUT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getModulesByCategory = useCallback((categoryId: string): SettingsModule[] => {
    const category = [...config.categories, ...config.customGroups].find(c => c.id === categoryId);
    if (!category) return [];
    
    return category.modules
      .map(id => config.modules.find(m => m.id === id))
      .filter(Boolean) as SettingsModule[];
  }, [config]);

  const getAllCategories = useCallback(() => {
    return [...config.categories, ...config.customGroups]
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order);
  }, [config]);

  return {
    config,
    setStyle,
    setOrientation,
    toggleEditMode,
    setEditMode,
    updateModule,
    updateCategory,
    moveModule,
    reorderModules,
    reorderCategories,
    createCustomGroup,
    deleteCustomGroup,
    resetToDefaults,
    getModulesByCategory,
    getAllCategories,
  };
}

// Helper functions
function mergeModules(defaults: SettingsModule[], saved: SettingsModule[]): SettingsModule[] {
  const savedMap = new Map(saved.map(m => [m.id, m]));
  return defaults.map(def => {
    const savedModule = savedMap.get(def.id);
    return savedModule ? { ...def, ...savedModule } : def;
  });
}

function mergeCategories(defaults: SettingsCategory[], saved: SettingsCategory[]): SettingsCategory[] {
  const savedMap = new Map(saved.map(c => [c.id, c]));
  return defaults.map(def => {
    const savedCat = savedMap.get(def.id);
    return savedCat ? { ...def, ...savedCat } : def;
  });
}
