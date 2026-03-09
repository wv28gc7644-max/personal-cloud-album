import { memo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  ZoomIn, ZoomOut, RotateCw, Download, ExternalLink,
  ChevronLeft, ChevronRight, Image, Film
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { OSWindowData } from '@/types/os';

interface MediaViewerProps {
  data?: OSWindowData;
}

export const MediaViewer = memo(({ data }: MediaViewerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isVideo = data?.fileType === 'video';
  const isImage = data?.fileType === 'image';
  const isAudio = data?.fileType === 'audio';
  const mediaUrl = data?.fileUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    
    const vol = value[0];
    video.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetView = () => { setZoom(1); setRotation(0); };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    if (!mediaUrl) return;
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = data?.fileName || 'download';
    link.click();
  };

  const handleOpenExternal = () => {
    if (mediaUrl) window.open(mediaUrl, '_blank');
  };

  if (!data || !mediaUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground space-y-3">
          <Image className="w-16 h-16 mx-auto opacity-30" />
          <p className="text-sm">Aucun fichier sélectionné</p>
          <p className="text-xs">Ouvrez un fichier depuis le Finder</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-black/95"
    >
      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {isVideo || isAudio ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="max-w-full max-h-full object-contain"
            onClick={togglePlay}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-out'
            }}
          />
        ) : isImage ? (
          <motion.img
            src={mediaUrl}
            alt={data.fileName || 'Image'}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-out'
            }}
            draggable={false}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          />
        ) : null}

        {/* Play button overlay for video */}
        {(isVideo || isAudio) && !isPlaying && (
          <motion.button
            className="absolute inset-0 flex items-center justify-center bg-black/30"
            onClick={togglePlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
          </motion.button>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-black/80 backdrop-blur-sm border-t border-white/10">
        {/* Video/Audio progress bar */}
        {(isVideo || isAudio) && (
          <div className="px-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span>{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Media type indicator */}
            <div className="flex items-center gap-2 pr-3 border-r border-white/20 mr-2">
              {isVideo && <Film className="w-4 h-4 text-white/60" />}
              {isImage && <Image className="w-4 h-4 text-white/60" />}
              <span className="text-xs text-white/60 max-w-[150px] truncate">
                {data.fileName}
              </span>
            </div>

            {/* Play/Pause for video */}
            {(isVideo || isAudio) && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/10"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/10"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Zoom controls */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-white/60 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            {/* Rotate */}
            {isImage && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/10"
                onClick={handleRotate}
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            )}

            <div className="w-px h-4 bg-white/20 mx-1" />

            {/* Download */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
            </Button>

            {/* Open external */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={handleOpenExternal}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>

            {/* Fullscreen */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
MediaViewer.displayName = 'MediaViewer';
