import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useBidirectionalSync } from '@/hooks/useBidirectionalSync';
import { useMediaStats } from '@/hooks/useMediaStats';
import { MediaCardTwitter } from './MediaCardTwitter';
import { MediaCardMinimal } from './MediaCardMinimal';
import { MediaCardAdaptive } from './MediaCardAdaptive';
import { MediaViewer } from './MediaViewer';
import { MediaItem } from '@/types/media';
import { cn } from '@/lib/utils';
import { Images } from 'lucide-react';
import { getAdminSettings } from '@/utils/safeLocalStorage';

interface MediaGridProps {
  filterType?: 'image' | 'video';
  filterFavorites?: boolean;
}

export function MediaGrid({ filterType, filterFavorites }: MediaGridProps) {
  const { viewMode, getFilteredMedia, getFavorites, removeMedia, updateMedia, tags } = useMediaStore();
  const { deleteFromServer } = useBidirectionalSync();
  const { recordView } = useMediaStats();
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  
  const filteredMedia = filterFavorites ? getFavorites() : getFilteredMedia();
  
  // Apply additional type filter if specified
  const displayMedia = useMemo(() => {
    if (!filterType) return filteredMedia;
    return filteredMedia.filter(item => item.type === filterType);
  }, [filteredMedia, filterType]);

  const handleView = (item: MediaItem) => {
    recordView(item.id);
    setViewerItem(item);
  };

  const handleDownload = (item: MediaItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (item: MediaItem) => {
    // If it's a local server file, delete from server too
    if (item.url.includes('localhost')) {
      await deleteFromServer(item);
    } else {
      // Just remove from local store
      removeMedia(item.id);
    }
  };

  const handleToggleFavorite = (item: MediaItem) => {
    const favorisTag = tags.find(t => t.name === 'Favoris');
    if (!favorisTag) return;

    const hasFavoris = item.tags.some(t => t.id === favorisTag.id);
    const newTags = hasFavoris 
      ? item.tags.filter(t => t.id !== favorisTag.id)
      : [...item.tags, favorisTag];
    
    updateMedia(item.id, { tags: newTags });
  };

  if (displayMedia.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <Images className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Aucun média trouvé</h3>
        <p className="text-muted-foreground max-w-sm">
          {filterFavorites
            ? 'Aucun favori à afficher. Ajoutez des médias à vos favoris.'
            : filterType === 'image' 
            ? 'Aucune photo à afficher.' 
            : filterType === 'video' 
            ? 'Aucune vidéo à afficher.'
            : 'Ajoutez des photos et vidéos pour commencer à construire votre bibliothèque personnelle.'}
        </p>
      </div>
    );
  }

  // Get grid columns from validated localStorage settings
  const gridColumns = getAdminSettings().gridColumns;

  const getGridClasses = () => {
    switch (viewMode) {
      case 'masonry':
      case 'media-only':
        return "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4";
      case 'list':
        return "flex flex-col gap-4";
      case 'grid-large':
        return "grid grid-cols-1 md:grid-cols-2 gap-6";
      case 'adaptive':
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-auto";
      case 'grid':
      default:
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
    }
  };

  return (
    <>
      <div className={cn("p-6", getGridClasses())}>
        <AnimatePresence mode="popLayout">
          {displayMedia.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ 
                duration: 0.3, 
                delay: Math.min(index * 0.03, 0.3),
                layout: { duration: 0.3 }
              }}
              className={cn(
                (viewMode === 'masonry' || viewMode === 'media-only') && "break-inside-avoid",
                viewMode === 'list' && "max-w-3xl mx-auto w-full"
              )}
            >
              {viewMode === 'media-only' ? (
                <MediaCardMinimal
                  item={item}
                  onView={() => handleView(item)}
                />
              ) : viewMode === 'adaptive' ? (
                <MediaCardAdaptive
                  item={item}
                  onView={() => handleView(item)}
                  onDelete={() => handleDelete(item)}
                  onDownload={() => handleDownload(item)}
                  onToggleFavorite={() => handleToggleFavorite(item)}
                />
              ) : (
                <MediaCardTwitter
                  item={item}
                  onView={() => handleView(item)}
                  onDelete={() => handleDelete(item)}
                  onDownload={() => handleDownload(item)}
                  onToggleFavorite={() => handleToggleFavorite(item)}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <MediaViewer
        item={viewerItem}
        items={displayMedia}
        onClose={() => setViewerItem(null)}
        onNavigate={(item) => {
          recordView(item.id);
          setViewerItem(item);
        }}
        onDownload={handleDownload}
      />
    </>
  );
}
