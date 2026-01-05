import { useState } from 'react';
import { ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMediaStore } from '@/hooks/useMediaStore';
import { Playlist } from '@/types/media';

interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePlaylistModal({ open, onClose }: CreatePlaylistModalProps) {
  const { addPlaylist } = useMediaStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;

    const playlist: Playlist = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim() || undefined,
      items: [],
      createdAt: new Date(),
    };

    addPlaylist(playlist);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary" />
            Nouvelle playlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Nom</label>
            <Input
              placeholder="Ma playlist"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description (optionnel)</label>
            <Textarea
              placeholder="Une description pour cette playlist..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>
              Créer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
