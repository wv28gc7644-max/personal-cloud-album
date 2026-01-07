import { useMemo, useState, useRef } from 'react';
import { MediaStats } from '@/types/media';
import { cn } from '@/lib/utils';

interface VideoHeatmapInteractiveProps {
  stats: MediaStats | undefined;
  duration: number;
  height?: number;
  className?: string;
  onSeek?: (time: number) => void;
}

export const VideoHeatmapInteractive = ({ 
  stats, 
  duration, 
  height = 12, 
  className = '',
  onSeek 
}: VideoHeatmapInteractiveProps) => {
  const [hoveredSegment, setHoveredSegment] = useState<{ index: number; x: number; views: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { heatmapData, maxViews } = useMemo(() => {
    if (!stats?.segments || stats.segments.length === 0 || duration === 0) {
      return { heatmapData: null, maxViews: 0 };
    }

    // Create buckets of 5 seconds each
    const bucketSize = 5;
    const bucketCount = Math.ceil(duration / bucketSize);
    const buckets = new Array(bucketCount).fill(0);

    // Fill buckets with view counts
    stats.segments.forEach(segment => {
      const startBucket = Math.floor(segment.start / bucketSize);
      const endBucket = Math.min(Math.floor(segment.end / bucketSize), bucketCount - 1);
      
      for (let i = startBucket; i <= endBucket; i++) {
        buckets[i] += segment.views;
      }
    });

    const max = Math.max(...buckets, 1);
    const normalized = buckets.map(v => ({ raw: v, normalized: v / max }));
    
    return { heatmapData: normalized, maxViews: max };
  }, [stats, duration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHeatmapColor = (value: number): string => {
    // Blue (cold) -> Yellow -> Orange -> Red (hot)
    if (value < 0.25) {
      return `hsl(210, 70%, ${50 + value * 40}%)`;
    } else if (value < 0.5) {
      const t = (value - 0.25) / 0.25;
      return `hsl(${210 - t * 170}, 80%, ${60 + t * 10}%)`;
    } else if (value < 0.75) {
      const t = (value - 0.5) / 0.25;
      return `hsl(${40 - t * 20}, 85%, ${70 - t * 10}%)`;
    } else {
      const t = (value - 0.75) / 0.25;
      return `hsl(${20 - t * 20}, 90%, ${60 - t * 15}%)`;
    }
  };

  const handleMouseMove = (e: React.MouseEvent, index: number, views: number) => {
    if (!containerRef.current || !heatmapData) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const bucketSize = 5;
    const time = index * bucketSize + bucketSize / 2;
    
    setHoveredSegment({ index, x, views, time });
  };

  const handleClick = (index: number) => {
    if (onSeek) {
      const bucketSize = 5;
      const time = index * bucketSize;
      onSeek(time);
    }
  };

  if (!heatmapData) {
    return (
      <div 
        className={cn("w-full bg-muted/50 rounded", className)}
        style={{ height }}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full rounded overflow-hidden cursor-pointer", className)}
      style={{ height }}
      onMouseLeave={() => setHoveredSegment(null)}
    >
      {/* Heatmap bars */}
      <div className="flex w-full h-full gap-px">
        {heatmapData.map((bucket, i) => (
          <div
            key={i}
            className="flex-1 transition-all duration-150 hover:scale-y-110"
            style={{
              backgroundColor: getHeatmapColor(bucket.normalized),
              opacity: 0.5 + bucket.normalized * 0.5,
            }}
            onMouseMove={(e) => handleMouseMove(e, i, bucket.raw)}
            onClick={() => handleClick(i)}
          />
        ))}
      </div>

      {/* Tooltip */}
      {hoveredSegment && (
        <div 
          className="absolute bottom-full mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border pointer-events-none z-50 whitespace-nowrap"
          style={{
            left: `${Math.min(Math.max(hoveredSegment.x, 40), containerRef.current?.clientWidth ? containerRef.current.clientWidth - 40 : 100)}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-medium">{formatTime(hoveredSegment.time)}</span>
            <span className="text-muted-foreground">
              {hoveredSegment.views} vue{hoveredSegment.views > 1 ? 's' : ''}
            </span>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-popover" />
          </div>
        </div>
      )}
    </div>
  );
};

// Overlay version that sits on top of video controls
export const VideoHeatmapOverlay = ({ 
  stats, 
  duration, 
  className = '',
  onSeek 
}: Omit<VideoHeatmapInteractiveProps, 'height'>) => {
  return (
    <div className={cn("absolute bottom-12 left-0 right-0 px-2", className)}>
      <VideoHeatmapInteractive 
        stats={stats} 
        duration={duration} 
        height={8}
        onSeek={onSeek}
        className="rounded-full"
      />
    </div>
  );
};
