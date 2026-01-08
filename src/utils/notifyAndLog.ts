/**
 * Utilitaire pour notifier ET logger les événements
 * Résout le problème de l'historique des notifications
 */

import { toast } from 'sonner';

export interface NotificationEntry {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
  read: boolean;
}

const STORAGE_KEY = 'mediavault-notification-history';
const MAX_NOTIFICATIONS = 100;

// Charger l'historique
export const getNotificationHistory = (): NotificationEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored).map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    }
  } catch (e) {
    console.error('Erreur chargement historique notifications:', e);
  }
  return [];
};

// Sauvegarder une notification
const saveNotification = (entry: NotificationEntry) => {
  const history = getNotificationHistory();
  history.unshift(entry);
  // Limiter à MAX_NOTIFICATIONS
  const trimmed = history.slice(0, MAX_NOTIFICATIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
};

// Marquer comme lu
export const markAsRead = (id: string) => {
  const history = getNotificationHistory();
  const updated = history.map(n => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Marquer tout comme lu
export const markAllAsRead = () => {
  const history = getNotificationHistory();
  const updated = history.map(n => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// Supprimer une notification
export const deleteNotification = (id: string) => {
  const history = getNotificationHistory();
  const filtered = history.filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

// Vider l'historique
export const clearNotificationHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Fonction principale : notifier ET logger
export const notifyAndLog = {
  success: (title: string, options?: { description?: string }) => {
    const entry: NotificationEntry = {
      id: crypto.randomUUID(),
      title,
      description: options?.description,
      type: 'success',
      timestamp: new Date(),
      read: false
    };
    saveNotification(entry);
    toast.success(title, options);
  },

  error: (title: string, options?: { description?: string }) => {
    const entry: NotificationEntry = {
      id: crypto.randomUUID(),
      title,
      description: options?.description,
      type: 'error',
      timestamp: new Date(),
      read: false
    };
    saveNotification(entry);
    toast.error(title, options);
  },

  info: (title: string, options?: { description?: string }) => {
    const entry: NotificationEntry = {
      id: crypto.randomUUID(),
      title,
      description: options?.description,
      type: 'info',
      timestamp: new Date(),
      read: false
    };
    saveNotification(entry);
    toast.info(title, options);
  },

  warning: (title: string, options?: { description?: string }) => {
    const entry: NotificationEntry = {
      id: crypto.randomUUID(),
      title,
      description: options?.description,
      type: 'warning',
      timestamp: new Date(),
      read: false
    };
    saveNotification(entry);
    toast.warning(title, options);
  }
};

export default notifyAndLog;
