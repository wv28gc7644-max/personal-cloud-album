import { useState, useCallback } from 'react';
import { Upload, X, Plus, Image, Video, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TagBadge } from './TagBadge';
import { Tag, TagColor, MediaItem } from '@/types/media';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useBidirectionalSync } from '@/hooks/useBidirectionalSync';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

const tagColors: TagColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];

const isServerConfigured = (): boolean => {
  const saved = localStorage.getItem('mediavault-admin-settings');
  if (saved) {
    const settings = JSON.parse(saved);
    return !!settings.localServerUrl;
  }
  return false;
};

export function UploadModal({ open, onClose }: UploadModalProps) {
  const { tags, addMedia, addTag } = useMediaStore();
  const { uploadToServer, isUploading } = useBidirectionalSync();
  const { addHistoryItem } = useNotifications();
  const [files, setFiles] = useState<File[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<TagColor>('blue');
  const [showTagForm, setShowTagForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
    },
  });

  const toggleTag = (tag: Tag) => {
    setSelectedTags((prev) =>
      prev.find((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    );
  };

  const createNewTag = () => {
    if (!newTagName.trim()) return;
    
    const newTag: Tag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      color: newTagColor,
    };
    
    addTag(newTag);
    setSelectedTags((prev) => [...prev, newTag]);
    setNewTagName('');
    setShowTagForm(false);
  };

  const handleUpload = async () => {
    const serverConfigured = isServerConfigured();
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      
      if (serverConfigured) {
        // Try to upload to server first
        const result = await uploadToServer(file, selectedTags);
        if (result) {
          successCount++;
          continue;
        }
      }
      
      // Fallback: add locally only
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      
      const mediaItem: MediaItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: isVideo ? 'video' : 'image',
        url,
        thumbnailUrl: isVideo ? undefined : url,
        tags: selectedTags,
        createdAt: new Date(),
        size: file.size,
      };
      
      addMedia(mediaItem);
      addHistoryItem({
        type: 'upload',
        title: 'Fichier ajouté',
        description: 'Ajouté localement',
        mediaName: file.name,
      });
      successCount++;
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} fichier(s) ajouté(s)`);
    }
    
    setFiles([]);
    setSelectedTags([]);
    setUploadProgress(0);
    onClose();
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">Ajouter des médias</DialogTitle>
        </DialogHeader>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300",
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-1">
            {isDragActive ? "Déposez les fichiers ici" : "Glissez-déposez vos fichiers"}
          </p>
          <p className="text-sm text-muted-foreground">
            ou cliquez pour sélectionner des images et vidéos
          </p>
        </div>

        {/* Selected files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Fichiers sélectionnés ({files.length})</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  {file.type.startsWith('video/') ? (
                    <Video className="w-5 h-5 text-primary" />
                  ) : (
                    <Image className="w-5 h-5 text-primary" />
                  )}
                  <span className="flex-1 truncate text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Tags</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTagForm(!showTagForm)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nouveau tag
            </Button>
          </div>

          {showTagForm && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Input
                placeholder="Nom du tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-1">
                {tagColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-transform",
                      `bg-tag-${color}`,
                      newTagColor === color && "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110"
                    )}
                    style={{ backgroundColor: `hsl(var(--tag-${color}))` }}
                  />
                ))}
              </div>
              <Button size="sm" onClick={createNewTag}>
                Ajouter
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                selected={selectedTags.some((t) => t.id === tag.id)}
                onClick={() => toggleTag(tag)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="min-w-32"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Publier ({files.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
