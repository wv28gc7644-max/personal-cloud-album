import { useState, useEffect, useCallback, useRef } from 'react';
import { useMediaStore } from './useMediaStore';
import { MediaItem } from '@/types/media';
import { toast } from 'sonner';

interface AutoSyncSettings {
  enabled: boolean;
  intervalSeconds: number;
}

interface LocalFile {
  name: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  type: 'image' | 'video';
  createdAt?: string;
}

interface UseAutoSyncReturn {
  isAutoSyncEnabled: boolean;
  intervalSeconds: number;
  lastSyncTime: Date | null;
  newFilesCount: number;
  deletedFilesCount: number;
  isSyncing: boolean;
  enableAutoSync: (enabled: boolean) => void;
  setIntervalSeconds: (seconds: number) => void;
  syncNow: () => Promise<{ added: number; deleted: number }>;
}

const getMediaType = (fileName: string): 'image' | 'video' | null => {
  const ext = fileName.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'video';
  return null;
};

const getServerUrl = (): string => {
  const saved = localStorage.getItem('mediavault-admin-settings');
  if (saved) {
    const settings = JSON.parse(saved);
    return settings.localServerUrl || 'http://localhost:3001';
  }
  return 'http://localhost:3001';
};

export const useAutoSync = (): UseAutoSyncReturn => {
  const [settings, setSettings] = useState<AutoSyncSettings>(() => {
    const saved = localStorage.getItem('mediavault-autosync-settings');
    return saved ? JSON.parse(saved) : { enabled: false, intervalSeconds: 60 };
  });
  
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [newFilesCount, setNewFilesCount] = useState(0);
  const [deletedFilesCount, setDeletedFilesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const knownFilesRef = useRef<Set<string>>(new Set());
  
  const { media, addMedia, removeMedia } = useMediaStore();

  // Initialize known files from current media
  useEffect(() => {
    const urls = new Set(media.map(m => m.url));
    knownFilesRef.current = urls;
  }, []);

  const syncNow = useCallback(async (): Promise<{ added: number; deleted: number }> => {
    setIsSyncing(true);
    
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/files`, {
        method: 'GET',
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error('Erreur de connexion au serveur');
      }
      
      const files: LocalFile[] = await response.json();
      let addedCount = 0;
      let deletedCount = 0;
      
      // Get current media
      const currentMedia = useMediaStore.getState().media;
      const existingUrls = new Set(currentMedia.map(m => m.url));
      const serverUrls = new Set(files.map(f => f.url));
      
      // Detect deleted files (files in app but not on server)
      // Only check local files (those with localhost URLs)
      for (const mediaItem of currentMedia) {
        if (mediaItem.url.includes('localhost') && !serverUrls.has(mediaItem.url)) {
          removeMedia(mediaItem.id);
          deletedCount++;
        }
      }
      
      // Detect new files (files on server but not in app)
      for (const file of files) {
        const mediaType = getMediaType(file.name);
        if (!mediaType) continue;
        
        // Skip if we already have this file
        if (existingUrls.has(file.url) || knownFilesRef.current.has(file.url)) {
          continue;
        }
        
        const mediaItem: MediaItem = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: mediaType,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl || file.url,
          tags: [],
          createdAt: file.createdAt ? new Date(file.createdAt) : new Date(),
          size: file.size
        };
        
        addMedia(mediaItem);
        knownFilesRef.current.add(file.url);
        addedCount++;
      }
      
      setLastSyncTime(new Date());
      setNewFilesCount(addedCount);
      setDeletedFilesCount(deletedCount);
      
      if (addedCount > 0 || deletedCount > 0) {
        const messages = [];
        if (addedCount > 0) messages.push(`+${addedCount} ajouté(s)`);
        if (deletedCount > 0) messages.push(`-${deletedCount} supprimé(s)`);
        toast.success(`Sync: ${messages.join(', ')}`);
      }
      
      return { added: addedCount, deleted: deletedCount };
    } catch (err) {
      // Silently fail for auto-sync to avoid toast spam
      console.warn('Auto-sync failed:', err);
      return { added: 0, deleted: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [addMedia, removeMedia]);

  const enableAutoSync = useCallback((enabled: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, enabled };
      localStorage.setItem('mediavault-autosync-settings', JSON.stringify(newSettings));
      return newSettings;
    });
    
    if (enabled) {
      toast.success('Synchronisation automatique activée');
    } else {
      toast.info('Synchronisation automatique désactivée');
    }
  }, []);

  const setIntervalSeconds = useCallback((seconds: number) => {
    setSettings(prev => {
      const newSettings = { ...prev, intervalSeconds: seconds };
      localStorage.setItem('mediavault-autosync-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  // Setup/cleanup interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (settings.enabled && settings.intervalSeconds > 0) {
      // Run immediately on enable
      syncNow();
      
      // Then set up interval
      intervalRef.current = setInterval(() => {
        syncNow();
      }, settings.intervalSeconds * 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.enabled, settings.intervalSeconds, syncNow]);

  return {
    isAutoSyncEnabled: settings.enabled,
    intervalSeconds: settings.intervalSeconds,
    lastSyncTime,
    newFilesCount,
    deletedFilesCount,
    isSyncing,
    enableAutoSync,
    setIntervalSeconds,
    syncNow
  };
};
