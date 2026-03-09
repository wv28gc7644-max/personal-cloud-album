import { useState, useCallback, useEffect } from 'react';
import { useMediaStore } from './useMediaStore';
import { MediaItem } from '@/types/media';
import { toast } from 'sonner';

export interface FinderDropData {
  id: string;
  name: string;
  path: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'audio' | 'file';
  size?: number;
  extension?: string;
}

// Custom event name for Finder drops
const FINDER_DROP_EVENT = 'mediavault:finder-drop';

export const useFinderDrop = () => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { addMedia, media } = useMediaStore();

  const handleFinderDrop = useCallback((data: FinderDropData) => {
    // Check if already exists
    const exists = media.some(m => m.url === data.url);
    if (exists) {
      toast.info(`"${data.name}" existe déjà dans la bibliothèque`);
      return;
    }

    // Create media item from finder data
    const mediaItem: MediaItem = {
      id: `finder-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: data.name.replace(/\.[^/.]+$/, ''), // Remove extension
      type: data.type === 'video' ? 'video' : 'image',
      url: data.url,
      thumbnailUrl: data.thumbnailUrl || data.url,
      tags: [],
      createdAt: new Date(),
      size: data.size,
      sourceFolder: data.path.split(/[/\\]/).slice(0, -1).join('/'), // Parent folder
    };

    addMedia(mediaItem);
    toast.success(`"${data.name}" importé dans MediaVault`);
  }, [addMedia, media]);

  // Listen for custom drop events from Finder
  useEffect(() => {
    const handleDropEvent = (e: CustomEvent<FinderDropData[]>) => {
      const items = e.detail;
      let imported = 0;
      
      for (const item of items) {
        // Only import images and videos
        if (item.type === 'image' || item.type === 'video') {
          const exists = media.some(m => m.url === item.url);
          if (!exists) {
            const mediaItem: MediaItem = {
              id: `finder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: item.name.replace(/\.[^/.]+$/, ''),
              type: item.type === 'video' ? 'video' : 'image',
              url: item.url,
              thumbnailUrl: item.thumbnailUrl || item.url,
              tags: [],
              createdAt: new Date(),
              size: item.size,
              sourceFolder: item.path.split(/[/\\]/).slice(0, -1).join('/'),
            };
            addMedia(mediaItem);
            imported++;
          }
        }
      }

      if (imported > 0) {
        toast.success(`${imported} fichier${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''} dans MediaVault`);
      } else if (items.length > 0) {
        toast.info('Les fichiers existent déjà ou ne sont pas des médias supportés');
      }
    };

    window.addEventListener(FINDER_DROP_EVENT, handleDropEvent as EventListener);
    return () => {
      window.removeEventListener(FINDER_DROP_EVENT, handleDropEvent as EventListener);
    };
  }, [addMedia, media]);

  return {
    isDraggingOver,
    setIsDraggingOver,
    handleFinderDrop,
  };
};

// Dispatch drop event to MediaVault
export const dispatchFinderDrop = (items: FinderDropData[]) => {
  const event = new CustomEvent(FINDER_DROP_EVENT, { detail: items });
  window.dispatchEvent(event);
};
