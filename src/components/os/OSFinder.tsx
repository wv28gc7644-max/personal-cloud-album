import { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, File, Image, Film, Music, FileText, Archive,
  ChevronRight, ChevronDown, Home, List, LayoutGrid, Columns,
  ArrowUp, ArrowDown, Search, MoreHorizontal, Trash2, Copy,
  FolderOpen, HardDrive, Clock, Star, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type ViewMode = 'icons' | 'list' | 'columns';
type SortBy = 'name' | 'date' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  extension?: string;
  size?: number;
  modifiedAt: Date;
  path: string;
  children?: FileItem[];
}

// Demo file system structure
const createDemoFileSystem = (): FileItem[] => [
  {
    id: '1',
    name: 'Documents',
    type: 'folder',
    path: '/Documents',
    modifiedAt: new Date('2024-03-01'),
    children: [
      { id: '1-1', name: 'Projets', type: 'folder', path: '/Documents/Projets', modifiedAt: new Date('2024-02-15'), children: [
        { id: '1-1-1', name: 'rapport.pdf', type: 'file', extension: 'pdf', size: 2500000, path: '/Documents/Projets/rapport.pdf', modifiedAt: new Date('2024-02-10') },
        { id: '1-1-2', name: 'présentation.pptx', type: 'file', extension: 'pptx', size: 5200000, path: '/Documents/Projets/présentation.pptx', modifiedAt: new Date('2024-02-12') },
      ]},
      { id: '1-2', name: 'notes.txt', type: 'file', extension: 'txt', size: 15000, path: '/Documents/notes.txt', modifiedAt: new Date('2024-03-01') },
    ]
  },
  {
    id: '2',
    name: 'Images',
    type: 'folder',
    path: '/Images',
    modifiedAt: new Date('2024-03-10'),
    children: [
      { id: '2-1', name: 'Vacances', type: 'folder', path: '/Images/Vacances', modifiedAt: new Date('2024-01-20'), children: [
        { id: '2-1-1', name: 'plage.jpg', type: 'file', extension: 'jpg', size: 3500000, path: '/Images/Vacances/plage.jpg', modifiedAt: new Date('2024-01-15') },
        { id: '2-1-2', name: 'montagne.png', type: 'file', extension: 'png', size: 4200000, path: '/Images/Vacances/montagne.png', modifiedAt: new Date('2024-01-18') },
      ]},
      { id: '2-2', name: 'Screenshots', type: 'folder', path: '/Images/Screenshots', modifiedAt: new Date('2024-03-10'), children: [
        { id: '2-2-1', name: 'capture1.png', type: 'file', extension: 'png', size: 1200000, path: '/Images/Screenshots/capture1.png', modifiedAt: new Date('2024-03-08') },
      ]},
      { id: '2-3', name: 'avatar.png', type: 'file', extension: 'png', size: 250000, path: '/Images/avatar.png', modifiedAt: new Date('2024-02-28') },
    ]
  },
  {
    id: '3',
    name: 'Musique',
    type: 'folder',
    path: '/Musique',
    modifiedAt: new Date('2024-02-20'),
    children: [
      { id: '3-1', name: 'playlist.mp3', type: 'file', extension: 'mp3', size: 8500000, path: '/Musique/playlist.mp3', modifiedAt: new Date('2024-02-18') },
      { id: '3-2', name: 'podcast.mp3', type: 'file', extension: 'mp3', size: 45000000, path: '/Musique/podcast.mp3', modifiedAt: new Date('2024-02-20') },
    ]
  },
  {
    id: '4',
    name: 'Vidéos',
    type: 'folder',
    path: '/Vidéos',
    modifiedAt: new Date('2024-03-05'),
    children: [
      { id: '4-1', name: 'tutoriel.mp4', type: 'file', extension: 'mp4', size: 150000000, path: '/Vidéos/tutoriel.mp4', modifiedAt: new Date('2024-03-02') },
      { id: '4-2', name: 'memories.mov', type: 'file', extension: 'mov', size: 250000000, path: '/Vidéos/memories.mov', modifiedAt: new Date('2024-03-05') },
    ]
  },
  {
    id: '5',
    name: 'Téléchargements',
    type: 'folder',
    path: '/Téléchargements',
    modifiedAt: new Date('2024-03-12'),
    children: [
      { id: '5-1', name: 'archive.zip', type: 'file', extension: 'zip', size: 50000000, path: '/Téléchargements/archive.zip', modifiedAt: new Date('2024-03-12') },
      { id: '5-2', name: 'installer.dmg', type: 'file', extension: 'dmg', size: 120000000, path: '/Téléchargements/installer.dmg', modifiedAt: new Date('2024-03-11') },
    ]
  },
];

