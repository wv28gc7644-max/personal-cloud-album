import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TagBadge } from './TagBadge';
import { MediaItem } from '@/types/media';
import { useMediaStats } from '@/hooks/useMediaStats';
import { useMediaStore } from '@/hooks/useMediaStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Copy, Check, Edit3, Image, Video, HardDrive, Calendar, Eye, FolderOpen, Link, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MediaInfoDialogProps {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaInfoDialog({ item, open, onOpenChange }: MediaInfoDialogProps) {
  const { getStats } = useMediaStats();
  const { updateMedia } = useMediaStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!item) return null;

  const stats = getStats(item.id);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleStartEdit = () => {
    setEditName(item.name);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editName.trim()) {
      updateMedia(item.id, { name: editName.trim() });
      toast.success('Nom modifié');
    }
    setIsEditing(false);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copié !');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => handleCopy(text, field)}
      className="h-6 w-6 shrink-0"
    >
      {copiedField === field ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  );

  const InfoRow = ({ icon: Icon, label, value, copyable }: { icon: any; label: string; value: string; copyable?: boolean }) => (
    <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm flex-1 truncate">{value}</span>
      {copyable && <CopyButton text={value} field={label} />}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.type === 'image' ? <Image className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            Informations
          </DialogTitle>
        </DialogHeader>

        {/* Thumbnail preview */}
        <div className="rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {item.type === 'image' ? (
            <img src={item.thumbnailUrl || item.url} alt={item.name} className="max-h-[50vh] w-auto max-w-full object-contain" />
          ) : (
            <video src={item.url} className="max-h-[50vh] w-auto max-w-full object-contain" preload="metadata" />
          )}
        </div>

        {/* Name (editable) */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                autoFocus
                className="flex-1"
              />
              <Button size="sm" onClick={handleSaveEdit}>OK</Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium flex-1 truncate">{item.name}</p>
              <Button variant="ghost" size="icon-sm" onClick={handleStartEdit} className="h-6 w-6">
                <Edit3 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-0">
          <InfoRow
            icon={item.type === 'image' ? Image : Video}
            label="Type"
            value={item.type === 'image' ? 'Photo' : 'Vidéo'}
          />
          <InfoRow icon={HardDrive} label="Taille" value={formatFileSize(item.size)} />
          <InfoRow
            icon={Calendar}
            label="Date"
            value={format(new Date(item.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          />
          {item.type === 'video' && item.duration && (
            <InfoRow
              icon={Video}
              label="Durée"
              value={`${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`}
            />
          )}
          {stats && (
            <InfoRow icon={Eye} label="Vues" value={`${stats.viewCount} vue${stats.viewCount > 1 ? 's' : ''}`} />
          )}
          {item.isLinked && item.sourcePath && (
            <InfoRow icon={MapPin} label="Chemin" value={item.sourcePath} copyable />
          )}
          {item.isLinked && item.sourceFolder && (
            <InfoRow icon={FolderOpen} label="Dossier" value={item.sourceFolder} copyable />
          )}
          <InfoRow icon={Link} label="URL" value={item.url} copyable />
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map(tag => (
                <TagBadge key={tag.id} tag={tag} size="sm" />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
