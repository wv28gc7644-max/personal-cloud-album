import { useState, useCallback, useEffect } from 'react';

export interface EditableElement {
  id: string;
  type: 'icon' | 'text' | 'button' | 'container' | 'section';
  name: string;
  selector: string;
  properties: ElementProperties;
}

export interface ElementProperties {
  icon?: string;
  iconSize?: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  gap?: number;
  visible?: boolean;
  order?: number;
}

export interface GlobalEditorConfig {
  isEditMode: boolean;
  selectedElement: EditableElement | null;
  elements: Record<string, ElementProperties>;
  history: Record<string, ElementProperties>[];
  historyIndex: number;
}

const DEFAULT_CONFIG: GlobalEditorConfig = {
  isEditMode: false,
  selectedElement: null,
  elements: {},
  history: [{}],
  historyIndex: 0,
};

const STORAGE_KEY = 'mediavault-global-editor';

export function useGlobalEditor() {
  const [config, setConfig] = useState<GlobalEditorConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CONFIG, elements: parsed.elements || {} };
      }
    } catch (e) {
      console.error('Error loading global editor config:', e);
    }
    return DEFAULT_CONFIG;
  });

  // Persist elements only
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements: config.elements }));
    } catch (e) {
      console.error('Error saving global editor config:', e);
    }
  }, [config.elements]);

  const toggleEditMode = useCallback(() => {
    setConfig(prev => ({ 
      ...prev, 
      isEditMode: !prev.isEditMode,
      selectedElement: null 
    }));
  }, []);

  const setEditMode = useCallback((isEditMode: boolean) => {
    setConfig(prev => ({ ...prev, isEditMode, selectedElement: null }));
  }, []);

  const selectElement = useCallback((element: EditableElement | null) => {
    setConfig(prev => ({ ...prev, selectedElement: element }));
  }, []);

  const updateElementProperty = useCallback((
    elementId: string, 
    property: keyof ElementProperties, 
    value: any
  ) => {
    setConfig(prev => {
      const currentProps = prev.elements[elementId] || {};
      const newElements = {
        ...prev.elements,
        [elementId]: { ...currentProps, [property]: value }
      };
      
      // Add to history
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newElements);
      
      return {
        ...prev,
        elements: newElements,
        history: newHistory.slice(-50), // Keep last 50 states
        historyIndex: Math.min(newHistory.length - 1, 49),
      };
    });
  }, []);

  const getElementProperties = useCallback((elementId: string): ElementProperties => {
    return config.elements[elementId] || {};
  }, [config.elements]);

  const undo = useCallback(() => {
    setConfig(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        return {
          ...prev,
          elements: prev.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setConfig(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        return {
          ...prev,
          elements: prev.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return prev;
    });
  }, []);

  const resetElement = useCallback((elementId: string) => {
    setConfig(prev => {
      const newElements = { ...prev.elements };
      delete newElements[elementId];
      return { ...prev, elements: newElements };
    });
  }, []);

  const resetAll = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      elements: {},
      history: [{}],
      historyIndex: 0,
    }));
  }, []);

  const exportConfig = useCallback(() => {
    const blob = new Blob([JSON.stringify(config.elements, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediavault-ui-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [config.elements]);

  const importConfig = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setConfig(prev => ({
          ...prev,
          elements: imported,
          history: [imported],
          historyIndex: 0,
        }));
      } catch (err) {
        console.error('Error importing config:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    isEditMode: config.isEditMode,
    selectedElement: config.selectedElement,
    elements: config.elements,
    canUndo: config.historyIndex > 0,
    canRedo: config.historyIndex < config.history.length - 1,
    toggleEditMode,
    setEditMode,
    selectElement,
    updateElementProperty,
    getElementProperties,
    undo,
    redo,
    resetElement,
    resetAll,
    exportConfig,
    importConfig,
  };
}
