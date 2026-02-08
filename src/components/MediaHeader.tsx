import { useState } from 'react';
import { Search, Upload, Grid3X3, LayoutGrid, List, LayoutPanelTop, Play, ArrowUpDown, Image, FolderSearch, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ViewMode, SortOption } from '@/types/media';
import { useMediaStore } from '@/hooks/useMediaStore';
import { cn } from '@/lib/utils';
import { NotificationCenter } from './NotificationCenter';
import { UserMenu } from './UserMenu';
import { AIAssistant } from './AIAssistant';
import { EditableElement } from './EditableElement';
import { useGlobalEditorContext } from './GlobalEditorProvider';
import { FolderScanner } from './FolderScanner';

interface MediaHeaderProps {
  onUploadClick: () => void;
  onStartSlideshow?: () => void;
}

export function MediaHeader({ onUploadClick, onStartSlideshow }: MediaHeaderProps) {
  const { viewMode, setViewMode, sortBy, setSortBy, searchQuery, setSearchQuery, getFilteredMedia } = useMediaStore();
  const { isEditMode } = useGlobalEditorContext();
  const filteredCount = getFilteredMedia().length;
  const [folderScannerOpen, setFolderScannerOpen] = useState(false);

  const viewModes: { mode: ViewMode; icon: typeof Grid3X3; label: string }[] = [
    { mode: 'grid', icon: Grid3X3, label: 'Grille' },
    { mode: 'grid-large', icon: LayoutGrid, label: 'Grande grille' },
    { mode: 'list', icon: List, label: 'Liste' },
    { mode: 'masonry', icon: LayoutPanelTop, label: 'Mosaïque' },
    { mode: 'media-only', icon: Image, label: 'Média seul' },
    { mode: 'adaptive', icon: LayoutDashboard, label: 'Adaptatif' },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'date-desc', label: 'Date (récent)' },
    { value: 'date-asc', label: 'Date (ancien)' },
    { value: 'name-asc', label: 'Nom (A-Z)' },
    { value: 'name-desc', label: 'Nom (Z-A)' },
    { value: 'size-desc', label: 'Taille (grand)' },
    { value: 'size-asc', label: 'Taille (petit)' },
    { value: 'type-image', label: 'Photos d\'abord' },
    { value: 'type-video', label: 'Vidéos d\'abord' },
  ];

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
      <EditableElement id="header-container" type="container" name="Header">
        <div className="flex items-center justify-between gap-4 p-4">
          {/* Search */}
          <EditableElement id="header-search" type="container" name="Recherche">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-transparent focus:border-primary"
              />
            </div>
          </EditableElement>

          {/* Stats */}
          <EditableElement id="header-stats" type="text" name="Compteur médias">
            <div className="text-sm text-muted-foreground">
              {filteredCount} médias
            </div>
          </EditableElement>

          {/* Sort */}
          <EditableElement id="header-sort" type="container" name="Tri">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-40">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditableElement>

          {/* View mode toggles */}
          <EditableElement id="header-view-modes" type="container" name="Modes de vue">
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
          </EditableElement>

          {/* Slideshow button */}
          {onStartSlideshow && (
            <EditableElement id="header-slideshow" type="button" name="Bouton Diaporama">
              <Button variant="outline" size="sm" onClick={onStartSlideshow} className="gap-2">
                <Play className="w-4 h-4" />
                Diaporama
              </Button>
            </EditableElement>
          )}

          {/* Notification Center */}
          <EditableElement id="header-notifications" type="icon" name="Notifications">
            <NotificationCenter />
          </EditableElement>

          {/* AI Assistant */}
          <EditableElement id="header-ai-assistant" type="icon" name="Assistant IA">
            <AIAssistant />
          </EditableElement>

          {/* User Menu */}
          <EditableElement id="header-user-menu" type="icon" name="Menu Utilisateur">
            <UserMenu />
          </EditableElement>

          {/* Link folder button */}
          <EditableElement id="header-link-folder" type="button" name="Lier un dossier">
            <Button variant="outline" onClick={() => setFolderScannerOpen(true)} className="gap-2">
              <FolderSearch className="w-4 h-4" />
              Lier un dossier
            </Button>
          </EditableElement>

          {/* Upload button */}
          <EditableElement id="header-upload" type="button" name="Bouton Ajouter">
            <Button onClick={onUploadClick} className="gap-2">
              <Upload className="w-4 h-4" />
              Ajouter
            </Button>
          </EditableElement>
        </div>
      </EditableElement>

      {/* Folder Scanner Dialog */}
      <FolderScanner open={folderScannerOpen} onClose={() => setFolderScannerOpen(false)} />
    </header>
  );
}