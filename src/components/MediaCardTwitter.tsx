import { useState, useRef } from 'react';
import { MediaItem } from '@/types/media';
import { TagBadge } from './TagBadge';
import { Heart, Share, Download, MoreHorizontal, Play, Eye, Trash2, Calendar, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCardSettings } from '@/hooks/useCardSettings';
import { useMediaStats } from '@/hooks/useMediaStats';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MediaCardTwitterProps {
  item: MediaItem;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onToggleFavorite?: () => void;
}

export const MediaCardTwitter = ({ 
  item, 
  onView, 
  onDownload, 
  onDelete,
  onToggleFavorite 
}: MediaCardTwitterProps) => {
  const [isLiked, setIsLiked] = useState(item.tags.some(t => t.name === 'Favoris'));
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { settings } = useCardSettings();
  const { getStats } = useMediaStats();
  
  const stats = getStats(item.id);
  const viewCount = stats?.viewCount || 0;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    onToggleFavorite?.();
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = !settings.videoHoverSound;
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

  const formattedDateTime = format(new Date(item.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr });
  const timeAgo = format(new Date(item.createdAt), "d MMM", { locale: fr });

  const renderHeader = () => (
    <div className="p-4 pb-3 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-sm">
        MV
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">MediaVault</span>
          <span className="text-muted-foreground text-sm">@mediavault</span>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-muted-foreground text-sm">{timeAgo}</span>
        </div>
        {settings.showTitle && (
          <p className="text-foreground mt-1 line-clamp-2">{item.name}</p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}>
            <Eye className="w-4 h-4 mr-2" />
            Voir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderMedia = () => (
    <div 
      className="relative aspect-video bg-black/20 cursor-pointer overflow-hidden"
      onClick={onView}
    >
      {item.type === 'video' && isHovered ? (
        <video
          ref={videoRef}
          src={item.url}
          className="w-full h-full object-cover"
          loop
          playsInline
          muted={!settings.videoHoverSound}
        />
      ) : (
        <img
          src={item.thumbnailUrl || item.url}
          alt={item.name}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            isHovered && "scale-105"
          )}
        />
      )}
      
      {/* Play overlay for videos */}
      {item.type === 'video' && !isVideoPlaying && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300",
          isHovered ? "opacity-0" : "opacity-100"
        )}>
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Tags overlay */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
        {item.tags.slice(0, 3).map((tag) => (
          <TagBadge key={tag.id} tag={tag} size="sm" />
        ))}
        {item.tags.length > 3 && (
          <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-xs text-white/80">
            +{item.tags.length - 3}
          </span>
        )}
      </div>

      {/* Duration for videos */}
      {item.type === 'video' && item.duration && (
        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-xs text-white font-medium">
          {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* View count badge */}
      {viewCount > 0 && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {viewCount}
        </div>
      )}
    </div>
  );

  const renderMetadata = () => (
    settings.showMetadata && (
      <div className="px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground border-b border-border/30">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formattedDateTime}
        </span>
        <span className="flex items-center gap-1">
          <HardDrive className="w-3.5 h-3.5" />
          {formatFileSize(item.size)}
        </span>
        <span className="uppercase font-medium text-primary/80">
          {item.type === 'image' ? 'Photo' : 'Vidéo'}
        </span>
      </div>
    )
  );

  const renderActions = () => (
    <div className="px-2 py-1 flex items-center justify-between">
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex-1 gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
        onClick={(e) => { e.stopPropagation(); onView(); }}
      >
        <Eye className="w-4 h-4" />
        {settings.showActionText && <span className="text-xs">Voir</span>}
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className={cn(
          "flex-1 gap-2 transition-colors",
          isLiked 
            ? "text-red-500 hover:text-red-600 hover:bg-red-500/10" 
            : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
        )}
        onClick={handleLike}
      >
        <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
        {settings.showActionText && <span className="text-xs">{isLiked ? 'Favori' : 'J\'aime'}</span>}
      </Button>

      <Button 
        variant="ghost" 
        size="sm" 
        className="flex-1 gap-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
        onClick={(e) => { e.stopPropagation(); onDownload(); }}
      >
        <Download className="w-4 h-4" />
      </Button>

      <Button 
        variant="ghost" 
        size="sm" 
        className="flex-1 gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
      >
        <Share className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <article 
      className="group bg-card border border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {settings.layoutOrder === 'header-first' ? (
        <>
          {renderHeader()}
          {renderMedia()}
          {renderMetadata()}
          {renderActions()}
        </>
      ) : (
        <>
          {renderMedia()}
          {renderHeader()}
          {renderMetadata()}
          {renderActions()}
        </>
      )}
    </article>
  );
};
