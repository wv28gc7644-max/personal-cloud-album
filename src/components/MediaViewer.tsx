import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Tag as TagIcon } from 'lucide-react';
import { MediaItem } from '@/types/media';
import { Button } from '@/components/ui/button';
import { TagBadge } from './TagBadge';
import { cn } from '@/lib/utils';

interface MediaViewerProps {
  item: MediaItem | null;
  items: MediaItem[];
  onClose: () => void;
  onNavigate: (item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
}

export function MediaViewer({ item, items, onClose, onNavigate, onDownload }: MediaViewerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (item) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item) return;
      
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, items]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const currentIndex = item ? items.findIndex((i) => i.id === item.id) : -1;

  const navigatePrev = () => {
    if (currentIndex > 0) {
      onNavigate(items[currentIndex - 1]);
    }
  };

  const navigateNext = () => {
    if (currentIndex < items.length - 1) {
      onNavigate(items[currentIndex + 1]);
    }
  };

  if (!item) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background/95 backdrop-blur-xl transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">{item.name}</h2>
          <div className="flex gap-1">
            {item.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="glass" size="sm" onClick={() => onDownload(item)}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <Button
          variant="glass"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12"
          onClick={navigatePrev}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}
      
      {currentIndex < items.length - 1 && (
        <Button
          variant="glass"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12"
          onClick={navigateNext}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}

      {/* Media content */}
      <div className="absolute inset-0 flex items-center justify-center p-20">
        {item.type === 'image' ? (
          <img
            src={item.url}
            alt={item.name}
            className={cn(
              "max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-500",
              isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}
          />
        ) : (
          <video
            src={item.url}
            controls
            autoPlay
            className={cn(
              "max-w-full max-h-full rounded-lg shadow-2xl transition-all duration-500",
              isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}
          />
        )}
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground">
        {currentIndex + 1} / {items.length}
      </div>
    </div>
  );
}
