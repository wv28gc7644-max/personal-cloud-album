import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, Download, Share, Eye, MoreHorizontal, Link, Info } from 'lucide-react';
import { MediaItem } from '@/types/media';
import { TagBadge } from './TagBadge';
import { Button } from '@/components/ui/button';
import { MediaInfoDialog } from './MediaInfoDialog';
import { cn } from '@/lib/utils';

interface MediaCardAdaptiveProps {
  item: MediaItem;
  onView: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onToggleFavorite?: () => void;
}

export function MediaCardAdaptive({
  item,
  onView,
  onDelete,
  onDownload,
  onToggleFavorite
}: MediaCardAdaptiveProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);

  const isFavorite = item.tags.some(t => t.name === 'Favoris');

  // Get natural aspect ratio for the media
  useEffect(() => {
    if (item.type === 'image') {
      const img = new Image();
      img.onload = () => {
        setNaturalRatio(img.width / img.height);
      };
      img.src = item.thumbnailUrl || item.url;
    } else if (item.type === 'video') {
      // For video, use 16:9 default or load from video element
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          setNaturalRatio(video.videoWidth / video.videoHeight);
        }
      };
      video.src = item.url;
    }
  }, [item]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic aspect ratio style
  const getAspectStyle = () => {
    if (!naturalRatio) return { aspectRatio: '16/9' };
    
    // Clamp ratio between reasonable bounds
    const clampedRatio = Math.max(0.5, Math.min(2, naturalRatio));
    return { aspectRatio: `${clampedRatio}` };
  };

  return (
    <motion.div
      className="group relative bg-card rounded-lg overflow-hidden border border-border/30 hover:border-border/60 transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
    >
      {/* Media container - adapts to natural ratio */}
      <div 
        className="relative w-full overflow-hidden cursor-pointer"
        style={getAspectStyle()}
        onClick={onView}
      >
        {item.type === 'image' ? (
          <img
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={item.thumbnailUrl || item.url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="relative w-full h-full">
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={item.url}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
            />
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
              </div>
            </div>
            {/* Duration */}
            {item.duration && (
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white font-medium">
                {formatDuration(item.duration)}
              </div>
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          {/* Quick actions */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex gap-1">
              {item.tags.slice(0, 2).map(tag => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
              >
                <Heart className={cn("w-4 h-4", isFavorite && "fill-current text-red-500")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white"
                onClick={(e) => { e.stopPropagation(); onDownload?.(); }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Linked file indicator */}
        {item.isLinked && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/80 backdrop-blur-sm text-xs text-primary-foreground font-medium flex items-center gap-1" title={item.sourcePath || 'Fichier lié'}>
            <Link className="w-3 h-3" />
            Lié
          </div>
        )}
      </div>

      {/* Compact info bar */}
      <div className="px-3 py-2 flex items-center justify-between">
        <p className="text-sm font-medium truncate flex-1 mr-2">{item.name}</p>
        <span className="text-xs text-muted-foreground uppercase">
          {item.type === 'video' ? 'Vidéo' : 'Photo'}
        </span>
      </div>
    </motion.div>
  );
}
