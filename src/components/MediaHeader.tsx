import { useState } from 'react';
import { Search, Upload, Grid3X3, LayoutGrid, List, LayoutPanelTop, Play, ArrowUpDown, Image, FolderSearch, LayoutDashboard, Filter, FolderTree, X, SlidersHorizontal, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ViewMode, SortOption, SourceFilter } from '@/types/media';
import { useMediaStore } from '@/hooks/useMediaStore';
import { cn } from '@/lib/utils';
import { NotificationCenter } from './NotificationCenter';
import { UserMenu } from './UserMenu';
import { AIAssistant } from './AIAssistant';
import { EditableElement } from './EditableElement';
import { useGlobalEditorContext } from './GlobalEditorProvider';
import { FolderScanner } from './FolderScanner';
import { ThemeToggle } from './ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';

interface MediaHeaderProps {
  onUploadClick: () => void;
  onStartSlideshow?: () => void;
  onToggleSidebar?: () => void;
}

export function MediaHeader({ onUploadClick, onStartSlideshow, onToggleSidebar }: MediaHeaderProps) {
  const { viewMode, setViewMode, sortBy, setSortBy, searchQuery, setSearchQuery, sourceFilter, setSourceFilter, sourceFolderFilter, setSourceFolderFilter, getSourceFolders, getFilteredMedia } = useMediaStore();
  const { isEditMode } = useGlobalEditorContext();
  const isMobile = useIsMobile();
  const filteredMedia = getFilteredMedia();
  const filteredCount = filteredMedia.length;
  const localCount = filteredMedia.filter(m => !m.isLinked).length;
  const linkedCount = filteredMedia.filter(m => m.isLinked).length;
  const [folderScannerOpen, setFolderScannerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sourceFolders = getSourceFolders();

  // Auto-reset filter if folder no longer exists
  if (sourceFolderFilter && !sourceFolders.includes(sourceFolderFilter)) {
    setSourceFolderFilter(null);
  }

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

  const FiltersContent = () => (
    <div className="space-y-4">
      {/* Sort */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Tri</label>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full">
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
      </div>

      {/* Source filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Source</label>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
          <SelectTrigger className="w-full">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="local">Locaux</SelectItem>
            <SelectItem value="linked">Liés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Source folder filter */}
      {sourceFolders.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Dossier</label>
          <div className="flex items-center gap-1">
            <Select 
              value={sourceFolderFilter || '__all__'} 
              onValueChange={(v) => setSourceFolderFilter(v === '__all__' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <FolderTree className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tous les dossiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les dossiers</SelectItem>
                {sourceFolders.map((folder) => (
                  <SelectItem key={folder} value={folder}>
                    {folder.split(/[/\\]/).pop() || folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceFolderFilter && (
              <Button variant="ghost" size="icon-sm" onClick={() => setSourceFolderFilter(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* View modes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Affichage</label>
        <div className="grid grid-cols-3 gap-2">
          {viewModes.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(mode)}
              className={cn(
                "flex flex-col gap-1 h-auto py-2",
                viewMode === mode && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <header className="shrink-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
      <EditableElement id="header-container" type="container" name="Header">
        <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
          {/* Hamburger menu for mobile */}
          {onToggleSidebar && (
            <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden shrink-0">
              <Menu className="w-5 h-5" />
            </Button>
          )}

          {/* Search */}
          <EditableElement id="header-search" type="container" name="Recherche">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                placeholder={isMobile ? "Rechercher..." : "Rechercher par nom ou tag..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 bg-muted/50 border-transparent focus:border-primary"
              />
            </div>
          </EditableElement>

          {/* Stats - hidden on mobile */}
          <EditableElement id="header-stats" type="text" name="Compteur médias">
            <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
              <button
                onClick={() => setSourceFilter('all')}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-colors hover:text-foreground",
                  sourceFilter === 'all' && "bg-muted text-foreground font-medium"
                )}
              >
                {filteredCount} médias
              </button>
              <span className="text-border">·</span>
              <button
                onClick={() => setSourceFilter(sourceFilter === 'local' ? 'all' : 'local')}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors hover:text-foreground",
                  sourceFilter === 'local' && "bg-primary/15 text-primary font-medium"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {localCount} locaux
              </button>
              <span className="text-border">·</span>
              <button
                onClick={() => setSourceFilter(sourceFilter === 'linked' ? 'all' : 'linked')}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors hover:text-foreground",
                  sourceFilter === 'linked' && "bg-accent/15 text-accent font-medium"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                {linkedCount} liés
              </button>
            </div>
          </EditableElement>

          {/* Desktop filters - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            {/* Sort */}
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

            {/* Source filter */}
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="local">Locaux</SelectItem>
                <SelectItem value="linked">Liés</SelectItem>
              </SelectContent>
            </Select>

            {/* Source folder filter */}
            {sourceFolders.length > 0 && (
              <div className="flex items-center gap-1">
                <Select 
                  value={sourceFolderFilter || '__all__'} 
                  onValueChange={(v) => setSourceFolderFilter(v === '__all__' ? null : v)}
                >
                  <SelectTrigger className="w-44">
                    <FolderTree className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Tous les dossiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous les dossiers</SelectItem>
                    {sourceFolders.map((folder) => (
                      <SelectItem key={folder} value={folder}>
                        {folder.split(/[/\\]/).pop() || folder}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sourceFolderFilter && (
                  <Button variant="ghost" size="icon-sm" onClick={() => setSourceFolderFilter(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}

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

            {/* Slideshow button */}
            {onStartSlideshow && (
              <Button variant="outline" size="sm" onClick={onStartSlideshow} className="gap-2">
                <Play className="w-4 h-4" />
                Diaporama
              </Button>
            )}
          </div>

          {/* Mobile filters button */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filtres & Affichage</SheetTitle>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto">
                <FiltersContent />
                {/* Stats on mobile */}
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <span>{filteredCount} médias</span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {localCount} locaux
                  </span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {linkedCount} liés
                  </span>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification Center - hidden on mobile */}
          <div className="hidden sm:block">
            <NotificationCenter />
          </div>

          {/* AI Assistant - hidden on mobile */}
          <div className="hidden sm:block">
            <AIAssistant />
          </div>

          {/* User Menu */}
          <UserMenu />

          {/* Link folder button */}
          <Button variant="outline" size="icon" onClick={() => setFolderScannerOpen(true)} className="shrink-0" title="Lier un dossier">
            <FolderSearch className="w-4 h-4" />
          </Button>

          {/* Upload button */}
          <Button onClick={onUploadClick} size={isMobile ? "icon" : "default"} className={cn(!isMobile && "gap-2", "shrink-0")}>
            <Upload className="w-4 h-4" />
            {!isMobile && "Ajouter"}
          </Button>
        </div>
      </EditableElement>

      {/* Folder Scanner Dialog */}
      <FolderScanner open={folderScannerOpen} onClose={() => setFolderScannerOpen(false)} />
    </header>
  );
}
