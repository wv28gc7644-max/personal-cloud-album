import { useState, useCallback } from 'react';
import { useMediaStore } from './useMediaStore';
import { useNotifications } from './useNotifications';
import { MediaItem } from '@/types/media';
import { toast } from 'sonner';

interface UseBidirectionalSyncReturn {
  uploadToServer: (file: File, tags?: MediaItem['tags']) => Promise<MediaItem | null>;
  deleteFromServer: (mediaItem: MediaItem) => Promise<boolean>;
  isUploading: boolean;
  isDeleting: boolean;
}

const getServerUrl = (): string => {
  const saved = localStorage.getItem('mediavault-admin-settings');
  if (saved) {
    const settings = JSON.parse(saved);
    return settings.localServerUrl || 'http://localhost:3001';
  }
  return 'http://localhost:3001';
};

export const useBidirectionalSync = (): UseBidirectionalSyncReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addMedia, removeMedia } = useMediaStore();
  const { addHistoryItem } = useNotifications();

  // Upload a file to the local server
  const uploadToServer = useCallback(async (file: File, tags: MediaItem['tags'] = []): Promise<MediaItem | null> => {
    setIsUploading(true);
    
    try {
      const serverUrl = getServerUrl();
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${serverUrl}/api/upload`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000) // 60 second timeout for large files
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'upload');
      }
      
      const result = await response.json();
      
      // Create media item from server response
      const isVideo = file.type.startsWith('video/');
      const mediaItem: MediaItem = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: isVideo ? 'video' : 'image',
        url: result.url,
        thumbnailUrl: result.thumbnailUrl || result.url,
        tags: tags,
        createdAt: new Date(),
        size: file.size
      };
      
      addMedia(mediaItem);
      addHistoryItem({
        type: 'upload',
        title: 'Fichier uploadé',
        description: `Ajouté sur le serveur local`,
        mediaName: file.name,
      });
      toast.success(`"${file.name}" uploadé sur le serveur local`);
      
      return mediaItem;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Échec de l'upload: ${message}`);
      console.error('Upload failed:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [addMedia]);

  // Delete a file from the local server
  const deleteFromServer = useCallback(async (mediaItem: MediaItem): Promise<boolean> => {
    setIsDeleting(true);
    
    try {
      const serverUrl = getServerUrl();
      
      // Extract filename from URL (e.g., http://localhost:3001/media/photo.jpg -> photo.jpg)
      const urlPath = mediaItem.url.replace(/^https?:\/\/[^/]+\/media\//, '');
      const fileName = decodeURIComponent(urlPath);
      
      const response = await fetch(`${serverUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName }),
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
      
      // Remove from local store
      removeMedia(mediaItem.id);
      addHistoryItem({
        type: 'delete',
        title: 'Fichier supprimé',
        description: `Supprimé du serveur local`,
        mediaName: mediaItem.name,
      });
      toast.success(`"${mediaItem.name}" supprimé du serveur et de l'application`);
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      
      // If server is not reachable or file doesn't exist on server, just remove locally
      if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
        removeMedia(mediaItem.id);
        toast.info(`"${mediaItem.name}" supprimé localement (serveur non accessible)`);
        return true;
      }
      
      toast.error(`Échec de la suppression: ${message}`);
      console.error('Delete failed:', err);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [removeMedia]);

  return {
    uploadToServer,
    deleteFromServer,
    isUploading,
    isDeleting
  };
};
