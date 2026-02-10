import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  order: number;
  type: 'action';
}

export interface ContextMenuSeparator {
  id: string;
  type: 'separator';
  order: number;
}

export type ContextMenuItem = ContextMenuAction | ContextMenuSeparator;

const DEFAULT_ITEMS: ContextMenuItem[] = [
  { id: 'view', label: 'Voir', icon: 'Eye', enabled: true, order: 0, type: 'action' },
  { id: 'info', label: 'Informations', icon: 'Info', enabled: true, order: 1, type: 'action' },
  { id: 'sep-1', type: 'separator', order: 2 },
  { id: 'download', label: 'Télécharger', icon: 'Download', enabled: true, order: 3, type: 'action' },
  { id: 'saveAs', label: 'Enregistrer sous...', icon: 'Save', enabled: true, order: 4, type: 'action' },
  { id: 'sep-2', type: 'separator', order: 5 },
  { id: 'favorite', label: 'Favoris', icon: 'Heart', enabled: true, order: 6, type: 'action' },
  { id: 'copyPath', label: 'Copier le chemin', icon: 'Copy', enabled: true, order: 7, type: 'action' },
  { id: 'sep-3', type: 'separator', order: 8 },
  { id: 'delete', label: 'Supprimer', icon: 'Trash2', enabled: true, order: 9, type: 'action' },
];

interface ContextMenuConfigStore {
  items: ContextMenuItem[];
  reorder: (items: ContextMenuItem[]) => void;
  toggleAction: (id: string) => void;
  addSeparator: (afterId: string) => void;
  removeSeparator: (id: string) => void;
  reset: () => void;
}

export const useContextMenuConfig = create<ContextMenuConfigStore>()(
  persist(
    (set) => ({
      items: DEFAULT_ITEMS,

      reorder: (items) => set({ items: items.map((item, i) => ({ ...item, order: i })) }),

      toggleAction: (id) => set((state) => ({
        items: state.items.map(item =>
          item.type === 'action' && item.id === id
            ? { ...item, enabled: !item.enabled }
            : item
        ),
      })),

      addSeparator: (afterId) => set((state) => {
        const idx = state.items.findIndex(i => i.id === afterId);
        if (idx === -1) return state;
        const newItems = [...state.items];
        const sep: ContextMenuSeparator = { id: `sep-${Date.now()}`, type: 'separator', order: 0 };
        newItems.splice(idx + 1, 0, sep);
        return { items: newItems.map((item, i) => ({ ...item, order: i })) };
      }),

      removeSeparator: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id).map((item, i) => ({ ...item, order: i })),
      })),

      reset: () => set({ items: DEFAULT_ITEMS }),
    }),
    { name: 'mediavault-context-menu-config' }
  )
);
