import { create } from 'zustand';
import { MediaItem } from '@/types/media';

interface MediaSelectionStore {
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  
  // Actions
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectionMode: (mode: boolean) => void;
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
}

export const useMediaSelection = create<MediaSelectionStore>((set, get) => ({
  selectedIds: new Set(),
  isSelectionMode: false,

  toggleSelection: (id) => set((state) => {
    const newSet = new Set(state.selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { 
      selectedIds: newSet,
      isSelectionMode: newSet.size > 0
    };
  }),

  selectAll: (ids) => set(() => ({
    selectedIds: new Set(ids),
    isSelectionMode: ids.length > 0
  })),

  clearSelection: () => set(() => ({
    selectedIds: new Set(),
    isSelectionMode: false
  })),

  setSelectionMode: (mode) => set((state) => ({
    isSelectionMode: mode,
    selectedIds: mode ? state.selectedIds : new Set()
  })),

  isSelected: (id) => get().selectedIds.has(id),
  
  getSelectedCount: () => get().selectedIds.size,
  
  getSelectedIds: () => Array.from(get().selectedIds),
}));
