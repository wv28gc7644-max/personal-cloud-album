import { useState } from 'react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { Tag, TagColor } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TagBadge } from '@/components/TagBadge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TAG_COLORS: TagColor[] = ['yellow', 'blue', 'green', 'purple', 'orange', 'pink', 'gray'];

export function TagsSettings() {
  const { tags, addTag, removeTag } = useMediaStore();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<TagColor>('blue');

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      toast.error('Le nom du tag est requis');
      return;
    }

    const newTag: Tag = {
      id: crypto.randomUUID(),
      name: newTagName.trim(),
      color: newTagColor
    };

    addTag(newTag);
    setNewTagName('');
    toast.success(`Tag "${newTag.name}" créé`);
  };

  const handleDeleteTag = (tag: Tag) => {
    removeTag(tag.id);
    toast.success(`Tag "${tag.name}" supprimé`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Créer un tag</CardTitle>
          <CardDescription>Ajoutez des tags pour organiser vos médias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="tagName">Nom du tag</Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ex: Vacances 2024"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
            </div>
            <div>
              <Label>Couleur</Label>
              <div className="flex gap-1 mt-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      `bg-tag-${color}`,
                      newTagColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddTag} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags existants ({tags.length})</CardTitle>
          <CardDescription>Cliquez sur un tag pour le supprimer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun tag créé</p>
            ) : (
              tags.map((tag) => (
                <div key={tag.id} className="group relative">
                  <TagBadge tag={tag} />
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
