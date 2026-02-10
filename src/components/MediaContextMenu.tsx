import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { MediaInfoDialog } from './MediaInfoDialog';
import { MediaItem } from '@/types/media';
import { Eye, Info, Download, Save, Heart, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useContextMenuConfig, ContextMenuItem as ConfigItem } from '@/hooks/useContextMenuConfig';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye, Info, Download, Save, Heart, Copy, Trash2,
};

interface MediaContextMenuProps {
  item: MediaItem;
  children: React.ReactNode;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onToggleFavorite?: () => void;
}

export function MediaContextMenu({
  item,
  children,
  onView,
  onDownload,
  onDelete,
  onToggleFavorite,
}: MediaContextMenuProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { items } = useContextMenuConfig();
  const isFavorite = item.tags.some(t => t.name === 'Favoris');

  const handleSaveAs = () => {
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name;
    link.click();
  };

  const handleCopyPath = () => {
    const path = item.sourcePath || item.url;
    navigator.clipboard.writeText(path);
    toast.success('Chemin copié !');
  };

  const ACTION_HANDLERS: Record<string, () => void> = {
    view: onView,
    info: () => setInfoOpen(true),
    download: onDownload,
    saveAs: handleSaveAs,
    favorite: onToggleFavorite || (() => {}),
    copyPath: handleCopyPath,
    delete: onDelete,
  };

  const enabledItems = items.filter(i => i.type === 'separator' || (i.type === 'action' && i.enabled));

  // Filter out favorite if no handler
  const visibleItems = enabledItems.filter(i => {
    if (i.type === 'action' && i.id === 'favorite' && !onToggleFavorite) return false;
    return true;
  });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>{children}</div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          {visibleItems.map((ci) => {
            if (ci.type === 'separator') {
              return <ContextMenuSeparator key={ci.id} />;
            }
            const IconComp = ICON_MAP[ci.icon];
            const handler = ACTION_HANDLERS[ci.id];
            const isDelete = ci.id === 'delete';
            const isFav = ci.id === 'favorite';

            return (
              <ContextMenuItem
                key={ci.id}
                onClick={handler}
                className={cn("gap-2", isDelete && "text-destructive focus:text-destructive")}
              >
                {IconComp && (
                  <IconComp className={cn("w-4 h-4", isFav && isFavorite && "fill-current text-red-500")} />
                )}
                {isFav ? (isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris') : ci.label}
              </ContextMenuItem>
            );
          })}
        </ContextMenuContent>
      </ContextMenu>

      <MediaInfoDialog item={item} open={infoOpen} onOpenChange={setInfoOpen} />
    </>
  );
}
