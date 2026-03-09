import { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Folder, File, Image, Film, Music, FileText, Archive,
  ChevronRight, Home, List, LayoutGrid, Columns,
  ArrowUp, ArrowDown, Search, FolderOpen, HardDrive, Clock, Star, Download,
  Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getLocalServerUrl } from '@/utils/safeLocalStorage';
import { toast } from 'sonner';
import { useOS } from '@/hooks/useOS';
import { dispatchFinderDrop, FinderDropData } from '@/hooks/useFinderDrop';

type ViewMode = 'icons' | 'list' | 'columns';
type SortBy = 'name' | 'date' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  extension?: string;
  size?: number;
  modifiedAt: string;
  path: string;
  isDrive?: boolean;
  url?: string;
  thumbnailUrl?: string;
}

interface FSListResponse {
  path: string;
  parent: string | null;
  items: FileItem[];
  isRoot: boolean;
}

const getFileIcon = (item: FileItem) => {
  if (item.type === 'folder' || item.isDrive) return item.isDrive ? HardDrive : Folder;
  
  const ext = item.extension?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext || '')) return Image;
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return Film;
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext || '')) return Music;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return Archive;
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) return FileText;
  return File;
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
};

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

// Sidebar item
const SidebarItem = memo(({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick,
  indent = 0 
}: { 
  icon: any; 
  label: string; 
  isActive?: boolean; 
  onClick: () => void;
  indent?: number;
}) => (
  <button
    className={cn(
      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
      isActive ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-foreground/80'
    )}
    style={{ paddingLeft: `${8 + indent * 12}px` }}
    onClick={onClick}
  >
    <Icon className="w-4 h-4 shrink-0" />
    <span className="truncate">{label}</span>
  </button>
));
SidebarItem.displayName = 'SidebarItem';

// Helper to get file type for drag data
const getFileTypeForDrag = (ext?: string): 'image' | 'video' | 'audio' | 'file' => {
  const e = ext?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'].includes(e)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(e)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(e)) return 'audio';
  return 'file';
};

