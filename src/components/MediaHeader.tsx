import { useState } from 'react';
import { Search, Upload, Grid3X3, LayoutGrid, List, LayoutPanelTop, Play, ArrowUpDown, Image, FolderSearch, LayoutDashboard, Filter, FolderTree, X, Trash2, Settings2, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { getLocalServerUrl } from '@/utils/localServerUrl';
import { safeGetLocalStorage, safeSetLocalStorage } from '@/utils/safeLocalStorage';
import { toast } from 'sonner';

interface MediaHeaderProps {
  onUploadClick: () => void;
  onStartSlideshow?: () => void;
}

export function MediaHeader({ onUploadClick, onStartSlideshow }: MediaHeaderProps) {
  const { viewMode, setViewMode, sortBy, setSortBy, searchQuery, setSearchQuery, sourceFilter, setSourceFilter, sourceFolderFilter, setSourceFolderFilter, getSourceFolders, getFilteredMedia, removeMediaByFolder } = useMediaStore();
  const { isEditMode } = useGlobalEditorContext();
  const filteredMedia = getFilteredMedia();
  const filteredCount = filteredMedia.length;
  const localCount = filteredMedia.filter(m => !m.isLinked).length;
  const linkedCount = filteredMedia.filter(m => m.isLinked).length;
  const [folderScannerOpen, setFolderScannerOpen] = useState(false);
  const sourceFolders = getSourceFolders();

  // Auto-reset filter if folder no longer exists
  if (sourceFolderFilter && !sourceFolders.includes(sourceFolderFilter)) {
    setSourceFolderFilter(null);
  }

  const HISTORY_KEY = 'mediavault-folder-history';

  const handleUnlinkFolder = async (folder: string) => {
    const storeState = useMediaStore.getState();
    const mediaBefore = storeState.media.length;
    
    console.log('[UNLINK] folder value:', JSON.stringify(folder));
    console.log('[UNLINK] media count before:', mediaBefore);
    console.log('[UNLINK] all linked media:', storeState.media.filter(m => m.isLinked).map(m => ({
      id: m.id, name: m.name, sourceFolder: m.sourceFolder, sourcePath: m.sourcePath, isLinked: m.isLinked, url: m.url?.substring(0, 80)
    })));
    
    // Remove media from store (multi-criteria matching)
    removeMediaByFolder(folder);
    
    const mediaAfter = useMediaStore.getState().media.length;
    const removedCount = mediaBefore - mediaAfter;
    console.log('[UNLINK] media count after:', mediaAfter, 'removed:', removedCount);

    // Remove from localStorage history
    const history = safeGetLocalStorage<any[]>(HISTORY_KEY, []).filter((h: any) => h.path !== folder);
    safeSetLocalStorage(HISTORY_KEY, history);
    // Remove from server
    try {
      const serverUrl = getLocalServerUrl();
      await fetch(`${serverUrl}/api/linked-folders`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folder, id: folder }),
      });
    } catch (e) {
      // Server may not be running
    }
    
    const folderName = folder.split(/[/\\]/).pop() || folder;
    if (removedCount > 0) {
      toast.success(`${removedCount} média(s) supprimé(s) du dossier "${folderName}"`);
    } else {
      toast.warning(`Dossier "${folderName}" délié mais aucun média trouvé à supprimer`);
    }
  };
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
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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

          {/* Source filter */}
          <EditableElement id="header-source-filter" type="container" name="Filtre source">
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
          </EditableElement>

          {/* Source folder filter */}
          {sourceFolders.length > 0 && (
            <EditableElement id="header-folder-filter" type="container" name="Filtre dossier">
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
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSourceFolderFilter(null)}
                      title="Effacer le filtre dossier"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleUnlinkFolder(sourceFolderFilter)}
                      title="Délier ce dossier et supprimer ses médias"
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                {/* Bouton aide */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      <p className="font-medium mb-1">Comment gérer les dossiers liés ?</p>
                      <p>Cliquez ⚙️ pour voir tous les dossiers liés, puis 🗑️ pour retirer un dossier et ses médias de la galerie.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* Popover de gestion des dossiers liés */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon-sm" title="Gérer les dossiers liés">
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Dossiers liés</h4>
                      {sourceFolders.length === 0 && (
                        <p className="text-xs text-muted-foreground">Aucun dossier lié</p>
                      )}
                      {sourceFolders.map((folder) => (
                        <div key={folder} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{folder.split(/[/\\]/).pop() || folder}</p>
                            <p className="text-xs text-muted-foreground truncate">{folder}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleUnlinkFolder(folder)}
                            className="text-destructive hover:text-destructive/80 shrink-0"
                            title="Délier ce dossier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </EditableElement>
          )}

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

          {/* Theme Toggle */}
          <ThemeToggle />

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