import { useState, useRef } from 'react';
import { MediaItem } from '@/types/media';
import { Play, Eye, Link, Info } from 'lucide-react';
import { useCardSettings } from '@/hooks/useCardSettings';
import { useMediaStats } from '@/hooks/useMediaStats';
import { MediaInfoDialog } from './MediaInfoDialog';
import { cn } from '@/lib/utils';

interface MediaCardMinimalProps {
  item: MediaItem;
  onView: () => void;
}

export const MediaCardMinimal = ({ item, onView }: MediaCardMinimalProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { settings: basicSettings } = useCardSettings();
  const { getStats } = useMediaStats();
  
  const stats = getStats(item.id);
  const viewCount = stats?.viewCount || 0;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = !basicSettings.videoHoverSound;
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const getThumbnailUrl = () => {
    if (item.thumbnailUrl && item.thumbnailUrl !== item.url) {
      return item.thumbnailUrl;
    }
    if (item.type === 'video') {
      return undefined;
    }
    return item.url;
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <div 
      className="group relative cursor-pointer overflow-hidden rounded-lg bg-muted aspect-auto"
      onClick={onView}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item.type === 'video' ? (
        <>
          <video
            ref={videoRef}
            src={item.url}
            poster={thumbnailUrl}
            className={cn(
              "w-full h-auto object-cover transition-transform duration-500",
              isHovered && "scale-105"
            )}
            loop
            playsInline
            muted={!basicSettings.videoHoverSound}
            preload="metadata"
          />
          {!isVideoPlaying && thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={item.name}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-all duration-500",
                isHovered && "opacity-0"
              )}
            />
          )}
        </>
      ) : (
        <img
          src={item.url}
          alt={item.name}
          className={cn(
            "w-full h-auto object-cover transition-transform duration-500",
            isHovered && "scale-105"
          )}
        />
      )}
      
      {/* Play overlay for videos */}
      {item.type === 'video' && !isVideoPlaying && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-300",
          isHovered ? "opacity-0" : "opacity-100"
        )}>
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Duration badge */}
      {item.type === 'video' && item.duration && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-xs text-white font-medium">
          {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* View count badge */}
      {viewCount > 0 && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="w-3 h-3" />
          {viewCount}
        </div>
      )}

      {/* Linked file indicator */}
      {item.isLinked && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-primary/80 backdrop-blur-sm text-xs text-primary-foreground font-medium flex items-center gap-1" title={item.sourcePath || 'Fichier lié'}>
          <Link className="w-3 h-3" />
        </div>
      )}

      {/* Hover overlay with name */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
        <p className="text-white text-sm font-medium truncate">{item.name}</p>
      </div>
    </div>
  );
};
