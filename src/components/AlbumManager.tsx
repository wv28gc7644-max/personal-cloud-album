import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlbums, Album } from '@/hooks/useAlbums';
import { useMediaStore } from '@/hooks/useMediaStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FolderPlus, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Image,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { cn } from '@/lib/utils';

interface AlbumManagerProps {
  onSelectAlbum?: (album: Album) => void;
}

export function AlbumManager({ onSelectAlbum }: AlbumManagerProps) {
  const { 
    albums, 
    currentAlbumId, 
    addAlbum, 
    updateAlbum, 
    deleteAlbum, 
    setCurrentAlbum,
    getRootAlbums,
    getChildAlbums
  } = useAlbums();
  const { media } = useMediaStore();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [parentAlbumId, setParentAlbumId] = useState<string | undefined>();

  const handleCreateAlbum = () => {
    if (!newAlbumName.trim()) {
      toast.error('Le nom de l\'album est requis');
      return;
    }

    const album = addAlbum({
      name: newAlbumName.trim(),
      description: newAlbumDescription.trim() || undefined,
      parentId: parentAlbumId,
      mediaIds: []
    });

    toast.success(`Album "${album.name}" créé`);
    setNewAlbumName('');
    setNewAlbumDescription('');
    setParentAlbumId(undefined);
    setCreateDialogOpen(false);
  };

  const handleUpdateAlbum = () => {
    if (!editingAlbum) return;

    updateAlbum(editingAlbum.id, {
      name: newAlbumName.trim(),
      description: newAlbumDescription.trim() || undefined
    });

    toast.success('Album mis à jour');
    setEditingAlbum(null);
    setNewAlbumName('');
    setNewAlbumDescription('');
  };

  const handleDeleteAlbum = (albumId: string) => {
    const album = albums.find(a => a.id === albumId);
    deleteAlbum(albumId);
    toast.success(`Album "${album?.name}" supprimé`);
    setDeleteDialogOpen(null);
  };

  const toggleExpand = (albumId: string) => {
    const newExpanded = new Set(expandedAlbums);
    if (newExpanded.has(albumId)) {
      newExpanded.delete(albumId);
    } else {
      newExpanded.add(albumId);
    }
    setExpandedAlbums(newExpanded);
  };

  const renderAlbumItem = (album: Album, depth: number = 0) => {
    const children = getChildAlbums(album.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedAlbums.has(album.id);
    const isSelected = currentAlbumId === album.id;
    const mediaCount = album.mediaIds.length;
    const coverMedia = album.mediaIds[0] 
      ? media.find(m => m.id === album.mediaIds[0])
      : null;

    return (
      <div key={album.id}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
            depth > 0 && "ml-4"
          )}
          onClick={() => {
            setCurrentAlbum(album.id);
            onSelectAlbum?.(album);
          }}
        >
          {/* Expand toggle */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(album.id);
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-90"
              )} />
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Album icon/cover */}
          {coverMedia ? (
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
              <img
                src={coverMedia.thumbnailUrl || coverMedia.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
              {isExpanded ? (
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Folder className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          )}

          {/* Album info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{album.name}</p>
            <p className="text-xs text-muted-foreground">
              {mediaCount} média{mediaCount > 1 ? 's' : ''}
            </p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setEditingAlbum(album);
                setNewAlbumName(album.name);
                setNewAlbumDescription(album.description || '');
              }}>
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setParentAlbumId(album.id);
                setCreateDialogOpen(true);
              }}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Créer sous-album
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(album.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {children.map(child => renderAlbumItem(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Folder className="w-5 h-5" />
          Albums
        </h3>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel album</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="album-name">Nom</Label>
                <Input
                  id="album-name"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="Mon album"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="album-desc">Description (optionnelle)</Label>
                <Textarea
                  id="album-desc"
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  placeholder="Une description de l'album..."
                  rows={3}
                />
              </div>
              {parentAlbumId && (
                <p className="text-sm text-muted-foreground">
                  Sera créé dans : {albums.find(a => a.id === parentAlbumId)?.name}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setCreateDialogOpen(false);
                setParentAlbumId(undefined);
              }}>
                Annuler
              </Button>
              <Button onClick={handleCreateAlbum}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* All media button */}
      <button
        onClick={() => {
          setCurrentAlbum(null);
          onSelectAlbum?.(null as any);
        }}
        className={cn(
          "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
          !currentAlbumId ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
        )}
      >
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
          <Image className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium">Tous les médias</p>
          <p className="text-xs text-muted-foreground">{media.length} éléments</p>
        </div>
      </button>

      {/* Album list */}
      <div className="space-y-1">
        {getRootAlbums().map(album => renderAlbumItem(album))}
      </div>

      {albums.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun album. Créez-en un pour organiser vos médias.
        </p>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingAlbum} onOpenChange={() => setEditingAlbum(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-album-name">Nom</Label>
              <Input
                id="edit-album-name"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-album-desc">Description</Label>
              <Textarea
                id="edit-album-desc"
                value={newAlbumDescription}
                onChange={(e) => setNewAlbumDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingAlbum(null)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateAlbum}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteDialogOpen} onOpenChange={() => setDeleteDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'album ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera l'album mais pas les médias qu'il contient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDialogOpen && handleDeleteAlbum(deleteDialogOpen)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
