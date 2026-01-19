import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MediaItem } from '@/types/media';
import { useMediaStore } from '@/hooks/useMediaStore';
import { 
  X, 
  ArrowLeftRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Columns,
  Rows
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MediaCompareProps {
  open: boolean;
  onClose: () => void;
  initialItems?: [MediaItem, MediaItem];
}

type LayoutMode = 'side-by-side' | 'stacked' | 'slider';

export function MediaCompare({ open, onClose, initialItems }: MediaCompareProps) {
  const { media } = useMediaStore();
  const [leftItem, setLeftItem] = useState<MediaItem | null>(initialItems?.[0] || null);
  const [rightItem, setRightItem] = useState<MediaItem | null>(initialItems?.[1] || null);
  const [layout, setLayout] = useState<LayoutMode>('side-by-side');
  const [zoom, setZoom] = useState(1);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [selecting, setSelecting] = useState<'left' | 'right' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  const renderMediaItem = (item: MediaItem | null, side: 'left' | 'right') => {
    if (!item) {
      return (
        <button
          onClick={() => setSelecting(side)}
          className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/30 hover:bg-muted/50 transition-colors rounded-lg border-2 border-dashed border-border"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Cliquez pour sélectionner {side === 'left' ? 'le premier' : 'le second'} média
          </p>
        </button>
      );
    }

    return (
      <div className="relative w-full h-full overflow-hidden rounded-lg">
        {item.type === 'video' ? (
          <video
            src={item.url}
            className="w-full h-full object-contain"
            style={{ transform: `scale(${zoom})` }}
            controls
          />
        ) : (
          <img
            src={item.url}
            alt={item.name}
            className="w-full h-full object-contain transition-transform"
            style={{ transform: `scale(${zoom})` }}
          />
        )}
        
        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white font-medium truncate">{item.name}</p>
          <div className="flex items-center gap-3 text-white/70 text-sm mt-1">
            <span>{formatFileSize(item.size)}</span>
            <span>{format(new Date(item.createdAt), 'dd/MM/yyyy', { locale: fr })}</span>
            <span className="uppercase">{item.type}</span>
          </div>
        </div>

        {/* Change button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSelecting(side)}
          className="absolute top-2 right-2"
        >
          Changer
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
              Comparaison de médias
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {/* Layout toggles */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <Button
                  variant={layout === 'side-by-side' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setLayout('side-by-side')}
                  title="Côte à côte"
                >
                  <Columns className="w-4 h-4" />
                </Button>
                <Button
                  variant={layout === 'stacked' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setLayout('stacked')}
                  title="Empilé"
                >
                  <Rows className="w-4 h-4" />
                </Button>
                <Button
                  variant={layout === 'slider' ? 'default' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setLayout('slider')}
                  title="Curseur"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setZoom(1)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Media selection modal */}
        {selecting && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sélectionner un média</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelecting(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (selecting === 'left') setLeftItem(item);
                    else setRightItem(item);
                    setSelecting(null);
                  }}
                  className={cn(
                    "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    (leftItem?.id === item.id || rightItem?.id === item.id)
                      ? "border-primary"
                      : "border-transparent hover:border-primary/50"
                  )}
                >
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compare view */}
        <div className="flex-1 overflow-hidden">
          {layout === 'side-by-side' && (
            <div className="grid grid-cols-2 gap-4 h-full">
              {renderMediaItem(leftItem, 'left')}
              {renderMediaItem(rightItem, 'right')}
            </div>
          )}

          {layout === 'stacked' && (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex-1">{renderMediaItem(leftItem, 'left')}</div>
              <div className="flex-1">{renderMediaItem(rightItem, 'right')}</div>
            </div>
          )}

          {layout === 'slider' && leftItem && rightItem && (
            <div
              ref={sliderRef}
              className="relative w-full h-full cursor-ew-resize"
              onMouseMove={(e) => e.buttons === 1 && handleSliderMove(e)}
              onTouchMove={handleSliderMove}
            >
              {/* Right image (background) */}
              <div className="absolute inset-0">
                <img
                  src={rightItem.url}
                  alt={rightItem.name}
                  className="w-full h-full object-contain"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>

              {/* Left image (clipped) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={leftItem.url}
                  alt={leftItem.name}
                  className="w-full h-full object-contain"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>

              {/* Slider line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          )}

          {layout === 'slider' && (!leftItem || !rightItem) && (
            <div className="grid grid-cols-2 gap-4 h-full">
              {renderMediaItem(leftItem, 'left')}
              {renderMediaItem(rightItem, 'right')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
