import React, { createContext, useContext, ReactNode } from 'react';
import { useGlobalEditor, EditableElement, ElementProperties } from '@/hooks/useGlobalEditor';

interface GlobalEditorContextType {
  isEditMode: boolean;
  selectedElement: EditableElement | null;
  elements: Record<string, ElementProperties>;
  canUndo: boolean;
  canRedo: boolean;
  toggleEditMode: () => void;
  setEditMode: (isEditMode: boolean) => void;
  selectElement: (element: EditableElement | null) => void;
  updateElementProperty: (elementId: string, property: keyof ElementProperties, value: any) => void;
  getElementProperties: (elementId: string) => ElementProperties;
  undo: () => void;
  redo: () => void;
  resetElement: (elementId: string) => void;
  resetAll: () => void;
  exportConfig: () => void;
  importConfig: (file: File) => void;
}

const GlobalEditorContext = createContext<GlobalEditorContextType | null>(null);

export function GlobalEditorProvider({ children }: { children: ReactNode }) {
  const editorHook = useGlobalEditor();
  
  return (
    <GlobalEditorContext.Provider value={editorHook}>
      {children}
    </GlobalEditorContext.Provider>
  );
}

export function useGlobalEditorContext() {
  const context = useContext(GlobalEditorContext);
  if (!context) {
    throw new Error('useGlobalEditorContext must be used within GlobalEditorProvider');
  }
  return context;
}
