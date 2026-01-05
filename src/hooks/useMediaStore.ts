import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MediaItem, Tag, Playlist, ViewMode, TagColor } from '@/types/media';

interface MediaStore {
  media: MediaItem[];
  tags: Tag[];
  playlists: Playlist[];
  selectedTags: string[];
  viewMode: ViewMode;
  searchQuery: string;
  
  // Media actions
  addMedia: (item: MediaItem) => void;
  removeMedia: (id: string) => void;
  updateMedia: (id: string, updates: Partial<MediaItem>) => void;
  
  // Tag actions
  addTag: (tag: Tag) => void;
  removeTag: (id: string) => void;
  toggleSelectedTag: (id: string) => void;
  clearSelectedTags: () => void;
  
  // Playlist actions
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, mediaId: string) => void;
  removeFromPlaylist: (playlistId: string, mediaId: string) => void;
  
  // UI actions
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  
  // Getters
  getFilteredMedia: () => MediaItem[];
}

const defaultTags: Tag[] = [
  { id: '1', name: 'Favoris', color: 'yellow' },
  { id: '2', name: 'Famille', color: 'blue' },
  { id: '3', name: 'Vacances', color: 'green' },
  { id: '4', name: 'Travail', color: 'purple' },
  { id: '5', name: 'Événements', color: 'orange' },
  { id: '6', name: 'Nature', color: 'green' },
  { id: '7', name: 'Urbain', color: 'gray' },
  { id: '8', name: 'Portrait', color: 'pink' },
];

// Demo media items
const demoMedia: MediaItem[] = [
  {
    id: 'demo-1',
    name: 'Coucher de soleil océan',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    tags: [defaultTags[2], defaultTags[5]],
    createdAt: new Date('2024-01-15'),
    size: 2500000,
  },
  {
    id: 'demo-2',
    name: 'Montagnes enneigées',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400',
    tags: [defaultTags[0], defaultTags[5]],
    createdAt: new Date('2024-02-20'),
    size: 3200000,
  },
  {
    id: 'demo-3',
    name: 'Ville nocturne',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400',
    tags: [defaultTags[6]],
    createdAt: new Date('2024-03-10'),
    size: 1800000,
  },
  {
    id: 'demo-4',
    name: 'Portrait artistique',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
    tags: [defaultTags[7], defaultTags[0]],
    createdAt: new Date('2024-03-25'),
    size: 2100000,
  },
  {
    id: 'demo-5',
    name: 'Forêt brumeuse',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400',
    tags: [defaultTags[5]],
    createdAt: new Date('2024-04-05'),
    size: 2800000,
  },
  {
    id: 'demo-6',
    name: 'Architecture moderne',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400',
    tags: [defaultTags[6], defaultTags[3]],
    createdAt: new Date('2024-04-18'),
    size: 1950000,
  },
];

export const useMediaStore = create<MediaStore>()(
  persist(
    (set, get) => ({
      media: demoMedia,
      tags: defaultTags,
      playlists: [],
      selectedTags: [],
      viewMode: 'grid',
      searchQuery: '',

      addMedia: (item) => set((state) => ({ media: [item, ...state.media] })),
      
      removeMedia: (id) => set((state) => ({ 
        media: state.media.filter((m) => m.id !== id) 
      })),
      
      updateMedia: (id, updates) => set((state) => ({
        media: state.media.map((m) => m.id === id ? { ...m, ...updates } : m)
      })),

      addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
      
      removeTag: (id) => set((state) => ({ 
        tags: state.tags.filter((t) => t.id !== id) 
      })),
      
      toggleSelectedTag: (id) => set((state) => ({
        selectedTags: state.selectedTags.includes(id)
          ? state.selectedTags.filter((t) => t !== id)
          : [...state.selectedTags, id]
      })),
      
      clearSelectedTags: () => set({ selectedTags: [] }),

      addPlaylist: (playlist) => set((state) => ({ 
        playlists: [...state.playlists, playlist] 
      })),
      
      removePlaylist: (id) => set((state) => ({ 
        playlists: state.playlists.filter((p) => p.id !== id) 
      })),
      
      addToPlaylist: (playlistId, mediaId) => set((state) => {
        const media = state.media.find((m) => m.id === mediaId);
        if (!media) return state;
        
        return {
          playlists: state.playlists.map((p) => 
            p.id === playlistId 
              ? { ...p, items: [...p.items, media] }
              : p
          )
        };
      }),
      
      removeFromPlaylist: (playlistId, mediaId) => set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? { ...p, items: p.items.filter((i) => i.id !== mediaId) }
            : p
        )
      })),

      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      getFilteredMedia: () => {
        const { media, selectedTags, searchQuery } = get();
        
        return media.filter((item) => {
          const matchesTags = selectedTags.length === 0 || 
            item.tags.some((tag) => selectedTags.includes(tag.id));
          
          const matchesSearch = !searchQuery || 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some((tag) => 
              tag.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
          
          return matchesTags && matchesSearch;
        });
      },
    }),
    {
      name: 'media-vault-storage',
    }
  )
);
