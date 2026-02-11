import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useBidirectionalSync } from '@/hooks/useBidirectionalSync';
import { useMediaStats } from '@/hooks/useMediaStats';
import { MediaCardTwitter } from './MediaCardTwitter';
import { MediaCardMinimal } from './MediaCardMinimal';
import { MediaCardAdaptive } from './MediaCardAdaptive';
import { MediaContextMenu } from './MediaContextMenu';
import { MediaViewer } from './MediaViewer';
import { MediaItem } from '@/types/media';
import { cn } from '@/lib/utils';
import { Images } from 'lucide-react';
import { getAdminSettings } from '@/utils/safeLocalStorage';

interface MediaGridProps {
  filterType?: 'image' | 'video';
  filterFavorites?: boolean;
}

const BATCH_SIZE = 40;
const LOAD_MORE_THRESHOLD = 600; // px from bottom

export function MediaGrid({ filterType, filterFavorites }: MediaGridProps) {
  const { viewMode, getFilteredMedia, getFavorites, removeMedia, updateMedia, tags } = useMediaStore();
  const { deleteFromServer } = useBidirectionalSync();
  const { recordView } = useMediaStats();
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  const filteredMedia = filterFavorites ? getFavorites() : getFilteredMedia();
  
  const displayMedia = useMemo(() => {
    if (!filterType) return filteredMedia;
    return filteredMedia.filter(item => item.type === filterType);
  }, [filteredMedia, filterType]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [filterType, filterFavorites, viewMode]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < displayMedia.length) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, displayMedia.length));
        }
      },
      { rootMargin: `${LOAD_MORE_THRESHOLD}px` }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, displayMedia.length]);

  const visibleMedia = useMemo(() => displayMedia.slice(0, visibleCount), [displayMedia, visibleCount]);

  const handleView = useCallback((item: MediaItem) => {
    recordView(item.id);
    setViewerItem(item);
  }, [recordView]);

  const handleDownload = useCallback((item: MediaItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDelete = useCallback(async (item: MediaItem) => {
    if (item.url.includes('localhost')) {
      await deleteFromServer(item);
    } else {
      removeMedia(item.id);
    }
  }, [deleteFromServer, removeMedia]);

  const handleToggleFavorite = useCallback((item: MediaItem) => {
    const favorisTag = tags.find(t => t.name === 'Favoris');
    if (!favorisTag) return;
    const hasFavoris = item.tags.some(t => t.id === favorisTag.id);
    const newTags = hasFavoris 
      ? item.tags.filter(t => t.id !== favorisTag.id)
      : [...item.tags, favorisTag];
    updateMedia(item.id, { tags: newTags });
  }, [tags, updateMedia]);

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

  const gridColumns = getAdminSettings().gridColumns;

  const getGridStyle = (): React.CSSProperties | undefined => {
    if (viewMode === 'masonry' || viewMode === 'media-only' || viewMode === 'list') return undefined;
    if (viewMode === 'grid-large') return { display: 'grid', gridTemplateColumns: `repeat(${Math.min(gridColumns, 2)}, minmax(0, 1fr))`, gap: '1.5rem' };
    return { display: 'grid', gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gap: '1rem' };
  };

  const getGridClasses = () => {
    switch (viewMode) {
      case 'masonry':
      case 'media-only':
        return `columns-${Math.min(gridColumns, 2)} sm:columns-${gridColumns} gap-3 sm:gap-4 space-y-3 sm:space-y-4`;
      case 'list':
        return "flex flex-col gap-3 sm:gap-4";
      case 'grid-large':
      case 'adaptive':
      case 'grid':
      default:
        return "";
    }
  };

  return (
    <>
      <div
        className={cn("p-3 sm:p-6", getGridClasses())}
        style={getGridStyle()}
      >
        {visibleMedia.map((item) => (
          <div
            key={item.id}
            className={cn(
              (viewMode === 'masonry' || viewMode === 'media-only') && "break-inside-avoid",
              viewMode === 'list' && "max-w-3xl mx-auto w-full"
            )}
          >
            <MediaContextMenu
              item={item}
              onView={() => handleView(item)}
              onDelete={() => handleDelete(item)}
              onDownload={() => handleDownload(item)}
              onToggleFavorite={() => handleToggleFavorite(item)}
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
            </MediaContextMenu>
          </div>
        ))}
      </div>

      {/* Sentinel for infinite scroll */}
      {visibleCount < displayMedia.length && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            {visibleCount} / {displayMedia.length} médias affichés
          </p>
        </div>
      )}

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
