import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Shuffle, Volume2, VolumeX, Settings } from 'lucide-react';
import { MediaItem } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type SlideshowMode = 'classic' | 'kenburns' | 'carousel' | 'cinematic';

interface SlideshowModalProps {
  open: boolean;
  onClose: () => void;
  items: MediaItem[];
}

export function SlideshowModal({ open, onClose, items }: SlideshowModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<SlideshowMode>('classic');
  const [duration, setDuration] = useState(5);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [shuffledItems, setShuffledItems] = useState<MediaItem[]>([]);

  // Filter only images for slideshow (videos could be added later with special handling)
  const mediaItems = items.filter(item => item.type === 'image');
  const displayItems = isShuffle ? shuffledItems : mediaItems;
  const currentItem = displayItems[currentIndex];

  useEffect(() => {
    if (isShuffle && mediaItems.length > 0) {
      const shuffled = [...mediaItems].sort(() => Math.random() - 0.5);
      setShuffledItems(shuffled);
    }
  }, [isShuffle, mediaItems.length]);

  useEffect(() => {
    if (!open) {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }

    if (!isPlaying || displayItems.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, duration * 1000);

    return () => clearInterval(timer);
  }, [open, isPlaying, duration, displayItems.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    let hideTimer: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setShowControls(false), 3000);
    };

    if (open) {
      window.addEventListener('mousemove', handleMouseMove);
      hideTimer = setTimeout(() => setShowControls(false), 3000);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimer);
    };
  }, [open]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  }, [displayItems.length]);

  if (!open || displayItems.length === 0) return null;

  const getModeClasses = () => {
    switch (mode) {
      case 'kenburns':
        return 'animate-kenburns';
      case 'carousel':
        return 'perspective-1000';
      case 'cinematic':
        return 'animate-cinematic';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Main image */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <img
          key={`${currentItem?.id}-${currentIndex}`}
          src={currentItem?.url}
          alt={currentItem?.name}
          className={cn(
            "max-w-full max-h-full object-contain transition-all duration-1000",
            mode === 'classic' && "animate-fade-in",
            mode === 'kenburns' && "w-full h-full object-cover animate-kenburns",
            mode === 'cinematic' && "animate-slide-up"
          )}
        />
      </div>

      {/* Gradient overlays */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-500 pointer-events-none",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Top controls */}
      <div className={cn(
        "absolute top-0 left-0 right-0 p-4 flex items-center justify-between transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center gap-4">
          <h2 className="text-white text-lg font-medium truncate max-w-md">
            {currentItem?.name}
          </h2>
        </div>
        
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Side navigation */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 text-white hover:bg-white/20 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
        onClick={goToPrev}
      >
        <ChevronLeft className="w-8 h-8" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-white hover:bg-white/20 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
        onClick={goToNext}
      >
        <ChevronRight className="w-8 h-8" />
      </Button>

      {/* Bottom controls */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        {/* Progress bar */}
        <div className="flex gap-1 mb-4">
          {displayItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                index === currentIndex ? "bg-white" : "bg-white/30"
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Play controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShuffle(!isShuffle)}
              className={cn("text-white hover:bg-white/20", isShuffle && "bg-white/20")}
            >
              <Shuffle className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>

          {/* Counter */}
          <div className="text-white text-sm">
            {currentIndex + 1} / {displayItems.length}
          </div>

          {/* Settings */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm">Durée:</span>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger className="w-20 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3s</SelectItem>
                  <SelectItem value="5">5s</SelectItem>
                  <SelectItem value="7">7s</SelectItem>
                  <SelectItem value="10">10s</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/70 text-sm">Mode:</span>
              <Select value={mode} onValueChange={(v) => setMode(v as SlideshowMode)}>
                <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classique</SelectItem>
                  <SelectItem value="kenburns">Ken Burns</SelectItem>
                  <SelectItem value="cinematic">Cinématique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
