import { useState, useMemo } from 'react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useBidirectionalSync } from '@/hooks/useBidirectionalSync';
import { MediaCardTwitter } from './MediaCardTwitter';
import { MediaViewer } from './MediaViewer';
import { MediaItem } from '@/types/media';
import { cn } from '@/lib/utils';
import { Images } from 'lucide-react';

interface MediaGridProps {
  filterType?: 'image' | 'video';
}

export function MediaGrid({ filterType }: MediaGridProps) {
  const { viewMode, getFilteredMedia, removeMedia, updateMedia, tags } = useMediaStore();
  const { deleteFromServer } = useBidirectionalSync();
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  
  const filteredMedia = getFilteredMedia();
  
  // Apply additional type filter if specified
  const displayMedia = useMemo(() => {
    if (!filterType) return filteredMedia;
    return filteredMedia.filter(item => item.type === filterType);
  }, [filteredMedia, filterType]);

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
          {filterType === 'image' 
            ? 'Aucune photo à afficher.' 
            : filterType === 'video' 
            ? 'Aucune vidéo à afficher.'
            : 'Ajoutez des photos et vidéos pour commencer à construire votre bibliothèque personnelle.'}
        </p>
      </div>
    );
  }

  // Get card style from localStorage
  const savedSettings = localStorage.getItem('mediavault-admin-settings');
  const cardStyle = savedSettings ? JSON.parse(savedSettings).cardStyle : 'twitter';
  const gridColumns = savedSettings ? JSON.parse(savedSettings).gridColumns : 3;

  return (
    <>
      <div
        className={cn(
          "p-6 animate-fade-in",
          cardStyle === 'twitter' && "grid gap-6",
          cardStyle === 'grid' && "media-grid",
          cardStyle === 'compact' && "media-grid-large"
        )}
        style={cardStyle === 'twitter' ? { 
          gridTemplateColumns: `repeat(${Math.min(gridColumns, 2)}, minmax(0, 1fr))` 
        } : undefined}
      >
        {displayMedia.map((item, index) => (
          <div
            key={item.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <MediaCardTwitter
              item={item}
              onView={() => setViewerItem(item)}
              onDelete={() => handleDelete(item)}
              onDownload={() => handleDownload(item)}
              onToggleFavorite={() => handleToggleFavorite(item)}
            />
          </div>
        ))}
      </div>

      <MediaViewer
        item={viewerItem}
        items={displayMedia}
        onClose={() => setViewerItem(null)}
        onNavigate={setViewerItem}
        onDownload={handleDownload}
      />
    </>
  );
}
