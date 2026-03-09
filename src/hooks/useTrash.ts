import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLocalServerUrl } from '@/utils/safeLocalStorage';
import { toast } from 'sonner';

export interface TrashItem {
  id: string;
  name: string;
  originalPath: string;
  deletedAt: Date;
  type: 'file' | 'folder';
  size?: number;
  extension?: string;
}

interface TrashState {
  items: TrashItem[];
  isLoading: boolean;
  
  // Actions
  moveToTrash: (item: { name: string; path: string; type: 'file' | 'folder'; size?: number; extension?: string }) => Promise<boolean>;
  restoreItem: (itemId: string) => Promise<boolean>;
  emptyTrash: () => Promise<void>;
  permanentlyDelete: (itemId: string) => Promise<boolean>;
  getTrashCount: () => number;
  isEmpty: () => boolean;
}

export const useTrash = create<TrashState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      moveToTrash: async (item) => {
        const serverUrl = getLocalServerUrl();
        if (!serverUrl) {
          // Fallback: just add to local trash without moving
          const trashItem: TrashItem = {
            id: `trash-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: item.name,
            originalPath: item.path,
            deletedAt: new Date(),
            type: item.type,
            size: item.size,
            extension: item.extension,
          };
          set(state => ({ items: [...state.items, trashItem] }));
          return true;
        }

        try {
          // Call server to move file to trash
          const response = await fetch(`${serverUrl}/api/fs/trash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: item.path }),
          });

          if (!response.ok) {
            throw new Error('Failed to move to trash');
          }

          const trashItem: TrashItem = {
            id: `trash-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: item.name,
            originalPath: item.path,
            deletedAt: new Date(),
            type: item.type,
            size: item.size,
            extension: item.extension,
          };

          set(state => ({ items: [...state.items, trashItem] }));
          return true;
        } catch (error) {
          console.error('Error moving to trash:', error);
          
          // Fallback: add to local trash anyway
          const trashItem: TrashItem = {
            id: `trash-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: item.name,
            originalPath: item.path,
            deletedAt: new Date(),
            type: item.type,
            size: item.size,
            extension: item.extension,
          };
          set(state => ({ items: [...state.items, trashItem] }));
          return true;
        }
      },

      restoreItem: async (itemId) => {
        const item = get().items.find(i => i.id === itemId);
        if (!item) return false;

        const serverUrl = getLocalServerUrl();
        if (serverUrl) {
          try {
            const response = await fetch(`${serverUrl}/api/fs/restore`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                name: item.name,
                originalPath: item.originalPath,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to restore');
            }
          } catch (error) {
            console.error('Error restoring:', error);
            toast.error('Impossible de restaurer le fichier');
            return false;
          }
        }

        set(state => ({
          items: state.items.filter(i => i.id !== itemId),
        }));
        toast.success(`"${item.name}" restauré`);
        return true;
      },

      emptyTrash: async () => {
        const items = get().items;
        if (items.length === 0) return;

        const serverUrl = getLocalServerUrl();
        if (serverUrl) {
          try {
            await fetch(`${serverUrl}/api/fs/empty-trash`, {
              method: 'POST',
            });
          } catch (error) {
            console.error('Error emptying trash:', error);
          }
        }

        set({ items: [] });
        toast.success('Corbeille vidée');
      },

      permanentlyDelete: async (itemId) => {
        const item = get().items.find(i => i.id === itemId);
        if (!item) return false;

        set(state => ({
          items: state.items.filter(i => i.id !== itemId),
        }));
        return true;
      },

      getTrashCount: () => get().items.length,
      isEmpty: () => get().items.length === 0,
    }),
    {
      name: 'cloudos-trash',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
