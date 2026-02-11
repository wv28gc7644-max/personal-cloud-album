import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
import { motion } from 'framer-motion';

interface FolderExplorerProps {
  initialFolder?: string;
}

const BATCH_SIZE = 40;
const LOAD_MORE_THRESHOLD = 600;

export function FolderExplorer({ initialFolder }: FolderExplorerProps) {
  const [currentFolder, setCurrentFolder] = useState(initialFolder || '');
  const { viewMode, getMediaByFolderPrefix, getSourceFolders, removeMedia, updateMedia, tags, media } = useMediaStore();
  const { deleteFromServer } = useBidirectionalSync();
  const { recordView } = useMediaStats();
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useState(() => {
    if (initialFolder) setCurrentFolder(initialFolder);
  });

  const allFolders = useMemo(() => getSourceFolders(), [media]);
  const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/$/, '');

  const breadcrumbs = useMemo(() => {
    if (!currentFolder) return [];
    const norm = normalize(currentFolder);
    const parts = norm.split('/');
    const crumbs: { label: string; path: string }[] = [];
    for (let i = 0; i < parts.length; i++) {
      crumbs.push({ label: parts[i], path: parts.slice(0, i + 1).join('/') });
    }
    return crumbs;
  }, [currentFolder]);

  const subfolders = useMemo(() => {
    const normCurrent = normalize(currentFolder);
    const subs = new Map<string, number>();
    allFolders.forEach(folder => {
      const normFolder = normalize(folder);
      if (!normCurrent) {
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
      .map(([path, count]) => ({ path, name: path.split('/').pop() || path, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allFolders, currentFolder, media]);

  const folderMedia = useMemo(() => {
    if (!currentFolder) return [];
    return getMediaByFolderPrefix(normalize(currentFolder));
  }, [currentFolder, getMediaByFolderPrefix, media]);

  // Reset visible count when folder changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [currentFolder, viewMode]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < folderMedia.length) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, folderMedia.length));
        }
      },
      { rootMargin: `${LOAD_MORE_THRESHOLD}px` }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, folderMedia.length]);

  const visibleMedia = useMemo(() => folderMedia.slice(0, visibleCount), [folderMedia, visibleCount]);

  const handleView = useCallback((item: MediaItem) => {
    recordView(item.id);
    setViewerItem(item);
  }, [recordView]);

  const handleDownload = useCallback((item: MediaItem) => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDelete = useCallback(async (item: MediaItem) => {
    if (item.url.includes('localhost')) {
      await deleteFromServer(item);
    } else {
      removeMedia(item.id);
    }
  }, [deleteFromServer, removeMedia]);

  const handleToggleFavorite = useCallback((item: MediaItem) => {
    const favorisTag = tags.find(t => t.name === 'Favoris');
    if (!favorisTag) return;
    const hasFavoris = item.tags.some(t => t.id === favorisTag.id);
    const newTags = hasFavoris
      ? item.tags.filter(t => t.id !== favorisTag.id)
      : [...item.tags, favorisTag];
    updateMedia(item.id, { tags: newTags });
  }, [tags, updateMedia]);

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

      {/* Media grid - virtualized */}
      {visibleMedia.length > 0 ? (
        <>
          <div
            className={cn("p-3 sm:p-6", getGridClasses())}
            style={getGridStyle()}
          >
            {visibleMedia.map((item) => (
              <div
                key={item.id}
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
              </div>
            ))}
          </div>

          {visibleCount < folderMedia.length && (
            <div ref={sentinelRef} className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                {visibleCount} / {folderMedia.length} médias affichés
              </p>
            </div>
          )}
        </>
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