const getFileIcon = (item: FileItem) => {
  if (item.type === 'folder') return Folder;
  
  const ext = item.extension?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return Image;
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) return Film;
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext || '')) return Music;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return Archive;
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '')) return FileText;
  return File;
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const isFolder = item.type === 'folder';
  
  return (
    <motion.button
      className={cn(
        'flex flex-col items-center gap-1 p-3 rounded-lg transition-colors w-24',
        isSelected ? 'bg-primary/15' : 'hover:bg-muted'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={cn(
        'w-14 h-14 rounded-lg flex items-center justify-center',
        isFolder ? 'bg-blue-500/20' : 'bg-muted'
      )}>
        <Icon className={cn('w-8 h-8', isFolder ? 'text-blue-500' : 'text-muted-foreground')} />
      </div>
      <span className={cn(
        'text-xs text-center line-clamp-2 w-full',
        isSelected && 'text-primary font-medium'
      )}>
        {item.name}
      </span>
    </motion.button>
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
  const isFolder = item.type === 'folder';
  
  return (
    <motion.button
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
        isSelected ? 'bg-primary/15' : 'hover:bg-muted'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Icon className={cn('w-5 h-5 shrink-0', isFolder ? 'text-blue-500' : 'text-muted-foreground')} />
      <span className={cn('flex-1 text-sm truncate', isSelected && 'text-primary font-medium')}>
        {item.name}
      </span>
      <span className="text-xs text-muted-foreground w-20 text-right">{formatSize(item.size)}</span>
      <span className="text-xs text-muted-foreground w-28 text-right">{formatDate(item.modifiedAt)}</span>
    </motion.button>
  );
});
ListViewRow.displayName = 'ListViewRow';

// Column view
const ColumnView = memo(({ 
  columns, 
  selectedPath,
  onNavigate,
  onSelect
}: { 
  columns: FileItem[][];
  selectedPath: string[];
  onNavigate: (path: string, depth: number) => void;
  onSelect: (item: FileItem) => void;
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
          key={colIndex} 
          className="w-56 shrink-0 border-r border-border flex flex-col"
        >
          <ScrollArea className="flex-1">
            <div className="p-1">
              {items.map(item => {
                const Icon = getFileIcon(item);
                const isFolder = item.type === 'folder';
                const isSelected = selectedPath[colIndex] === item.path;
                
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
                        // Open file
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
  const [fileSystem] = useState<FileItem[]>(createDemoFileSystem);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('columns');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [columnPaths, setColumnPaths] = useState<string[]>(['/']);

  // Get items at current path
  const getItemsAtPath = useCallback((path: string): FileItem[] => {
    if (path === '/') return fileSystem;
    
    const parts = path.split('/').filter(Boolean);
    let current: FileItem[] = fileSystem;
    
    for (const part of parts) {
      const folder = current.find(item => item.name === part && item.type === 'folder');
      if (folder?.children) {
        current = folder.children;
      } else {
        return [];
      }
    }
    return current;
  }, [fileSystem]);

  // Current items based on path
  const currentItems = useMemo(() => {
    let items = getItemsAtPath(currentPath);
    
    // Filter by search
    if (searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    items = [...items].sort((a, b) => {
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
          comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
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
    
    return items;
  }, [currentPath, searchQuery, sortBy, sortOrder, getItemsAtPath]);

  // Columns for column view
  const columns = useMemo(() => {
    return columnPaths.map(path => getItemsAtPath(path));
  }, [columnPaths, getItemsAtPath]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (currentPath === '/') return [{ name: 'Accueil', path: '/' }];
    const parts = currentPath.split('/').filter(Boolean);
    return [
      { name: 'Accueil', path: '/' },
      ...parts.map((part, i) => ({
        name: part,
        path: '/' + parts.slice(0, i + 1).join('/')
      }))
    ];
  }, [currentPath]);

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);
    setSelectedItem(null);
    
    // Update column paths
    if (path === '/') {
      setColumnPaths(['/']);
    } else {
      const parts = path.split('/').filter(Boolean);
      const paths = ['/', ...parts.map((_, i) => '/' + parts.slice(0, i + 1).join('/'))];
      setColumnPaths(paths);
    }
  }, []);

  const handleColumnNavigate = useCallback((path: string, depth: number) => {
    setColumnPaths(prev => [...prev.slice(0, depth + 1), path]);
    setCurrentPath(path);
  }, []);

  const handleItemClick = useCallback((item: FileItem) => {
    setSelectedItem(item);
  }, []);

  const handleItemDoubleClick = useCallback((item: FileItem) => {
    if (item.type === 'folder') {
      navigateTo(item.path);
    }
  }, [navigateTo]);

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-48 bg-muted/30 border-r border-border flex flex-col shrink-0">
        <div className="p-2 space-y-0.5">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold px-2 py-1">Favoris</div>
          <SidebarItem icon={HardDrive} label="Accueil" isActive={currentPath === '/'} onClick={() => navigateTo('/')} />
          <SidebarItem icon={Download} label="Téléchargements" onClick={() => navigateTo('/Téléchargements')} />
          <SidebarItem icon={FileText} label="Documents" onClick={() => navigateTo('/Documents')} />
          <SidebarItem icon={Image} label="Images" onClick={() => navigateTo('/Images')} />
          <SidebarItem icon={Music} label="Musique" onClick={() => navigateTo('/Musique')} />
          <SidebarItem icon={Film} label="Vidéos" onClick={() => navigateTo('/Vidéos')} />
          
          <div className="text-[10px] uppercase text-muted-foreground font-semibold px-2 py-1 pt-3">Récents</div>
          <SidebarItem icon={Clock} label="Récents" onClick={() => {}} />
          <SidebarItem icon={Star} label="Favoris" onClick={() => {}} />
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
              onClick={() => {
                const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
                navigateTo(parent);
              }}
              disabled={currentPath === '/'}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.path} className="flex items-center">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5" />}
                <button
                  className="text-sm hover:text-primary transition-colors truncate max-w-32"
                  onClick={() => navigateTo(crumb.path)}
                >
                  {i === 0 ? <Home className="w-3.5 h-3.5" /> : crumb.name}
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

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'columns' ? (
            <ColumnView
              columns={columns}
              selectedPath={columnPaths}
              onNavigate={handleColumnNavigate}
              onSelect={handleItemClick}
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
          {currentItems.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Ce dossier est vide</p>
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="h-6 border-t border-border flex items-center px-3 text-xs text-muted-foreground shrink-0">
          <span>{currentItems.length} élément{currentItems.length !== 1 ? 's' : ''}</span>
          {selectedItem && (
            <>
              <span className="mx-2">•</span>
              <span>Sélectionné : {selectedItem.name}</span>
              {selectedItem.size && (
                <>
                  <span className="mx-2">•</span>
                  <span>{formatSize(selectedItem.size)}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
OSFinder.displayName = 'OSFinder';
