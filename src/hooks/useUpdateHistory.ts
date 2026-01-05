import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UpdateHistoryItem {
  id: string;
  fromVersion: string;
  toVersion: string;
  date: string;
  commitsBehind: number;
  success: boolean;
}

interface UpdateHistoryState {
  history: UpdateHistoryItem[];
  addUpdate: (item: Omit<UpdateHistoryItem, 'id' | 'date'>) => void;
  clearHistory: () => void;
}

export const useUpdateHistory = create<UpdateHistoryState>()(
  persist(
    (set) => ({
      history: [],
      
      addUpdate: (item) => {
        const newItem: UpdateHistoryItem = {
          ...item,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
        };
        set((state) => ({
          history: [newItem, ...state.history].slice(0, 50), // Keep max 50
        }));
      },
      
      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: 'mediavault-update-history',
    }
  )
);

// Helper to add update to history
export const recordSuccessfulUpdate = (fromVersion: string, toVersion: string, commitsBehind: number) => {
  const { addUpdate } = useUpdateHistory.getState();
  addUpdate({
    fromVersion: fromVersion.substring(0, 7),
    toVersion: toVersion.substring(0, 7),
    commitsBehind,
    success: true,
  });
};
