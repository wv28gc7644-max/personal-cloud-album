import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaItem } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  X, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat,
  Clock,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KioskModeProps {
  open: boolean;
  onClose: () => void;
  items: MediaItem[];
}

export function KioskMode({ open, onClose, items }: KioskModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(5);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const currentItem = items[currentIndex];
  const isVideo = currentItem?.type === 'video';

  const goToNext = useCallback(() => {
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * items.length);
      setCurrentIndex(randomIndex);
    } else if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (isRepeat) {
      setCurrentIndex(0);
    }
    setProgress(0);
  }, [currentIndex, items.length, isShuffle, isRepeat]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (isRepeat) {
      setCurrentIndex(items.length - 1);
    }
    setProgress(0);
  }, [currentIndex, items.length, isRepeat]);

  // Auto advance for images
  useEffect(() => {
    if (!open || !isPlaying || isVideo) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + (100 / (duration * 10));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, isPlaying, isVideo, duration, goToNext]);

  // Handle video end
  useEffect(() => {
    if (videoRef.current && isVideo) {
      videoRef.current.muted = isMuted;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVideo, isPlaying, isMuted, currentIndex]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  // Controls visibility
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'ArrowLeft':
          goToPrev();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          setIsMuted(!isMuted);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, goToNext, goToPrev, isPlaying, toggleFullscreen, isMuted]);

  if (!open || items.length === 0) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onMouseMove={handleMouseMove}
    >
      {/* Main content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full flex items-center justify-center"
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentItem.url}
              className="max-w-full max-h-full object-contain"
              autoPlay
              muted={isMuted}
              onEnded={goToNext}
            />
          ) : (
            <img
              src={currentItem.url}
              alt={currentItem.name}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress bar (for images) */}
      {!isVideo && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <motion.div
            className="h-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top gradient */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
            
            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Top controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-4">
                <span className="text-white font-medium">{currentItem.name}</span>
                <span className="text-white/60 text-sm">
                  {currentIndex + 1} / {items.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
              <div className="flex items-center gap-3 px-6 py-3 bg-black/50 backdrop-blur-lg rounded-full">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={cn(
                    "text-white hover:bg-white/20",
                    isShuffle && "text-primary"
                  )}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrev}
                  className="text-white hover:bg-white/20"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:bg-white/20 w-12 h-12"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="text-white hover:bg-white/20"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={cn(
                    "text-white hover:bg-white/20",
                    isRepeat && "text-primary"
                  )}
                >
                  <Repeat className="w-4 h-4" />
                </Button>

                <div className="w-px h-6 bg-white/20 mx-2" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/60" />
                  <span className="text-white text-sm w-6">{duration}s</span>
                  <Slider
                    value={[duration]}
                    min={2}
                    max={15}
                    step={1}
                    onValueChange={([v]) => setDuration(v)}
                    className="w-20"
                  />
                </div>
              </div>
            </div>

            {/* Thumbnails strip */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-lg max-w-[90vw] overflow-x-auto">
                {items.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((item, idx) => {
                  const actualIndex = Math.max(0, currentIndex - 3) + idx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentIndex(actualIndex)}
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded overflow-hidden transition-all",
                        actualIndex === currentIndex 
                          ? "ring-2 ring-primary scale-110" 
                          : "opacity-60 hover:opacity-100"
                      )}
                    >
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
