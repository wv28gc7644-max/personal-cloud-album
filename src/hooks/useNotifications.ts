import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'update' | 'upload' | 'delete' | 'info' | 'success' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    handler: string; // We use string identifiers for actions to make them serializable
  };
}

export interface HistoryItem {
  id: string;
  type: 'upload' | 'delete' | 'edit' | 'tag';
  title: string;
  description: string;
  timestamp: string;
  mediaName?: string;
}

interface NotificationState {
  notifications: Notification[];
  history: HistoryItem[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  unreadCount: () => number;
}

export const useNotifications = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      history: [],
      
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep max 50
        }));
        // Dispatch event for real-time UI updates
        window.dispatchEvent(new CustomEvent('mediavault-notification-added'));
      },
      
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },
      
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },
      
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      
      clearAllNotifications: () => {
        set({ notifications: [] });
      },
      
      addHistoryItem: (item) => {
        const newItem: HistoryItem = {
          ...item,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          history: [newItem, ...state.history].slice(0, 100), // Keep max 100
        }));
      },
      
      clearHistory: () => {
        set({ history: [] });
      },
      
      unreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'mediavault-notifications',
    }
  )
);

// Helper to add update notification when update is available
export const addUpdateNotification = (commitsBehind: number, latestMessage: string) => {
  const { notifications, addNotification } = useNotifications.getState();
  
  // Check if we already have an unread update notification
  const existingUpdate = notifications.find(
    (n) => n.type === 'update' && !n.read
  );
  
  if (!existingUpdate) {
    addNotification({
      type: 'update',
      title: 'Mise à jour disponible',
      message: commitsBehind > 0 
        ? `${commitsBehind} commit${commitsBehind > 1 ? 's' : ''} en retard: ${latestMessage}`
        : latestMessage,
      action: {
        label: 'Mettre à jour',
        handler: 'triggerUpdate',
      },
    });
  }
};
