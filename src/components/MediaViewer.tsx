import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Maximize, Minimize } from 'lucide-react';
import { MediaItem } from '@/types/media';
import { Button } from '@/components/ui/button';
import { TagBadge } from './TagBadge';
import { CustomVideoPlayer, CustomVideoPlayerRef } from './video-player';
import { useMediaStats } from '@/hooks/useMediaStats';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<CustomVideoPlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const lastSegmentTimeRef = useRef<number>(0);
  const { recordVideoSegment, getStats } = useMediaStats();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (item) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      lastSegmentTimeRef.current = 0;
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [item]);

  // Track video segments
  const handleTimeUpdate = useCallback((currentTime: number) => {
    if (!item) return;
    
    const segmentSize = 5; // 5 second segments
    
    // Record segment every 2 seconds of playback
    if (currentTime - lastSegmentTimeRef.current >= 2) {
      const segmentStart = Math.floor(lastSegmentTimeRef.current / segmentSize) * segmentSize;
      const segmentEnd = segmentStart + segmentSize;
      
      recordVideoSegment(item.id, segmentStart, Math.min(segmentEnd, item.duration || segmentEnd));
      lastSegmentTimeRef.current = currentTime;
    }
  }, [item, recordVideoSegment]);

  // Handle seek (replay detection)
  const handleSeeked = useCallback(() => {
    if (videoRef.current) {
      lastSegmentTimeRef.current = videoRef.current.getCurrentTime();
    }
  }, []);

  // Handle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!mediaContainerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await mediaContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item) return;
      
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          handleClose();
        }
      } else if (e.key === 'ArrowLeft') {
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, items, isFullscreen, toggleFullscreen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  // Handle click outside media to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking on the backdrop itself, not on media or controls
    if (e.target === e.currentTarget) {
      handleClose();
    }
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

  const stats = getStats(item.id);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-50 bg-background/95 backdrop-blur-xl transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Header - top on desktop, hidden on mobile (controls at bottom) */}
      <div className={cn(
        "absolute left-0 right-0 p-3 sm:p-4 flex items-center justify-between z-20 bg-gradient-to-b from-background/80 to-transparent",
        isMobile ? "bottom-0 bg-gradient-to-t" : "top-0"
      )}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h2 className="text-sm sm:text-lg font-medium truncate">{item.name}</h2>
          <div className="hidden sm:flex gap-1">
            {item.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button variant="glass" size="sm" onClick={() => onDownload(item)} className="hidden sm:flex">
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDownload(item)} className="sm:hidden h-9 w-9">
            <Download className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Plein écran (F)" className="h-9 w-9">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <Button
          variant="glass"
          size="icon"
          className={cn(
            "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20",
            isMobile ? "w-10 h-10" : "w-12 h-12"
          )}
          onClick={navigatePrev}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}
      
      {currentIndex < items.length - 1 && (
        <Button
          variant="glass"
          size="icon"
          className={cn(
            "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20",
            isMobile ? "w-10 h-10" : "w-12 h-12"
          )}
          onClick={navigateNext}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}

      {/* Media content - clickable backdrop */}
      <div 
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={handleBackdropClick}
      >
        {item.type === 'image' ? (
          <img
            ref={mediaContainerRef as React.RefObject<HTMLImageElement>}
            src={item.url}
            alt={item.name}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "max-w-[98vw] sm:max-w-[95vw] max-h-[calc(100vh-80px)] sm:max-h-[calc(100vh-110px)] object-contain rounded-lg shadow-2xl transition-all duration-500 cursor-default",
              isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}
          />
        ) : (
          <div
            ref={mediaContainerRef}
            className={cn(
              "flex items-center justify-center transition-all duration-500 cursor-default max-w-[98vw] sm:max-w-[95vw] max-h-[calc(100vh-80px)] sm:max-h-[calc(100vh-110px)]",
              isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}
            style={{ width: 'min(98vw, calc((100vh - 110px) * 16 / 9))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CustomVideoPlayer
              ref={videoRef}
              src={item.url}
              duration={item.duration}
              stats={stats}
              autoPlay
              onTimeUpdate={handleTimeUpdate}
              onSeeked={handleSeeked}
              onDownload={() => onDownload(item)}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>
        )}
      </div>

      {/* Counter */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-full backdrop-blur-sm",
        isMobile ? "top-4" : "bottom-4"
      )}>
        {currentIndex + 1} / {items.length}
      </div>

      {/* Click hint - desktop only */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50 hidden sm:block">
        Cliquez en dehors pour fermer · F pour plein écran
      </div>
    </div>
  );
}
