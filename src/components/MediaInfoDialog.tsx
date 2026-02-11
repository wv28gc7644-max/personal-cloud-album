import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TagBadge } from './TagBadge';
import { MediaItem } from '@/types/media';
import { useMediaStats } from '@/hooks/useMediaStats';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Copy, Check, Edit3, Image, Video, HardDrive, Calendar, Eye, FolderOpen, Link, MapPin, ExternalLink } from 'lucide-react';
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
  const isMobile = useIsMobile();
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

  const openInFileManager = (path: string) => {
    try {
      const parentDir = path.substring(0, path.lastIndexOf('/')) || path.substring(0, path.lastIndexOf('\\'));
      const fileUrl = `file:///${parentDir.replace(/\\/g, '/').replace(/^\//, '')}`;
      window.open(fileUrl, '_blank');
    } catch {
      toast.error("Impossible d'ouvrir le gestionnaire de fichiers depuis le navigateur");
    }
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

  const InfoRow = ({ icon: Icon, label, value, copyable, clickablePath }: { icon: any; label: string; value: string; copyable?: boolean; clickablePath?: boolean }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0 min-w-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-xs text-muted-foreground w-auto min-w-[3rem] shrink-0">{label}</span>
      {clickablePath ? (
        <button
          onClick={() => openInFileManager(value)}
          className="text-xs flex-1 break-all text-primary hover:underline cursor-pointer text-left flex items-start gap-1 min-w-0"
          title="Ouvrir dans le gestionnaire de fichiers"
        >
          <span className="break-all">{value}</span>
          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
        </button>
      ) : (
        <span className="text-xs flex-1 break-all min-w-0">{value}</span>
      )}
      {copyable && <CopyButton text={value} field={label} />}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "gap-3 border bg-background shadow-lg",
        isMobile
          ? "max-w-[100vw] w-full h-[100dvh] max-h-[100dvh] rounded-none p-3 flex flex-col"
          : "sm:max-w-4xl max-h-[90vh] p-5 flex flex-col"
      )}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            {item.type === 'image' ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            Informations
          </DialogTitle>
        </DialogHeader>

        {/* Two-column on desktop, stacked on mobile */}
        <div className={cn(
          "flex-1 min-h-0",
          isMobile ? "flex flex-col gap-3 overflow-hidden" : "grid grid-cols-[1fr_minmax(280px,360px)] gap-4"
        )}>
          {/* Preview */}
          <div className={cn(
            "rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0",
            isMobile ? "max-h-[35vh]" : "max-h-[60vh] self-start"
          )}>
            {item.type === 'image' ? (
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.name}
                className={cn(
                  "object-contain",
                  isMobile ? "max-h-[35vh] w-auto max-w-full" : "max-h-[60vh] w-auto max-w-full"
                )}
              />
            ) : (
              <video
                src={item.url}
                className={cn(
                  "object-contain",
                  isMobile ? "max-h-[35vh] w-auto max-w-full" : "max-h-[60vh] w-auto max-w-full"
                )}
                preload="metadata"
              />
            )}
          </div>

          {/* Metadata panel */}
          <div className={cn(
            "flex flex-col gap-2 min-h-0",
            isMobile ? "flex-1 overflow-y-auto" : "overflow-y-auto"
          )}>
            {/* Name (editable) */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    autoFocus
                    className="flex-1 h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleSaveEdit} className="h-8">OK</Button>
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
                value={format(new Date(item.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
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
                <InfoRow icon={MapPin} label="Chemin" value={item.sourcePath} copyable clickablePath />
              )}
              {item.isLinked && item.sourceFolder && (
                <InfoRow icon={FolderOpen} label="Dossier" value={item.sourceFolder} copyable clickablePath />
              )}
              <InfoRow icon={Link} label="URL" value={item.url} copyable />
            </div>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map(tag => (
                    <TagBadge key={tag.id} tag={tag} size="sm" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
