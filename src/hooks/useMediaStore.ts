import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MediaItem, Tag, Playlist, ViewMode, SortOption, SourceFilter } from '@/types/media';

interface MediaStore {
  media: MediaItem[];
  tags: Tag[];
  playlists: Playlist[];
  selectedTags: string[];
  viewMode: ViewMode;
  sortBy: SortOption;
  searchQuery: string;
  sourceFilter: SourceFilter;
  sourceFolderFilter: string | null;
  
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
  setSortBy: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  setSourceFilter: (filter: SourceFilter) => void;
  setSourceFolderFilter: (folder: string | null) => void;
  removeMediaByFolder: (folder: string) => void;
  getSourceFolders: () => string[];
  getMediaByFolderPrefix: (folder: string) => MediaItem[];
  
  // Getters
  getFilteredMedia: () => MediaItem[];
  getFavorites: () => MediaItem[];
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

const sortMedia = (media: MediaItem[], sortBy: SortOption): MediaItem[] => {
  return [...media].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'date-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'size-desc':
        return b.size - a.size;
      case 'size-asc':
        return a.size - b.size;
      case 'type-image':
        return a.type === 'image' ? -1 : 1;
      case 'type-video':
        return a.type === 'video' ? -1 : 1;
      case 'duration-desc':
        return (b.duration || 0) - (a.duration || 0);
      default:
        return 0;
    }
  });
};

export const useMediaStore = create<MediaStore>()(
  persist(
    (set, get) => ({
      media: demoMedia,
      tags: defaultTags,
      playlists: [],
      selectedTags: [],
      viewMode: 'grid',
      sortBy: 'date-desc',
      searchQuery: '',
      sourceFilter: 'all' as SourceFilter,
      sourceFolderFilter: null as string | null,

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
      setSortBy: (sort) => set({ sortBy: sort }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSourceFilter: (filter) => set({ sourceFilter: filter }),
      setSourceFolderFilter: (folder) => set({ sourceFolderFilter: folder }),

      removeMediaByFolder: (folder) => set((state) => {
        const folderNormalized = folder.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();

        console.log('[removeMediaByFolder] folder param:', JSON.stringify(folder));
        console.log('[removeMediaByFolder] folderNormalized:', folderNormalized);
        console.log('[removeMediaByFolder] total media:', state.media.length);

        const mediasWithSource = state.media.filter(m => m.sourceFolder || m.sourcePath);
        console.log('[removeMediaByFolder] media with sourceFolder/sourcePath:', mediasWithSource.length);
        mediasWithSource.forEach(m => {
          console.log('  ->', JSON.stringify({ id: m.id, name: m.name, sourceFolder: m.sourceFolder, sourcePath: m.sourcePath?.substring(0, 80) }));
        });

        // Primary: match by sourceFolder
        let remaining = state.media.filter((m) => {
          if (!m.sourceFolder) return true;
          const mNorm = m.sourceFolder.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
          return mNorm !== folderNormalized;
        });

        const removedByFolder = state.media.length - remaining.length;
        console.log('[removeMediaByFolder] removed by sourceFolder match:', removedByFolder);

        // Fallback: if nothing removed by sourceFolder, try by sourcePath prefix
        if (removedByFolder === 0) {
          console.log('[removeMediaByFolder] fallback: trying sourcePath prefix match');
          remaining = state.media.filter((m) => {
            if (!m.sourcePath) return true;
            const pathNorm = m.sourcePath.replace(/\\/g, '/').toLowerCase();
            return !pathNorm.startsWith(folderNormalized + '/') && pathNorm !== folderNormalized;
          });
          const removedByPath = state.media.length - remaining.length;
          console.log('[removeMediaByFolder] removed by sourcePath fallback:', removedByPath);
        }

        // Fallback 2: if still nothing, try URL containing the folder path
        if (remaining.length === state.media.length) {
          console.log('[removeMediaByFolder] fallback 2: trying URL match');
          const folderEncoded = encodeURIComponent(folder);
          remaining = state.media.filter((m) => {
            if (!m.isLinked) return true;
            const url = m.url || '';
            return !url.includes(folder) && !url.includes(folderEncoded) && !url.includes(folderNormalized);
          });
          console.log('[removeMediaByFolder] removed by URL fallback:', state.media.length - remaining.length);
        }

        console.log('[removeMediaByFolder] final remaining:', remaining.length, 'removed total:', state.media.length - remaining.length);

        return {
          media: remaining,
          sourceFolderFilter: state.sourceFolderFilter === folder ? null : state.sourceFolderFilter,
        };
      }),

      getSourceFolders: () => {
        const { media } = get();
        const folders = new Set<string>();
        media.forEach(m => {
          if (m.sourceFolder) folders.add(m.sourceFolder);
        });
        return Array.from(folders).sort();
      },

      getMediaByFolderPrefix: (folder: string) => {
        const { media, sortBy } = get();
        const norm = folder.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
        const filtered = media.filter(m => {
          const sf = (m.sourceFolder || '').replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
          const sp = (m.sourcePath || '').replace(/\\/g, '/').toLowerCase();
          return sf === norm || sf.startsWith(norm + '/') || sp.startsWith(norm + '/');
        });
        return sortMedia(filtered, sortBy);
      },

      getFilteredMedia: () => {
        const { media, selectedTags, searchQuery, sortBy, sourceFilter, sourceFolderFilter } = get();
        
        const filtered = media.filter((item) => {
          const matchesTags = selectedTags.length === 0 || 
            item.tags.some((tag) => selectedTags.includes(tag.id));
          
          const matchesSearch = !searchQuery || 
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some((tag) => 
              tag.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

          const matchesSource = sourceFilter === 'all' ||
            (sourceFilter === 'linked' && item.isLinked) ||
            (sourceFilter === 'local' && !item.isLinked);

          const matchesFolder = !sourceFolderFilter || item.sourceFolder === sourceFolderFilter;
          
          return matchesTags && matchesSearch && matchesSource && matchesFolder;
        });

        return sortMedia(filtered, sortBy);
      },

      getFavorites: () => {
        const { media, sortBy } = get();
        const favorites = media.filter((item) => 
          item.tags.some((tag) => tag.name === 'Favoris')
        );
        return sortMedia(favorites, sortBy);
      },
    }),
    {
      name: 'media-vault-storage',
    }
  )
);
