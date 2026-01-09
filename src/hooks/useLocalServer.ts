import { useState, useCallback } from 'react';
import { useMediaStore } from './useMediaStore';
import { MediaItem, Tag } from '@/types/media';
import { toast } from 'sonner';
import { getLocalServerUrl } from '@/utils/localServerUrl';

interface LocalFile {
  name: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  type: 'image' | 'video';
  createdAt?: string;
}

interface UseLocalServerReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  testConnection: (options?: { silent?: boolean }) => Promise<boolean>;
  loadFilesFromServer: () => Promise<void>;
  filesCount: number;
}

const getMediaType = (fileName: string): 'image' | 'video' | null => {
  const ext = fileName.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'video';
  return null;
};

export const useLocalServer = (): UseLocalServerReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filesCount, setFilesCount] = useState(0);
  
  const { addMedia, tags } = useMediaStore();

  const getServerUrl = useCallback((): string => {
    return getLocalServerUrl();
  }, []);

  const testConnection = useCallback(async (options?: { silent?: boolean }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const serverUrl = getServerUrl();
    const isHttpsContext = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const looksLikeLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(serverUrl);

    const mixedContentHint =
      isHttpsContext && looksLikeLocalhost
        ? "Connexion bloquée par le navigateur (HTTPS → serveur local HTTP). Ouvrez l'interface via http://localhost:3001 (script de démarrage) ou utilisez une URL réseau (IP LAN) dans les réglages."
        : null;

    try {
      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const wasDisconnected = !isConnected;
        setIsConnected(true);
        if (!options?.silent && wasDisconnected) {
          toast.success('Connexion au serveur local réussie');
        }
        return true;
      }

      throw new Error('Serveur non accessible');
    } catch (err) {
      // Try alternative endpoint
      try {
        const response = await fetch(`${serverUrl}/api/files`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          setIsConnected(true);
          if (!options?.silent) {
            toast.success('Connexion au serveur local réussie');
          }
          return true;
        }
      } catch {
        // Connection failed
      }

      setIsConnected(false);
      setError(mixedContentHint || 'Impossible de se connecter au serveur local. Vérifiez que le serveur est démarré.');

      if (!options?.silent) {
        toast.error('Connexion échouée', {
          description: mixedContentHint || 'Assurez-vous que le serveur local est démarré'
        });
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getServerUrl, isConnected]);

  const loadFilesFromServer = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/files`, {
        method: 'GET',
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des fichiers');
      }
      
      const files: LocalFile[] = await response.json();
      let addedCount = 0;
      
      for (const file of files) {
        const mediaType = getMediaType(file.name);
        if (!mediaType) continue;
        
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
        addedCount++;
      }
      
      setFilesCount(addedCount);
      setIsConnected(true);
      
      if (addedCount > 0) {
        toast.success(`${addedCount} fichier(s) chargé(s) depuis le serveur local`);
      } else {
        toast.info('Aucun nouveau fichier trouvé');
      }
    } catch (err) {
      setIsConnected(false);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      toast.error('Erreur de chargement', {
        description: 'Vérifiez que le serveur local est démarré et accessible'
      });
    } finally {
      setIsLoading(false);
    }
  }, [getServerUrl, addMedia]);

  return {
    isConnected,
    isLoading,
    error,
    testConnection,
    loadFilesFromServer,
    filesCount
  };
};
