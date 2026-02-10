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

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={onView} className="gap-2">
            <Eye className="w-4 h-4" />
            Voir
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setInfoOpen(true)} className="gap-2">
            <Info className="w-4 h-4" />
            Informations
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Télécharger
          </ContextMenuItem>
          <ContextMenuItem onClick={handleSaveAs} className="gap-2">
            <Save className="w-4 h-4" />
            Enregistrer sous...
          </ContextMenuItem>
          <ContextMenuSeparator />
          {onToggleFavorite && (
            <ContextMenuItem onClick={onToggleFavorite} className="gap-2">
              <Heart className={cn("w-4 h-4", isFavorite && "fill-current text-red-500")} />
              {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={handleCopyPath} className="gap-2">
            <Copy className="w-4 h-4" />
            Copier le chemin
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4" />
            Supprimer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <MediaInfoDialog item={item} open={infoOpen} onOpenChange={setInfoOpen} />
    </>
  );
}
