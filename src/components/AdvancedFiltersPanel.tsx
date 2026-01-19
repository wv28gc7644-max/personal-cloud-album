import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters';
import { useMediaStore } from '@/hooks/useMediaStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Filter, 
  X, 
  Image, 
  Video, 
  Calendar as CalendarIcon,
  HardDrive,
  Clock,
  Tag,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AdvancedFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedFiltersPanel({ isOpen, onClose }: AdvancedFiltersPanelProps) {
  const { 
    filters, 
    setTypeFilter, 
    setDateRange, 
    setSizeRange, 
    setDurationRange,
    setTagFilter,
    setHasNoTags,
    clearFilters,
    isActive
  } = useAdvancedFilters();
  const { tags } = useMediaStore();

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-b border-border bg-card/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <span className="font-semibold">Filtres avancés</span>
                {isActive && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                    Actif
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isActive && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                    <XCircle className="w-4 h-4" />
                    Réinitialiser
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Type filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Type de média
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.types.includes('image') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newTypes = filters.types.includes('image')
                        ? filters.types.filter(t => t !== 'image')
                        : [...filters.types, 'image' as const];
                      setTypeFilter(newTypes);
                    }}
                    className="gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Photos
                  </Button>
                  <Button
                    variant={filters.types.includes('video') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newTypes = filters.types.includes('video')
                        ? filters.types.filter(t => t !== 'video')
                        : [...filters.types, 'video' as const];
                      setTypeFilter(newTypes);
                    }}
                    className="gap-2"
                  >
                    <Video className="w-4 h-4" />
                    Vidéos
                  </Button>
                </div>
              </div>

              {/* Date filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Période
                </Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start">
                        {filters.dateRange.from 
                          ? format(filters.dateRange.from, 'dd/MM/yy', { locale: fr })
                          : 'Du...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from || undefined}
                        onSelect={(date) => setDateRange(date || null, filters.dateRange.to)}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 justify-start">
                        {filters.dateRange.to 
                          ? format(filters.dateRange.to, 'dd/MM/yy', { locale: fr })
                          : 'Au...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to || undefined}
                        onSelect={(date) => setDateRange(filters.dateRange.from, date || null)}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Size filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Taille ({formatSize(filters.sizeRange.min || 0)} - {formatSize(filters.sizeRange.max || 100 * 1024 * 1024)})
                </Label>
                <Slider
                  value={[
                    filters.sizeRange.min || 0,
                    filters.sizeRange.max || 100 * 1024 * 1024
                  ]}
                  min={0}
                  max={100 * 1024 * 1024}
                  step={1024 * 1024}
                  onValueChange={([min, max]) => setSizeRange(min, max)}
                />
              </div>

              {/* Duration filter (videos) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Durée ({formatDuration(filters.durationRange.min || 0)} - {formatDuration(filters.durationRange.max || 3600)})
                </Label>
                <Slider
                  value={[
                    filters.durationRange.min || 0,
                    filters.durationRange.max || 3600
                  ]}
                  min={0}
                  max={3600}
                  step={10}
                  onValueChange={([min, max]) => setDurationRange(min, max)}
                />
              </div>
            </div>

            {/* Tags filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Button
                    key={tag.id}
                    variant={filters.tagIds.includes(tag.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newTags = filters.tagIds.includes(tag.id)
                        ? filters.tagIds.filter(t => t !== tag.id)
                        : [...filters.tagIds, tag.id];
                      setTagFilter(newTags);
                    }}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mr-2",
                      `bg-${tag.color}-500`
                    )} />
                    {tag.name}
                  </Button>
                ))}
                <div className="flex items-center gap-2 px-3 py-1 border border-border rounded-md">
                  <Checkbox
                    id="no-tags"
                    checked={filters.hasNoTags}
                    onCheckedChange={(checked) => setHasNoTags(!!checked)}
                  />
                  <Label htmlFor="no-tags" className="text-sm cursor-pointer">
                    Sans tags uniquement
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
