import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Album {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  parentId?: string; // For hierarchical folders
  mediaIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface AlbumsStore {
  albums: Album[];
  currentAlbumId: string | null;
  
  // Actions
  addAlbum: (album: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>) => Album;
  updateAlbum: (id: string, updates: Partial<Album>) => void;
  deleteAlbum: (id: string) => void;
  addMediaToAlbum: (albumId: string, mediaIds: string[]) => void;
  removeMediaFromAlbum: (albumId: string, mediaIds: string[]) => void;
  setCurrentAlbum: (id: string | null) => void;
  getAlbum: (id: string) => Album | undefined;
  getChildAlbums: (parentId?: string) => Album[];
  getRootAlbums: () => Album[];
}

export const useAlbums = create<AlbumsStore>()(
  persist(
    (set, get) => ({
      albums: [],
      currentAlbumId: null,

      addAlbum: (albumData) => {
        const newAlbum: Album = {
          ...albumData,
          id: `album-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ albums: [...state.albums, newAlbum] }));
        return newAlbum;
      },

      updateAlbum: (id, updates) => set((state) => ({
        albums: state.albums.map((a) => 
          a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
        )
      })),

      deleteAlbum: (id) => set((state) => ({
        albums: state.albums.filter((a) => a.id !== id),
        currentAlbumId: state.currentAlbumId === id ? null : state.currentAlbumId
      })),

      addMediaToAlbum: (albumId, mediaIds) => set((state) => ({
        albums: state.albums.map((a) => 
          a.id === albumId 
            ? { 
                ...a, 
                mediaIds: [...new Set([...a.mediaIds, ...mediaIds])],
                updatedAt: new Date()
              } 
            : a
        )
      })),

      removeMediaFromAlbum: (albumId, mediaIds) => set((state) => ({
        albums: state.albums.map((a) => 
          a.id === albumId 
            ? { 
                ...a, 
                mediaIds: a.mediaIds.filter((id) => !mediaIds.includes(id)),
                updatedAt: new Date()
              } 
            : a
        )
      })),

      setCurrentAlbum: (id) => set({ currentAlbumId: id }),

      getAlbum: (id) => get().albums.find((a) => a.id === id),

      getChildAlbums: (parentId) => 
        get().albums.filter((a) => a.parentId === parentId),

      getRootAlbums: () => 
        get().albums.filter((a) => !a.parentId),
    }),
    {
      name: 'mediavault-albums',
    }
  )
);
