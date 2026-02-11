import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Folder, Home } from 'lucide-react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { MediaCardTwitter } from './MediaCardTwitter';
import { MediaCardMinimal } from './MediaCardMinimal';
import { MediaCardAdaptive } from './MediaCardAdaptive';
import { MediaContextMenu } from './MediaContextMenu';
import { MediaViewer } from './MediaViewer';
import { MediaItem } from '@/types/media';
import { cn } from '@/lib/utils';
import { Images } from 'lucide-react';
import { getAdminSettings } from '@/utils/safeLocalStorage';
import { useBidirectionalSync } from '@/hooks/useBidirectionalSync';
import { useMediaStats } from '@/hooks/useMediaStats';

interface FolderExplorerProps {
  initialFolder?: string;
}

export function FolderExplorer({ initialFolder }: FolderExplorerProps) {
  const [currentFolder, setCurrentFolder] = useState(initialFolder || '');
  const { viewMode, getMediaByFolderPrefix, getSourceFolders, removeMedia, updateMedia, tags, media, sortBy } = useMediaStore();
  const { deleteFromServer } = useBidirectionalSync();
  const { recordView } = useMediaStats();
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);

  // Update currentFolder when initialFolder changes
  useState(() => {
    if (initialFolder) setCurrentFolder(initialFolder);
  });

  // Get all source folders
  const allFolders = useMemo(() => getSourceFolders(), [media]);

  // Normalize folder path
  const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/$/, '');

  // Build breadcrumb parts from currentFolder
  const breadcrumbs = useMemo(() => {
    if (!currentFolder) return [];
    const norm = normalize(currentFolder);
    const parts = norm.split('/');
    const crumbs: { label: string; path: string }[] = [];
    for (let i = 0; i < parts.length; i++) {
      crumbs.push({
        label: parts[i],
        path: parts.slice(0, i + 1).join('/'),
      });
    }
    return crumbs;
  }, [currentFolder]);

  // Get immediate subfolders of currentFolder
  const subfolders = useMemo(() => {
    const normCurrent = normalize(currentFolder);
    const subs = new Map<string, number>();

    allFolders.forEach(folder => {
      const normFolder = normalize(folder);
      if (!normCurrent) {
        // Root level: get top-level segments
        const topSegment = normFolder.split('/')[0];
        if (topSegment) {
          const count = media.filter(m => {
            const sf = normalize(m.sourceFolder || '');
            return sf === topSegment || sf.startsWith(topSegment + '/');
          }).length;
          subs.set(topSegment, count);
        }
      } else if (normFolder.startsWith(normCurrent + '/')) {
        const rest = normFolder.slice(normCurrent.length + 1);
        const nextSegment = rest.split('/')[0];
        if (nextSegment) {
          const fullPath = normCurrent + '/' + nextSegment;
          if (!subs.has(fullPath)) {
            const count = media.filter(m => {
              const sf = normalize(m.sourceFolder || '');
              return sf === fullPath || sf.startsWith(fullPath + '/');
            }).length;
            subs.set(fullPath, count);
          }
        }
      }
    });

    return Array.from(subs.entries())
      .map(([path, count]) => ({
        path,
        name: path.split('/').pop() || path,
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allFolders, currentFolder, media]);

  // Get media for current folder (direct children only, not subfolders)
  const folderMedia = useMemo(() => {
    if (!currentFolder) return [];
    const normCurrent = normalize(currentFolder);
    return getMediaByFolderPrefix(normCurrent);
  }, [currentFolder, getMediaByFolderPrefix, media]);

  const handleView = (item: MediaItem) => {
    recordView(item.id);
    setViewerItem(item);
  };

  const handleDownload = (item: MediaItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (item: MediaItem) => {
    if (item.url.includes('localhost')) {
      await deleteFromServer(item);
    } else {
      removeMedia(item.id);
    }
  };

  const handleToggleFavorite = (item: MediaItem) => {
    const favorisTag = tags.find(t => t.name === 'Favoris');
    if (!favorisTag) return;
    const hasFavoris = item.tags.some(t => t.id === favorisTag.id);
    const newTags = hasFavoris
      ? item.tags.filter(t => t.id !== favorisTag.id)
      : [...item.tags, favorisTag];
    updateMedia(item.id, { tags: newTags });
  };

  const gridColumns = getAdminSettings().gridColumns;

  const getGridStyle = (): React.CSSProperties | undefined => {
    if (viewMode === 'masonry' || viewMode === 'media-only' || viewMode === 'list') return undefined;
    if (viewMode === 'grid-large') return { display: 'grid', gridTemplateColumns: `repeat(${Math.min(gridColumns, 2)}, minmax(0, 1fr))`, gap: '1.5rem' };
    return { display: 'grid', gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gap: '1rem' };
  };

  const getGridClasses = () => {
    switch (viewMode) {
      case 'masonry':
      case 'media-only':
        return `columns-${Math.min(gridColumns, 2)} sm:columns-${gridColumns} gap-3 sm:gap-4 space-y-3 sm:space-y-4`;
      case 'list':
        return "flex flex-col gap-3 sm:gap-4";
      default:
        return "";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <button
            onClick={() => setCurrentFolder('')}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors",
              !currentFolder && "text-primary font-medium"
            )}
          >
            <Home className="w-4 h-4" />
            <span>Explorateur</span>
          </button>
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <button
                onClick={() => setCurrentFolder(crumb.path)}
                className={cn(
                  "px-2 py-1 rounded hover:bg-muted transition-colors",
                  i === breadcrumbs.length - 1 ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subfolders */}
      {subfolders.length > 0 && (
        <div className="px-4 sm:px-6 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {subfolders.map((sub) => (
              <motion.button
                key={sub.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentFolder(sub.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <Folder className="w-10 h-10 text-primary" />
                <span className="text-sm font-medium truncate w-full text-center">{sub.name}</span>
                <span className="text-xs text-muted-foreground">{sub.count} média{sub.count > 1 ? 's' : ''}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Media grid */}
      {folderMedia.length > 0 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + currentFolder}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -12 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={cn("p-3 sm:p-6", getGridClasses())}
            style={getGridStyle()}
          >
            <AnimatePresence mode="popLayout">
              {folderMedia.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(index * 0.03, 0.3),
                    layout: { type: 'spring', stiffness: 300, damping: 30 }
                  }}
                  className={cn(
                    (viewMode === 'masonry' || viewMode === 'media-only') && "break-inside-avoid",
                    viewMode === 'list' && "max-w-3xl mx-auto w-full"
                  )}
                >
                  <MediaContextMenu
                    item={item}
                    onView={() => handleView(item)}
                    onDelete={() => handleDelete(item)}
                    onDownload={() => handleDownload(item)}
                    onToggleFavorite={() => handleToggleFavorite(item)}
                  >
                    {viewMode === 'media-only' ? (
                      <MediaCardMinimal item={item} onView={() => handleView(item)} />
                    ) : viewMode === 'adaptive' ? (
                      <MediaCardAdaptive
                        item={item}
                        onView={() => handleView(item)}
                        onDelete={() => handleDelete(item)}
                        onDownload={() => handleDownload(item)}
                        onToggleFavorite={() => handleToggleFavorite(item)}
                      />
                    ) : (
                      <MediaCardTwitter
                        item={item}
                        onView={() => handleView(item)}
                        onDelete={() => handleDelete(item)}
                        onDownload={() => handleDownload(item)}
                        onToggleFavorite={() => handleToggleFavorite(item)}
                      />
                    )}
                  </MediaContextMenu>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      ) : currentFolder && subfolders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
            <Images className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Dossier vide</h3>
          <p className="text-muted-foreground">Aucun média dans ce dossier.</p>
        </div>
      ) : !currentFolder && subfolders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
            <Folder className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Aucun dossier lié</h3>
          <p className="text-muted-foreground max-w-sm">
            Liez des dossiers via le scan pour les voir apparaître ici.
          </p>
        </div>
      ) : null}

      {/* Media Viewer */}
      <MediaViewer
        item={viewerItem}
        items={folderMedia}
        onClose={() => setViewerItem(null)}
        onNavigate={(item) => {
          recordView(item.id);
          setViewerItem(item);
        }}
        onDownload={handleDownload}
      />
    </div>
  );
}
