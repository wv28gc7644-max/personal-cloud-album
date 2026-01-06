import { useMemo } from 'react';
import { MediaStats } from '@/types/media';

interface VideoHeatmapProps {
  stats: MediaStats | undefined;
  duration: number;
  height?: number;
  className?: string;
}

export const VideoHeatmap = ({ stats, duration, height = 8, className = '' }: VideoHeatmapProps) => {
  const heatmapData = useMemo(() => {
    if (!stats?.segments || stats.segments.length === 0 || duration === 0) {
      return null;
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

    // Normalize values to 0-1
    const maxViews = Math.max(...buckets, 1);
    return buckets.map(v => v / maxViews);
  }, [stats, duration]);

  if (!heatmapData) {
    return null;
  }

  // Generate gradient stops for heatmap colors
  const getHeatmapColor = (value: number): string => {
    // Blue (cold) -> Yellow -> Red (hot)
    if (value < 0.33) {
      const t = value / 0.33;
      return `hsl(${210 - t * 30}, 80%, ${50 + t * 10}%)`;
    } else if (value < 0.66) {
      const t = (value - 0.33) / 0.33;
      return `hsl(${180 - t * 140}, 80%, ${60 + t * 10}%)`;
    } else {
      const t = (value - 0.66) / 0.34;
      return `hsl(${40 - t * 40}, ${80 + t * 20}%, ${70 - t * 20}%)`;
    }
  };

  return (
    <div 
      className={`w-full rounded overflow-hidden ${className}`}
      style={{ height }}
    >
      <svg width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`heatmap-${stats?.mediaId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {heatmapData.map((value, i) => (
              <stop 
                key={i}
                offset={`${(i / heatmapData.length) * 100}%`} 
                stopColor={getHeatmapColor(value)} 
              />
            ))}
          </linearGradient>
        </defs>
        <rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill={`url(#heatmap-${stats?.mediaId})`}
        />
      </svg>
    </div>
  );
};

// Mini heatmap for stats panel
export const MiniHeatmap = ({ stats, duration }: { stats: MediaStats | undefined; duration: number }) => {
  const buckets = useMemo(() => {
    if (!stats?.segments || stats.segments.length === 0 || duration === 0) {
      return new Array(20).fill(0);
    }

    const bucketSize = duration / 20;
    const result = new Array(20).fill(0);

    stats.segments.forEach(segment => {
      const startBucket = Math.floor(segment.start / bucketSize);
      const endBucket = Math.min(Math.floor(segment.end / bucketSize), 19);
      
      for (let i = startBucket; i <= endBucket; i++) {
        result[i] += segment.views;
      }
    });

    const max = Math.max(...result, 1);
    return result.map(v => v / max);
  }, [stats, duration]);

  return (
    <div className="flex gap-px h-4">
      {buckets.map((value, i) => (
        <div 
          key={i} 
          className="flex-1 rounded-sm transition-all"
          style={{ 
            height: `${Math.max(value * 100, 10)}%`,
            alignSelf: 'flex-end',
            backgroundColor: value > 0.66 
              ? 'hsl(0, 90%, 60%)' 
              : value > 0.33 
                ? 'hsl(40, 90%, 60%)'
                : 'hsl(210, 50%, 50%)',
            opacity: 0.3 + value * 0.7
          }}
        />
      ))}
    </div>
  );
};