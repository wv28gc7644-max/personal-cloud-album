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

// Format duration with hours:minutes:seconds (and days if needed)
const formatDuration = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}j ${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
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
  const [isHovering, setIsHovering] = useState(false);

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

  // Generate smooth SVG path for heatmap curve (YouTube style)
  const generateHeatmapPath = useCallback((width: number, height: number): string => {
    if (!heatmapData || heatmapData.length === 0) return '';
    
    const segmentWidth = width / heatmapData.length;
    const points: { x: number; y: number }[] = [];
    
    heatmapData.forEach((value, i) => {
      points.push({
        x: i * segmentWidth + segmentWidth / 2,
        y: height - (value * height * 0.9) - 2 // Leave some padding
      });
    });

    if (points.length === 0) return '';

    // Create smooth bezier curve
    let path = `M 0 ${height} L ${points[0].x} ${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      
      path += ` Q ${p0.x} ${p0.y}, ${midX} ${(p0.y + p1.y) / 2}`;
    }
    
    const lastPoint = points[points.length - 1];
    path += ` L ${lastPoint.x} ${lastPoint.y} L ${width} ${height} Z`;
    
    return path;
  }, [heatmapData]);

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

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredTime(null);
    setIsDragging(false);
    setIsHovering(false);
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

  const containerWidth = progressRef.current?.clientWidth || 400;

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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* YouTube-style heatmap curve ABOVE the progress bar */}
      {heatmapData && (
        <div 
          className={cn(
            "absolute bottom-full left-0 right-0 h-8 mb-1 pointer-events-none transition-opacity duration-200",
            isHovering ? "opacity-100" : "opacity-0"
          )}
        >
          <svg 
            className="w-full h-full" 
            preserveAspectRatio="none"
            viewBox={`0 0 ${containerWidth} 32`}
          >
            <defs>
              <linearGradient id="heatGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground) / 0.2)" />
                <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
              </linearGradient>
            </defs>
            <path 
              d={generateHeatmapPath(containerWidth, 32)} 
              fill="url(#heatGradient)"
              className="transition-all duration-300"
            />
          </svg>
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
          className="absolute bottom-full mb-10 px-2 py-1 bg-black/90 text-white text-xs rounded pointer-events-none whitespace-nowrap z-10"
          style={{
            left: Math.min(Math.max(hoverX, 30), progressRef.current?.clientWidth ? progressRef.current.clientWidth - 30 : 100),
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-medium">{formatDuration(hoveredTime)}</span>
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
