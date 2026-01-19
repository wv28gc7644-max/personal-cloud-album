import { create } from 'zustand';
import { MediaItem, MediaType } from '@/types/media';

export interface AdvancedFilters {
  types: MediaType[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  sizeRange: {
    min: number | null; // bytes
    max: number | null;
  };
  durationRange: {
    min: number | null; // seconds
    max: number | null;
  };
  tagIds: string[];
  hasNoTags: boolean;
}

interface AdvancedFiltersStore {
  filters: AdvancedFilters;
  isActive: boolean;
  
  // Actions
  setTypeFilter: (types: MediaType[]) => void;
  setDateRange: (from: Date | null, to: Date | null) => void;
  setSizeRange: (min: number | null, max: number | null) => void;
  setDurationRange: (min: number | null, max: number | null) => void;
  setTagFilter: (tagIds: string[]) => void;
  setHasNoTags: (value: boolean) => void;
  clearFilters: () => void;
  applyFilters: (media: MediaItem[]) => MediaItem[];
}

const defaultFilters: AdvancedFilters = {
  types: [],
  dateRange: { from: null, to: null },
  sizeRange: { min: null, max: null },
  durationRange: { min: null, max: null },
  tagIds: [],
  hasNoTags: false,
};

export const useAdvancedFilters = create<AdvancedFiltersStore>((set, get) => ({
  filters: defaultFilters,
  isActive: false,

  setTypeFilter: (types) => set((state) => ({
    filters: { ...state.filters, types },
    isActive: true
  })),

  setDateRange: (from, to) => set((state) => ({
    filters: { ...state.filters, dateRange: { from, to } },
    isActive: true
  })),

  setSizeRange: (min, max) => set((state) => ({
    filters: { ...state.filters, sizeRange: { min, max } },
    isActive: true
  })),

  setDurationRange: (min, max) => set((state) => ({
    filters: { ...state.filters, durationRange: { min, max } },
    isActive: true
  })),

  setTagFilter: (tagIds) => set((state) => ({
    filters: { ...state.filters, tagIds },
    isActive: true
  })),

  setHasNoTags: (value) => set((state) => ({
    filters: { ...state.filters, hasNoTags: value },
    isActive: true
  })),

  clearFilters: () => set({
    filters: defaultFilters,
    isActive: false
  }),

  applyFilters: (media) => {
    const { filters } = get();
    
    return media.filter((item) => {
      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(item.type)) {
        return false;
      }

      // Date filter
      if (filters.dateRange.from) {
        const itemDate = new Date(item.createdAt);
        if (itemDate < filters.dateRange.from) return false;
      }
      if (filters.dateRange.to) {
        const itemDate = new Date(item.createdAt);
        if (itemDate > filters.dateRange.to) return false;
      }

      // Size filter
      if (filters.sizeRange.min !== null && item.size < filters.sizeRange.min) {
        return false;
      }
      if (filters.sizeRange.max !== null && item.size > filters.sizeRange.max) {
        return false;
      }

      // Duration filter (videos only)
      if (item.type === 'video') {
        if (filters.durationRange.min !== null && (item.duration || 0) < filters.durationRange.min) {
          return false;
        }
        if (filters.durationRange.max !== null && (item.duration || 0) > filters.durationRange.max) {
          return false;
        }
      }

      // Tag filter
      if (filters.tagIds.length > 0) {
        const hasMatchingTag = item.tags.some((t) => filters.tagIds.includes(t.id));
        if (!hasMatchingTag) return false;
      }

      // No tags filter
      if (filters.hasNoTags && item.tags.length > 0) {
        return false;
      }

      return true;
    });
  },
}));
