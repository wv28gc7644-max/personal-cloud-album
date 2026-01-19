import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaSelection } from '@/hooks/useMediaSelection';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useBidirectionalSync } from '@/hooks/useBidirectionalSync';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Trash2, 
  Download, 
  Tag, 
  FolderPlus, 
  CheckSquare, 
  Square,
  Archive
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function SelectionToolbar() {
  const { 
    isSelectionMode, 
    getSelectedCount, 
    getSelectedIds, 
    clearSelection,
    selectAll
  } = useMediaSelection();
  const { media, tags, updateMedia, removeMedia, getFilteredMedia, playlists, addToPlaylist } = useMediaStore();
  const { deleteFromServer } = useBidirectionalSync();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedCount = getSelectedCount();
  const selectedIds = getSelectedIds();
  const filteredMedia = getFilteredMedia();

  const handleSelectAll = () => {
    selectAll(filteredMedia.map(m => m.id));
  };

  const handleAddTag = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return;

    selectedIds.forEach(id => {
      const item = media.find(m => m.id === id);
      if (item && !item.tags.some(t => t.id === tagId)) {
        updateMedia(id, { tags: [...item.tags, tag] });
      }
    });
    toast.success(`Tag ajouté à ${selectedCount} média(s)`);
  };

  const handleRemoveTag = (tagId: string) => {
    selectedIds.forEach(id => {
      const item = media.find(m => m.id === id);
      if (item) {
        updateMedia(id, { tags: item.tags.filter(t => t.id !== tagId) });
      }
    });
    toast.success(`Tag retiré de ${selectedCount} média(s)`);
  };

  const handleDelete = async () => {
    for (const id of selectedIds) {
      const item = media.find(m => m.id === id);
      if (item) {
        if (item.url.includes('localhost')) {
          await deleteFromServer(item);
        } else {
          removeMedia(id);
        }
      }
    }
    clearSelection();
    setShowDeleteDialog(false);
    toast.success(`${selectedCount} média(s) supprimé(s)`);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    const selectedItems = media.filter(m => selectedIds.includes(m.id));
    
    // Download each file
    for (const item of selectedItems) {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Small delay between downloads
      await new Promise(r => setTimeout(r, 200));
    }
    
    setIsDownloading(false);
    toast.success(`${selectedCount} fichier(s) en téléchargement`);
  };

  const handleAddToPlaylist = (playlistId: string) => {
    selectedIds.forEach(id => {
      addToPlaylist(playlistId, id);
    });
    const playlist = playlists.find(p => p.id === playlistId);
    toast.success(`${selectedCount} média(s) ajouté(s) à ${playlist?.name}`);
  };

  if (!isSelectionMode) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl">
            {/* Selection count */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">{selectedCount}</span>
              <span className="text-sm text-muted-foreground">sélectionné(s)</span>
            </div>

            <div className="w-px h-8 bg-border mx-1" />

            {/* Select all */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Tout
            </Button>

            {/* Add tag */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Tag className="w-4 h-4" />
                  Tag
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">
                  Ajouter un tag
                </div>
                {tags.map(tag => (
                  <DropdownMenuItem key={tag.id} onClick={() => handleAddTag(tag.id)}>
                    <div className={`w-2 h-2 rounded-full bg-${tag.color}-500 mr-2`} />
                    {tag.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">
                  Retirer un tag
                </div>
                {tags.map(tag => (
                  <DropdownMenuItem 
                    key={`remove-${tag.id}`} 
                    onClick={() => handleRemoveTag(tag.id)}
                    className="text-destructive"
                  >
                    <div className={`w-2 h-2 rounded-full bg-${tag.color}-500 mr-2`} />
                    {tag.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add to playlist */}
            {playlists.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <FolderPlus className="w-4 h-4" />
                    Playlist
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {playlists.map(playlist => (
                    <DropdownMenuItem key={playlist.id} onClick={() => handleAddToPlaylist(playlist.id)}>
                      {playlist.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Download */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Téléchargement...' : 'Télécharger'}
            </Button>

            <div className="w-px h-8 bg-border mx-1" />

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </Button>

            {/* Close selection */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearSelection}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedCount} média(s) ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
