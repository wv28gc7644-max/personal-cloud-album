import { useState } from 'react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { MediaCard } from './MediaCard';
import { MediaViewer } from './MediaViewer';
import { MediaItem } from '@/types/media';
import { cn } from '@/lib/utils';
import { Images } from 'lucide-react';

export function MediaGrid() {
  const { viewMode, getFilteredMedia, removeMedia } = useMediaStore();
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  
  const filteredMedia = getFilteredMedia();

  const handleDownload = (item: MediaItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (filteredMedia.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <Images className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Aucun média trouvé</h3>
        <p className="text-muted-foreground max-w-sm">
          Ajoutez des photos et vidéos pour commencer à construire votre bibliothèque personnelle.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "p-6 animate-fade-in",
          viewMode === 'grid' && "media-grid",
          viewMode === 'grid-large' && "media-grid-large",
          viewMode === 'list' && "media-list"
        )}
      >
        {filteredMedia.map((item, index) => (
          <div
            key={item.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <MediaCard
              item={item}
              viewMode={viewMode}
              onClick={() => setViewerItem(item)}
              onDelete={() => removeMedia(item.id)}
              onDownload={() => handleDownload(item)}
            />
          </div>
        ))}
      </div>

      <MediaViewer
        item={viewerItem}
        items={filteredMedia}
        onClose={() => setViewerItem(null)}
        onNavigate={setViewerItem}
        onDownload={handleDownload}
      />
    </>
  );
}