// Icon view item
const IconViewItem = memo(({ 
  item, 
  isSelected, 
  onClick, 
  onDoubleClick 
}: { 
  item: FileItem; 
  isSelected: boolean; 
  onClick: () => void; 
  onDoubleClick: () => void;
}) => {
  const Icon = getFileIcon(item);
  const isFolder = item.type === 'folder' || item.isDrive;
  const isMedia = item.thumbnailUrl && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(item.extension?.toLowerCase() || '');
  const isDraggable = item.type === 'file' && item.url;

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    if (!isDraggable) return;
    
    const dragData: FinderDropData = {
      id: item.id,
      name: item.name,
      path: item.path,
      url: item.url!,
      thumbnailUrl: item.thumbnailUrl,
      type: getFileTypeForDrag(item.extension),
      size: item.size,
      extension: item.extension
    };
    
    e.dataTransfer.setData('application/x-mediavault-finder', JSON.stringify([dragData]));
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  return (
    <button
      className={cn(
        'flex flex-col items-center gap-1 p-3 rounded-lg transition-all w-24',
        isSelected ? 'bg-primary/15' : 'hover:bg-muted',
        isDraggable && 'cursor-grab active:cursor-grabbing',
        'hover:scale-[1.02] active:scale-[0.98]'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={isDraggable ? true : undefined}
      onDragStart={handleDragStart}
    >
      <div className={cn(
        'w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden pointer-events-none',
        isFolder ? 'bg-blue-500/20' : 'bg-muted'
      )}>
        {isMedia ? (
          <img 
            src={item.thumbnailUrl} 
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <Icon className={cn(
          'w-8 h-8',
          isMedia && 'hidden',
          isFolder ? 'text-blue-500' : 'text-muted-foreground'
        )} />
      </div>
      <span className={cn(
        'text-xs text-center line-clamp-2 w-full pointer-events-none',
        isSelected && 'text-primary font-medium'
      )}>
        {item.name}
      </span>
    </button>
  );
});
IconViewItem.displayName = 'IconViewItem';

// List view row
const ListViewRow = memo(({ 
  item, 
  isSelected, 
  onClick, 
  onDoubleClick 
}: { 
  item: FileItem; 
  isSelected: boolean; 
  onClick: () => void; 
  onDoubleClick: () => void;
}) => {
  const Icon = getFileIcon(item);
  const isFolder = item.type === 'folder' || item.isDrive;
  const isDraggable = item.type === 'file' && item.url;

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    if (!isDraggable) return;
    
    const dragData: FinderDropData = {
      id: item.id,
      name: item.name,
      path: item.path,
      url: item.url!,
      thumbnailUrl: item.thumbnailUrl,
      type: getFileTypeForDrag(item.extension),
      size: item.size,
      extension: item.extension
    };
    
    e.dataTransfer.setData('application/x-mediavault-finder', JSON.stringify([dragData]));
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
        isSelected ? 'bg-primary/15' : 'hover:bg-muted',
        isDraggable && 'cursor-grab active:cursor-grabbing'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={isDraggable}
      onDragStart={handleDragStart}
    >
      <Icon className={cn('w-5 h-5 shrink-0', isFolder ? 'text-blue-500' : 'text-muted-foreground')} />
      <span className={cn('flex-1 text-sm truncate', isSelected && 'text-primary font-medium')}>
        {item.name}
      </span>
      <span className="text-xs text-muted-foreground w-20 text-right">{formatSize(item.size)}</span>
      <span className="text-xs text-muted-foreground w-28 text-right">{formatDate(item.modifiedAt)}</span>
    </button>
  );
});
ListViewRow.displayName = 'ListViewRow';

// Column view
const ColumnView = memo(({ 
  columns, 
  columnPaths,
  onNavigate,
  onSelect,
  onDoubleClick,
  selectedItem
}: { 
  columns: FileItem[][];
  columnPaths: string[];
  onNavigate: (path: string, depth: number) => void;
  onSelect: (item: FileItem) => void;
  onDoubleClick: (item: FileItem) => void;
  selectedItem: FileItem | null;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [columns.length]);

  return (
    <div ref={scrollRef} className="flex h-full overflow-x-auto">
      {columns.map((items, colIndex) => (
        <div 
          key={`col-${colIndex}-${columnPaths[colIndex]}`} 
          className="w-56 shrink-0 border-r border-border flex flex-col"
        >
          <ScrollArea className="flex-1">
            <div className="p-1">
              {items.map(item => {
                const Icon = getFileIcon(item);
                const isFolder = item.type === 'folder' || item.isDrive;
                const isSelected = columnPaths[colIndex + 1] === item.path || selectedItem?.id === item.id;
                
                return (
                  <button
                    key={item.id}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                    onClick={() => {
                      onSelect(item);
                      if (isFolder) onNavigate(item.path, colIndex);
                    }}
                    onDoubleClick={() => {
                      if (!isFolder) {
                        onDoubleClick(item);
                      }
                    }}
                  >
                    <Icon className={cn(
                      'w-4 h-4 shrink-0',
                      isSelected ? '' : (isFolder ? 'text-blue-500' : 'text-muted-foreground')
                    )} />
                    <span className="flex-1 truncate text-left">{item.name}</span>
                    {isFolder && <ChevronRight className="w-3 h-3 shrink-0 opacity-50" />}
                  </button>
                );
              })}
              {items.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-xs">
                  Dossier vide
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
      
      {/* Empty column placeholder */}
      <div className="flex-1 min-w-[200px] bg-muted/30" />
    </div>
  );
});
ColumnView.displayName = 'ColumnView';

export const OSFinder = memo(() => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [items, setItems] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('columns');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [columnData, setColumnData] = useState<Map<string, FileItem[]>>(new Map());
  const [columnPaths, setColumnPaths] = useState<string[]>(['/']);

  const serverUrl = getLocalServerUrl();

  // Fetch directory contents from server
  const fetchDirectory = useCallback(async (dirPath: string): Promise<FileItem[]> => {
    try {
      const response = await fetch(`${serverUrl}/api/fs/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      const data: FSListResponse = await response.json();
      setIsConnected(true);
      return data.items;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Délai d\'attente dépassé');
      }
      throw err;
    }
  }, [serverUrl]);

  // Load initial directory
  const loadDirectory = useCallback(async (dirPath: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedItems = await fetchDirectory(dirPath);
      setItems(fetchedItems);
      setCurrentPath(dirPath);
      
      // Update column data cache
      setColumnData(prev => {
        const next = new Map(prev);
        next.set(dirPath, fetchedItems);
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      setIsConnected(false);
      toast.error('Erreur de connexion', { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [fetchDirectory]);

  // Initialize on mount
  useEffect(() => {
    loadDirectory('/');
  }, []);

  // Get sorted and filtered items
  const currentItems = useMemo(() => {
    let filtered = [...items];
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      // Folders first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          comparison = (a.extension || '').localeCompare(b.extension || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [items, searchQuery, sortBy, sortOrder]);

  // Build columns for column view
  const columns = useMemo(() => {
    return columnPaths.map(p => columnData.get(p) || []);
  }, [columnPaths, columnData]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (currentPath === '/' || currentPath === '') return [{ name: 'Ordinateur', path: '/' }];
    
    // Handle Windows paths (e.g., C:\Users\...)
    const isWindowsPath = /^[A-Z]:\\/i.test(currentPath);
    
    if (isWindowsPath) {
      const parts = currentPath.split('\\').filter(Boolean);
      return [
        { name: 'Ordinateur', path: '/' },
        ...parts.map((part, i) => ({
          name: part,
          path: parts.slice(0, i + 1).join('\\') + (i === 0 ? '\\' : '')
        }))
      ];
    }
    
    // Unix paths
    const parts = currentPath.split('/').filter(Boolean);
    return [
      { name: 'Ordinateur', path: '/' },
      ...parts.map((part, i) => ({
        name: part,
        path: '/' + parts.slice(0, i + 1).join('/')
      }))
    ];
  }, [currentPath]);

  const navigateTo = useCallback(async (path: string) => {
    await loadDirectory(path);
    setSelectedItem(null);
    
    // Update column paths for column view
    if (path === '/') {
      setColumnPaths(['/']);
    } else {
      // Keep existing columns up to current path
      const pathIndex = columnPaths.indexOf(path);
      if (pathIndex >= 0) {
        setColumnPaths(prev => prev.slice(0, pathIndex + 1));
      } else {
        setColumnPaths(prev => [...prev.slice(0, -1), path]);
      }
    }
  }, [loadDirectory, columnPaths]);

  const handleColumnNavigate = useCallback(async (path: string, depth: number) => {
    // Fetch new directory
    try {
      const newItems = await fetchDirectory(path);
      setColumnData(prev => {
        const next = new Map(prev);
        next.set(path, newItems);
        return next;
      });
      setColumnPaths(prev => [...prev.slice(0, depth + 1), path]);
      setCurrentPath(path);
    } catch (err) {
      toast.error('Impossible d\'ouvrir ce dossier');
    }
  }, [fetchDirectory]);

  const handleItemClick = useCallback((item: FileItem) => {
    setSelectedItem(item);
  }, []);

  const { openFileInApp } = useOS();

  const handleItemDoubleClick = useCallback(async (item: FileItem) => {
    if (item.type === 'folder' || item.isDrive) {
      await navigateTo(item.path);
    } else if (item.url) {
      // Determine file type
      const ext = item.extension?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'].includes(ext);
      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
      const isAudio = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext);
      
      if (isImage || isVideo || isAudio) {
        // Open in MediaViewer
        openFileInApp('media-viewer', {
          filePath: item.path,
          fileUrl: item.url,
          fileName: item.name,
          fileType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          thumbnailUrl: item.thumbnailUrl
        });
      } else {
        // Open other files in browser/external app
        window.open(item.url, '_blank');
      }
    }
  }, [navigateTo, openFileInApp]);

  const goUp = useCallback(async () => {
    if (currentPath === '/' || currentPath === '') return;
    
    // Handle Windows paths
    const isWindowsPath = /^[A-Z]:\\/i.test(currentPath);
    
    if (isWindowsPath) {
      const parts = currentPath.split('\\').filter(Boolean);
      if (parts.length <= 1) {
        await navigateTo('/');
      } else {
        const parentPath = parts.slice(0, -1).join('\\') + (parts.length === 2 ? '\\' : '');
        await navigateTo(parentPath);
      }
    } else {
      const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
      await navigateTo(parent);
    }
  }, [currentPath, navigateTo]);

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const navigateToSpecial = useCallback(async (special: string) => {
    await loadDirectory(special);
    setColumnPaths([special]);
  }, [loadDirectory]);

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-48 bg-muted/30 border-r border-border flex flex-col shrink-0">
        <div className="p-2 space-y-0.5">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold px-2 py-1">Favoris</div>
          <SidebarItem 
            icon={HardDrive} 
            label="Ordinateur" 
            isActive={currentPath === '/'} 
            onClick={() => navigateTo('/')} 
          />
          <SidebarItem 
            icon={Download} 
            label="Téléchargements" 
            onClick={() => navigateToSpecial('downloads')} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Documents" 
            onClick={() => navigateToSpecial('documents')} 
          />
          <SidebarItem 
            icon={Image} 
            label="Images" 
            onClick={() => navigateToSpecial('pictures')} 
          />
          <SidebarItem 
            icon={Music} 
            label="Musique" 
            onClick={() => navigateToSpecial('music')} 
          />
          <SidebarItem 
            icon={Film} 
            label="Vidéos" 
            onClick={() => navigateToSpecial('videos')} 
          />
          
          <div className="text-[10px] uppercase text-muted-foreground font-semibold px-2 py-1 pt-3">Système</div>
          <SidebarItem 
            icon={Home} 
            label="Dossier utilisateur" 
            onClick={() => navigateToSpecial('home')} 
          />
          
          {/* Connection status */}
          <div className="pt-4 px-2">
            <div className={cn(
              'flex items-center gap-2 text-xs',
              isConnected ? 'text-green-500' : 'text-muted-foreground'
            )}>
              <div className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-muted-foreground'
              )} />
              {isConnected ? 'Serveur connecté' : 'Non connecté'}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-10 border-b border-border flex items-center gap-2 px-3 shrink-0">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={goUp}
              disabled={currentPath === '/' || isLoading}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={() => loadDirectory(currentPath)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.path} className="flex items-center shrink-0">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5" />}
                <button
                  className="text-sm hover:text-primary transition-colors truncate max-w-40"
                  onClick={() => navigateTo(crumb.path)}
                >
                  {i === 0 ? <HardDrive className="w-3.5 h-3.5" /> : crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-40">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="h-7 pl-7 text-xs"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-md">
            <Button
              size="icon"
              variant={viewMode === 'icons' ? 'secondary' : 'ghost'}
              className="h-7 w-7 rounded-r-none"
              onClick={() => setViewMode('icons')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="h-7 w-7 rounded-none border-x border-border"
              onClick={() => setViewMode('list')}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'columns' ? 'secondary' : 'ghost'}
              className="h-7 w-7 rounded-l-none"
              onClick={() => setViewMode('columns')}
            >
              <Columns className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="m-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Erreur de connexion</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => loadDirectory(currentPath)}>
              Réessayer
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Chargement...</p>
            </div>
          </div>
        )}

        {/* Content area */}
        {!isLoading && !error && (
          <div className="flex-1 overflow-hidden">
            {viewMode === 'columns' ? (
              <ColumnView
                columns={columns}
                columnPaths={columnPaths}
                onNavigate={handleColumnNavigate}
                onSelect={handleItemClick}
                onDoubleClick={handleItemDoubleClick}
                selectedItem={selectedItem}
              />
            ) : viewMode === 'list' ? (
              <ScrollArea className="h-full">
                {/* List header */}
                <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border text-xs text-muted-foreground sticky top-0 bg-background">
                  <button 
                    className="flex-1 flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort('name')}
                  >
                    Nom {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                  <button 
                    className="w-20 text-right flex items-center justify-end gap-1 hover:text-foreground"
                    onClick={() => toggleSort('size')}
                  >
                    Taille {sortBy === 'size' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                  <button 
                    className="w-28 text-right flex items-center justify-end gap-1 hover:text-foreground"
                    onClick={() => toggleSort('date')}
                  >
                    Modifié {sortBy === 'date' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </div>
                <div className="p-1">
                  {currentItems.map(item => (
                    <ListViewRow
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onClick={() => handleItemClick(item)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-3 flex flex-wrap gap-1 content-start">
                  {currentItems.map(item => (
                    <IconViewItem
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onClick={() => handleItemClick(item)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Empty state */}
            {currentItems.length === 0 && !isLoading && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ce dossier est vide</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status bar */}
        <div className="h-6 border-t border-border flex items-center px-3 text-xs text-muted-foreground shrink-0">
          <span>{currentItems.length} élément{currentItems.length !== 1 ? 's' : ''}</span>
          {selectedItem && (
            <>
              <span className="mx-2">•</span>
              <span className="truncate max-w-[200px]">Sélectionné : {selectedItem.name}</span>
              {selectedItem.size && (
                <>
                  <span className="mx-2">•</span>
                  <span>{formatSize(selectedItem.size)}</span>
                </>
              )}
            </>
          )}
          <span className="flex-1" />
          <span className="truncate max-w-[300px] text-right">{currentPath}</span>
        </div>
      </div>
    </div>
  );
});
OSFinder.displayName = 'OSFinder';
