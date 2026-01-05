import { useState } from 'react';
import { Play, Download, MoreVertical, Trash2, Tag as TagIcon } from 'lucide-react';
import { MediaItem } from '@/types/media';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TagBadge } from './TagBadge';

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
  onDelete: () => void;
  onDownload: () => void;
  viewMode: 'grid' | 'grid-large' | 'list';
}

export function MediaCard({ item, onClick, onDelete, onDownload, viewMode }: MediaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (viewMode === 'list') {
    return (
      <div
        className="flex items-center gap-4 p-3 rounded-lg bg-card/50 hover:bg-card transition-colors cursor-pointer group"
        onClick={onClick}
      >
        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
          <img
            src={item.thumbnailUrl || item.url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          {item.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              <Play className="w-6 h-6 text-foreground fill-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {item.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{item.tags.length - 3}</span>
            )}
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {formatSize(item.size)}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onDownload(); }}>
            <Download className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden bg-card cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02]",
        viewMode === 'grid-large' ? 'aspect-[4/3]' : 'aspect-square'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image */}
      <div className="absolute inset-0">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        <img
          src={item.thumbnailUrl || item.url}
          alt={item.name}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            isHovered && "scale-110",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Video indicator */}
      {item.type === 'video' && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-70"
        )}>
          <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
            <Play className="w-8 h-8 text-primary fill-primary ml-1" />
          </div>
          {item.duration && (
            <span className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/80 text-xs font-medium">
              {formatDuration(item.duration)}
            </span>
          )}
        </div>
      )}

      {/* Gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent transition-opacity duration-300",
        isHovered ? "opacity-100" : "opacity-60"
      )} />

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="font-medium text-foreground truncate mb-2">{item.name}</h3>
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag.id} tag={tag} size="sm" />
          ))}
          {item.tags.length > 3 && (
            <span className="text-xs text-muted-foreground px-2 py-0.5">
              +{item.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={cn(
        "absolute top-3 right-3 flex gap-1 transition-all duration-300",
        isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
        >
          <Download className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="glass" size="icon-sm" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
