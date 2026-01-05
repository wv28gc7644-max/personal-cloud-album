import { Search, Upload, Grid3X3, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ViewMode } from '@/types/media';
import { useMediaStore } from '@/hooks/useMediaStore';
import { cn } from '@/lib/utils';

interface MediaHeaderProps {
  onUploadClick: () => void;
}

export function MediaHeader({ onUploadClick }: MediaHeaderProps) {
  const { viewMode, setViewMode, searchQuery, setSearchQuery, getFilteredMedia } = useMediaStore();
  const filteredCount = getFilteredMedia().length;

  const viewModes: { mode: ViewMode; icon: typeof Grid3X3; label: string }[] = [
    { mode: 'grid', icon: Grid3X3, label: 'Grille' },
    { mode: 'grid-large', icon: LayoutGrid, label: 'Grande grille' },
    { mode: 'list', icon: List, label: 'Liste' },
  ];

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between gap-4 p-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-transparent focus:border-primary"
          />
        </div>

        {/* Stats */}
        <div className="text-sm text-muted-foreground">
          {filteredCount} médias
        </div>

        {/* View mode toggles */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          {viewModes.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewMode(mode)}
              className={cn(
                "transition-colors",
                viewMode === mode && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
        </div>

        {/* Upload button */}
        <Button onClick={onUploadClick} className="gap-2">
          <Upload className="w-4 h-4" />
          Ajouter
        </Button>
      </div>
    </header>
  );
}
