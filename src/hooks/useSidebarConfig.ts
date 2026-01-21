import { useState, useCallback, useEffect } from 'react';
import { Home, Images, Video, Heart, FolderTree, Clock, Calendar, BarChart3, Tv, QrCode, Columns, Filter, RefreshCw, Sparkles, Palette, Terminal, Home as HomeIcon, Play, Tags, ListMusic } from 'lucide-react';

export interface SidebarItem {
  id: string;
  icon: string;
  label: string;
  type: 'nav' | 'tool' | 'action';
  view?: string;
  action?: string;
  badge?: string;
  isNew?: boolean;
}

export interface SidebarSection {
  id: string;
  label: string;
  icon: string;
  isCollapsible: boolean;
  isExpanded: boolean;
  items: SidebarItem[];
}

export interface SidebarConfig {
  sections: SidebarSection[];
}

// Map icon names to actual icons
export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Images, Video, Heart, FolderTree, Clock, Calendar, BarChart3,
  Tv, QrCode, Columns, Filter, RefreshCw, Sparkles, Palette, Terminal,
  HomeIcon, Play, Tags, ListMusic,
  // Aliases
  'home': Home,
  'images': Images,
  'video': Video,
  'heart': Heart,
  'folder-tree': FolderTree,
  'clock': Clock,
  'calendar': Calendar,
  'bar-chart-3': BarChart3,
  'tv': Tv,
  'qr-code': QrCode,
  'columns': Columns,
  'filter': Filter,
  'refresh-cw': RefreshCw,
  'sparkles': Sparkles,
  'palette': Palette,
  'terminal': Terminal,
  'play': Play,
  'tags': Tags,
  'list-music': ListMusic,
};

// Available icons for the icon picker
export const AVAILABLE_ICONS = [
  'Home', 'Images', 'Video', 'Heart', 'FolderTree', 'Clock', 'Calendar', 
  'BarChart3', 'Tv', 'QrCode', 'Columns', 'Filter', 'RefreshCw', 
  'Sparkles', 'Palette', 'Terminal', 'Play', 'Tags', 'ListMusic',
  'Star', 'Settings', 'User', 'Bell', 'Search', 'Menu', 'Grid', 
  'List', 'Folder', 'File', 'Image', 'Music', 'Film', 'Camera',
  'Mic', 'Download', 'Upload', 'Share', 'Link', 'Eye', 'Edit',
  'Trash', 'Plus', 'Minus', 'Check', 'X', 'Info', 'AlertCircle'
];

const DEFAULT_CONFIG: SidebarConfig = {
  sections: [
    {
      id: 'navigation',
      label: 'Navigation',
      icon: 'Home',
      isCollapsible: false,
      isExpanded: true,
      items: [
        { id: 'home', icon: 'Home', label: 'Accueil', type: 'nav', view: 'home' },
        { id: 'photos', icon: 'Images', label: 'Photos', type: 'nav', view: 'photos' },
        { id: 'videos', icon: 'Video', label: 'Vidéos', type: 'nav', view: 'videos' },
        { id: 'favorites', icon: 'Heart', label: 'Favoris', type: 'nav', view: 'favorites' },
        { id: 'albums', icon: 'FolderTree', label: 'Albums', type: 'nav', view: 'albums', isNew: true },
        { id: 'timeline', icon: 'Clock', label: 'Timeline', type: 'nav', view: 'timeline', isNew: true },
        { id: 'calendar', icon: 'Calendar', label: 'Calendrier', type: 'nav', view: 'calendar', isNew: true },
        { id: 'stats', icon: 'BarChart3', label: 'Statistiques', type: 'nav', view: 'stats' },
      ]
    },
    {
      id: 'tools',
      label: 'Outils',
      icon: 'Wrench',
      isCollapsible: true,
      isExpanded: false,
      items: [
        { id: 'kiosk', icon: 'Tv', label: 'Mode Kiosque', type: 'tool', action: 'kiosk', isNew: true },
        { id: 'qrcode', icon: 'QrCode', label: 'QR Code Mobile', type: 'tool', action: 'qrcode', isNew: true },
        { id: 'compare', icon: 'Columns', label: 'Comparer', type: 'tool', action: 'compare', isNew: true },
        { id: 'filters', icon: 'Filter', label: 'Filtres avancés', type: 'tool', action: 'filters', isNew: true },
        { id: 'update', icon: 'RefreshCw', label: 'Mise à jour', type: 'tool', action: 'update' },
      ]
    },
    {
      id: 'ai',
      label: 'Intelligence Artificielle',
      icon: 'Sparkles',
      isCollapsible: true,
      isExpanded: true,
      items: [
        { id: 'ai-studio', icon: 'Sparkles', label: 'Studio IA', type: 'nav', view: 'ai-studio', badge: 'Beta' },
        { id: 'ai-creations', icon: 'Palette', label: 'Créations IA', type: 'nav', view: 'ai-creations' },
        { id: 'agent', icon: 'Terminal', label: 'Agent Local', type: 'nav', view: 'agent' },
        { id: 'smart-home', icon: 'Home', label: 'MediaVault Home', type: 'nav', view: 'smart-home' },
      ]
    }
  ]
};

