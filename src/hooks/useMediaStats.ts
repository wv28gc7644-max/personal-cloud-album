import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MediaStats } from '@/types/media';

interface MediaStatsStore {
  stats: Record<string, MediaStats>;
  
  // Actions
  recordView: (mediaId: string) => void;
  recordWatchTime: (mediaId: string, seconds: number) => void;
  recordVideoSegment: (mediaId: string, start: number, end: number) => void;
  getStats: (mediaId: string) => MediaStats | undefined;
  getAllStats: () => MediaStats[];
  getMostViewed: (limit?: number) => MediaStats[];
  getTotalWatchTime: () => number;
  clearStats: () => void;
}

const createEmptyStats = (mediaId: string): MediaStats => ({
  mediaId,
  viewCount: 0,
  totalWatchTime: 0,
  lastViewed: new Date(),
  segments: [],
});

export const useMediaStats = create<MediaStatsStore>()(
  persist(
    (set, get) => ({
      stats: {},

      recordView: (mediaId) => {
        set((state) => {
          const existing = state.stats[mediaId] || createEmptyStats(mediaId);
          return {
            stats: {
              ...state.stats,
              [mediaId]: {
                ...existing,
                viewCount: existing.viewCount + 1,
                lastViewed: new Date(),
              },
            },
          };
        });
      },

      recordWatchTime: (mediaId, seconds) => {
        set((state) => {
          const existing = state.stats[mediaId] || createEmptyStats(mediaId);
          return {
            stats: {
              ...state.stats,
              [mediaId]: {
                ...existing,
                totalWatchTime: existing.totalWatchTime + seconds,
                lastViewed: new Date(),
              },
            },
          };
        });
      },

      recordVideoSegment: (mediaId, start, end) => {
        set((state) => {
          const existing = state.stats[mediaId] || createEmptyStats(mediaId);
          const segments = existing.segments || [];
          
          // Find if there's an overlapping segment
          const bucketSize = 5; // 5 second buckets
          const bucketStart = Math.floor(start / bucketSize) * bucketSize;
          const bucketEnd = Math.ceil(end / bucketSize) * bucketSize;
          
          const existingSegment = segments.find(
            (s) => s.start === bucketStart && s.end === bucketEnd
          );
          
          let updatedSegments;
          if (existingSegment) {
            updatedSegments = segments.map((s) =>
              s.start === bucketStart && s.end === bucketEnd
                ? { ...s, views: s.views + 1 }
                : s
            );
          } else {
            updatedSegments = [...segments, { start: bucketStart, end: bucketEnd, views: 1 }];
          }
          
          return {
            stats: {
              ...state.stats,
              [mediaId]: {
                ...existing,
                segments: updatedSegments,
                lastViewed: new Date(),
              },
            },
          };
        });
      },

      getStats: (mediaId) => get().stats[mediaId],

      getAllStats: () => Object.values(get().stats),

      getMostViewed: (limit = 10) => {
        return Object.values(get().stats)
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, limit);
      },

      getTotalWatchTime: () => {
        return Object.values(get().stats).reduce(
          (total, stat) => total + stat.totalWatchTime,
          0
        );
      },

      clearStats: () => set({ stats: {} }),
    }),
    {
      name: 'mediavault-stats',
    }
  )
);
