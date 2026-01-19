import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MediaItem } from '@/types/media';
import { MediaCardTwitter } from './MediaCardTwitter';
import { MediaCardMinimal } from './MediaCardMinimal';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineViewProps {
  media: MediaItem[];
  viewMode: 'grid' | 'media-only';
  onView: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
  onToggleFavorite: (item: MediaItem) => void;
}

interface GroupedMedia {
  month: Date;
  label: string;
  items: MediaItem[];
}

export function TimelineView({ 
  media, 
  viewMode, 
  onView, 
  onDelete, 
  onDownload, 
  onToggleFavorite 
}: TimelineViewProps) {
  const groupedMedia = useMemo(() => {
    const groups: GroupedMedia[] = [];
    const sorted = [...media].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sorted.forEach(item => {
      const itemDate = new Date(item.createdAt);
      const monthStart = startOfMonth(itemDate);
      
      let group = groups.find(g => isSameMonth(g.month, monthStart));
      if (!group) {
        group = {
          month: monthStart,
          label: format(monthStart, 'MMMM yyyy', { locale: fr }),
          items: []
        };
        groups.push(group);
      }
      group.items.push(item);
    });

    return groups;
  }, [media]);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Timeline vide</h3>
        <p className="text-muted-foreground">Aucun média à afficher</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

      <div className="space-y-8 pl-16 pr-6 py-6">
        {groupedMedia.map((group, groupIndex) => (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            {/* Month header */}
            <div className="relative flex items-center gap-4 mb-4">
              {/* Timeline dot */}
              <div className="absolute -left-[3.5rem] w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/30" />
              
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold capitalize">{group.label}</h2>
                <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                  {group.items.length} média{group.items.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Media grid */}
            <div className={cn(
              "grid gap-4",
              viewMode === 'media-only' 
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}>
              {group.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {viewMode === 'media-only' ? (
                    <MediaCardMinimal
                      item={item}
                      onView={() => onView(item)}
                    />
                  ) : (
                    <MediaCardTwitter
                      item={item}
                      onView={() => onView(item)}
                      onDelete={() => onDelete(item)}
                      onDownload={() => onDownload(item)}
                      onToggleFavorite={() => onToggleFavorite(item)}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