const STORAGE_KEY = 'mediavault-sidebar-config';

export function useSidebarConfig() {
  const [config, setConfig] = useState<SidebarConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading sidebar config:', e);
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving sidebar config:', e);
    }
  }, [config]);

  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, isExpanded: !s.isExpanded } : s
      )
    }));
  }, []);

  const moveItem = useCallback((
    fromSectionId: string,
    toSectionId: string,
    itemId: string,
    newIndex: number
  ) => {
    setConfig(prev => {
      const newSections = [...prev.sections];
      
      // Find and remove the item from its current section
      let movedItem: SidebarItem | null = null;
      const fromSection = newSections.find(s => s.id === fromSectionId);
      if (fromSection) {
        const itemIndex = fromSection.items.findIndex(i => i.id === itemId);
        if (itemIndex !== -1) {
          [movedItem] = fromSection.items.splice(itemIndex, 1);
        }
      }
      
      // Add item to new section at specified index
      if (movedItem) {
        const toSection = newSections.find(s => s.id === toSectionId);
        if (toSection) {
          toSection.items.splice(newIndex, 0, movedItem);
        }
      }
      
      return { ...prev, sections: newSections };
    });
  }, []);

  const moveSection = useCallback((sectionId: string, newIndex: number) => {
    setConfig(prev => {
      const sectionIndex = prev.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) return prev;
      
      const newSections = [...prev.sections];
      const [movedSection] = newSections.splice(sectionIndex, 1);
      newSections.splice(newIndex, 0, movedSection);
      
      return { ...prev, sections: newSections };
    });
  }, []);

  const addSection = useCallback((label: string, icon: string) => {
    const newSection: SidebarSection = {
      id: `custom-${Date.now()}`,
      label,
      icon,
      isCollapsible: true,
      isExpanded: true,
      items: []
    };
    
    setConfig(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    
    return newSection.id;
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<SidebarSection>) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      )
    }));
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  }, []);

  const addItem = useCallback((sectionId: string, item: Omit<SidebarItem, 'id'>) => {
    const newItem: SidebarItem = {
      ...item,
      id: `item-${Date.now()}`
    };
    
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, items: [...s.items, newItem] }
          : s
      )
    }));
    
    return newItem.id;
  }, []);

  const updateItem = useCallback((sectionId: string, itemId: string, updates: Partial<SidebarItem>) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
          : s
      )
    }));
  }, []);

  const deleteItem = useCallback((sectionId: string, itemId: string) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, items: s.items.filter(i => i.id !== itemId) }
          : s
      )
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  const exportConfig = useCallback(() => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediavault-sidebar-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const importConfig = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setConfig(imported);
      } catch (err) {
        console.error('Error importing sidebar config:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    config,
    toggleSectionExpanded,
    moveItem,
    moveSection,
    addSection,
    updateSection,
    deleteSection,
    addItem,
    updateItem,
    deleteItem,
    resetToDefault,
    exportConfig,
    importConfig,
  };
}
