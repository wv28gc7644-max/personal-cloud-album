import { useState } from 'react';
import { MediaItem } from '@/types/media';
import { Play, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MediaCardMultiProps {
  items: MediaItem[];
  onClick?: (item: MediaItem) => void;
  className?: string;
}

export const MediaCardMulti = ({ items, onClick, className }: MediaCardMultiProps) => {
  const [showGallery, setShowGallery] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (items.length === 0) return null;

  const primaryItem = items[0];
  const hasMultiple = items.length > 1;
  const additionalCount = items.length - 4;

  // Determine grid layout based on count
  const getGridLayout = () => {
    switch (items.length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-2';
      default:
        return 'grid-cols-2';
    }
  };

  const handleClick = (e: React.MouseEvent, item: MediaItem, index: number) => {
    e.stopPropagation();
    setCurrentIndex(index);
    if (hasMultiple) {
      setShowGallery(true);
    } else if (onClick) {
      onClick(item);
    }
  };

  const navigatePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const navigateNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const renderMediaPreview = (item: MediaItem, index: number, isLast: boolean = false) => {
    const showOverlay = isLast && additionalCount > 0;
    
    return (
      <div
        key={item.id}
        className={cn(
          "relative overflow-hidden cursor-pointer group",
          items.length === 3 && index === 0 && "row-span-2",
          "bg-muted"
        )}
        onClick={(e) => handleClick(e, item, index)}
      >
        {item.type === 'image' ? (
          <img
            src={item.thumbnailUrl || item.url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="relative w-full h-full">
            <video
              src={item.url}
              poster={item.thumbnailUrl}
              className="w-full h-full object-cover"
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          </div>
        )}
        
        {/* Overlay for additional items */}
        {showOverlay && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">+{additionalCount}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={cn(
        "w-full aspect-square rounded-lg overflow-hidden",
        `grid ${getGridLayout()} gap-0.5`,
        className
      )}>
        {items.slice(0, 4).map((item, index) => 
          renderMediaPreview(item, index, index === 3)
        )}
      </div>

      {/* Multi-content indicator */}
      {hasMultiple && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
          {items.some(i => i.type === 'image') && (
            <ImageIcon className="w-3 h-3" />
          )}
          {items.some(i => i.type === 'video') && (
            <Play className="w-3 h-3" />
          )}
          <span>{items.length}</span>
        </div>
      )}

      {/* Gallery Modal */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative min-h-[60vh] flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setShowGallery(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Navigation */}
            {items.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 w-12 h-12"
                  onClick={navigatePrev}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 w-12 h-12"
                  onClick={navigateNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Current Media */}
            <div className="w-full max-h-[80vh] flex items-center justify-center p-8">
              {items[currentIndex].type === 'image' ? (
                <img
                  src={items[currentIndex].url}
                  alt={items[currentIndex].name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <video
                  src={items[currentIndex].url}
                  poster={items[currentIndex].thumbnailUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-lg"
                />
              )}
            </div>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {currentIndex + 1} / {items.length}
            </div>

            {/* Thumbnails strip */}
            {items.length > 1 && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "w-12 h-12 rounded overflow-hidden border-2 transition-all",
                      currentIndex === index 
                        ? "border-white scale-110" 
                        : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
