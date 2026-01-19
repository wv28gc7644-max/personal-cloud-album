import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { MediaItem } from '@/types/media';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Image, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface CalendarViewProps {
  media: MediaItem[];
  onView: (item: MediaItem) => void;
}

export function CalendarView({ media, onView }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const mediaByDate = useMemo(() => {
    const map = new Map<string, MediaItem[]>();
    media.forEach(item => {
      const dateKey = format(new Date(item.createdAt), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, item]);
    });
    return map;
  }, [media]);

  const selectedDayMedia = useMemo(() => {
    if (!selectedDay) return [];
    const dateKey = format(selectedDay, 'yyyy-MM-dd');
    return mediaByDate.get(dateKey) || [];
  }, [selectedDay, mediaByDate]);

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Aujourd'hui
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Days */}
          {days.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayMedia = mediaByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const hasMedia = dayMedia.length > 0;
            const imageCount = dayMedia.filter(m => m.type === 'image').length;
            const videoCount = dayMedia.filter(m => m.type === 'video').length;

            return (
              <motion.button
                key={dateKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.01 }}
                onClick={() => hasMedia && setSelectedDay(day)}
                disabled={!hasMedia}
                className={cn(
                  "relative aspect-square p-1 rounded-lg transition-all",
                  isCurrentMonth ? "bg-card" : "bg-muted/30",
                  isToday && "ring-2 ring-primary",
                  hasMedia && "hover:bg-primary/10 cursor-pointer",
                  !hasMedia && "opacity-50"
                )}
              >
                <div className={cn(
                  "text-sm font-medium",
                  !isCurrentMonth && "text-muted-foreground",
                  isToday && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>

                {hasMedia && (
                  <div className="absolute inset-0 p-1 pt-6 overflow-hidden">
                    {/* Thumbnail preview */}
                    {dayMedia[0] && (
                      <div className="w-full h-full rounded overflow-hidden">
                        <img
                          src={dayMedia[0].thumbnailUrl || dayMedia[0].url}
                          alt=""
                          className="w-full h-full object-cover opacity-50"
                        />
                      </div>
                    )}
                    {/* Count badge */}
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                      {imageCount > 0 && (
                        <span className="flex items-center gap-0.5 px-1 py-0.5 bg-blue-500/80 rounded text-[10px] text-white">
                          <Image className="w-2.5 h-2.5" />
                          {imageCount}
                        </span>
                      )}
                      {videoCount > 0 && (
                        <span className="flex items-center gap-0.5 px-1 py-0.5 bg-purple-500/80 rounded text-[10px] text-white">
                          <Video className="w-2.5 h-2.5" />
                          {videoCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Day detail modal */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">
              {selectedDay && format(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}
            </h3>
            <span className="text-muted-foreground">
              {selectedDayMedia.length} média{selectedDayMedia.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto max-h-[60vh] pr-2">
            <AnimatePresence>
              {selectedDayMedia.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => {
                    setSelectedDay(null);
                    onView(item);
                  }}
                  className="relative aspect-square rounded-lg overflow-hidden group"
                >
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-xs truncate">{item.name}</p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
