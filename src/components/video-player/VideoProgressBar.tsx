import { useRef, useState, useMemo, useCallback } from 'react';
import { MediaStats } from '@/types/media';
import { cn } from '@/lib/utils';

interface VideoProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  stats?: MediaStats;
  onSeek: (time: number) => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function VideoProgressBar({
  currentTime,
  duration,
  buffered,
  stats,
  onSeek,
  className,
}: VideoProgressBarProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    if (!stats?.segments || stats.segments.length === 0 || duration === 0) {
      return null;
    }

    const bucketSize = 5;
    const bucketCount = Math.ceil(duration / bucketSize);
    const buckets = new Array(bucketCount).fill(0);

    stats.segments.forEach(segment => {
      const startBucket = Math.floor(segment.start / bucketSize);
      const endBucket = Math.min(Math.floor(segment.end / bucketSize), bucketCount - 1);
      
      for (let i = startBucket; i <= endBucket; i++) {
        buckets[i] += segment.views;
      }
    });

    const max = Math.max(...buckets, 1);
    return buckets.map(v => v / max);
  }, [stats, duration]);

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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || duration === 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const time = percent * duration;
    
    setHoveredTime(time);
    setHoverX(x);

    if (isDragging) {
      onSeek(time);
    }
  }, [duration, isDragging, onSeek]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || duration === 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = Math.max(0, Math.min(percent * duration, duration));
    
    setIsDragging(true);
    onSeek(time);
  }, [duration, onSeek]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredTime(null);
    setIsDragging(false);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  // Get views for hovered segment
  const hoveredViews = useMemo(() => {
    if (hoveredTime === null || !stats?.segments) return 0;
    const bucketSize = 5;
    const bucketIndex = Math.floor(hoveredTime / bucketSize);
    const segment = stats.segments.find(
      s => Math.floor(s.start / bucketSize) === bucketIndex
    );
    return segment?.views || 0;
  }, [hoveredTime, stats]);

  return (
    <div
      ref={progressRef}
      className={cn(
        "relative w-full h-3 group cursor-pointer",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Heatmap layer (background) */}
      {heatmapData && (
        <div className="absolute inset-0 flex rounded-full overflow-hidden opacity-60">
          {heatmapData.map((value, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: getHeatmapColor(value) }}
            />
          ))}
        </div>
      )}

      {/* Background track */}
      <div className="absolute inset-0 bg-white/30 rounded-full" />

      {/* Buffered */}
      <div
        className="absolute inset-y-0 left-0 bg-white/40 rounded-full transition-all"
        style={{ width: `${bufferedPercent}%` }}
      />

      {/* Progress */}
      <div
        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
        style={{ width: `${progressPercent}%` }}
      />

      {/* Hover indicator line */}
      {hoveredTime !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
          style={{ left: hoverX }}
        />
      )}

      {/* Progress handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `${progressPercent}%` }}
      />

      {/* Hover tooltip */}
      {hoveredTime !== null && (
        <div
          className="absolute bottom-full mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded pointer-events-none whitespace-nowrap z-10"
          style={{
            left: Math.min(Math.max(hoverX, 30), progressRef.current?.clientWidth ? progressRef.current.clientWidth - 30 : 100),
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-medium">{formatTime(hoveredTime)}</span>
            {hoveredViews > 0 && (
              <span className="text-white/70">
                {hoveredViews} vue{hoveredViews > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
