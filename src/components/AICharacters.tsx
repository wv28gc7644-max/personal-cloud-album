import { useState } from 'react';
import { useAIMemory, AICharacter } from '@/hooks/useAIMemory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  User,
  Plus,
  Trash2,
  Edit,
  MessageCircle,
  Brain,
  Volume2,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CharacterFormData {
  name: string;
  personality: string;
  systemPrompt: string;
  avatar?: string;
  voicePitch: number;
  voiceRate: number;
}

const DEFAULT_FORM: CharacterFormData = {
  name: '',
  personality: '',
  systemPrompt: '',
  avatar: '',
  voicePitch: 1,
  voiceRate: 1
};

export function AICharacters() {
  const {
    characters,
    activeCharacter,
    setActiveCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter
  } = useAIMemory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<AICharacter | null>(null);
  const [formData, setFormData] = useState<CharacterFormData>(DEFAULT_FORM);

  const handleOpenCreate = () => {
    setEditingCharacter(null);
    setFormData(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (character: AICharacter) => {
    setEditingCharacter(character);
    setFormData({
      name: character.name,
      personality: character.personality,
      systemPrompt: character.systemPrompt,
      avatar: character.avatar || '',
      voicePitch: character.voiceSettings?.pitch || 1,
      voiceRate: character.voiceSettings?.rate || 1
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    if (editingCharacter) {
      updateCharacter(editingCharacter.id, {
        name: formData.name,
        personality: formData.personality,
        systemPrompt: formData.systemPrompt,
        avatar: formData.avatar || undefined,
        voiceSettings: {
          pitch: formData.voicePitch,
          rate: formData.voiceRate
        }
      });
      toast.success('Personnage modifié');
    } else {
      createCharacter({
        name: formData.name,
        personality: formData.personality,
        systemPrompt: formData.systemPrompt,
        avatar: formData.avatar || undefined,
        voiceSettings: {
          pitch: formData.voicePitch,
          rate: formData.voiceRate
        }
      });
      toast.success('Personnage créé');
    }

    setDialogOpen(false);
    setFormData(DEFAULT_FORM);
    setEditingCharacter(null);
  };

  const handleDelete = (id: string) => {
    deleteCharacter(id);
    toast.success('Personnage supprimé');
  };

  const handleSelect = (character: AICharacter) => {
    if (activeCharacter?.id === character.id) {
      setActiveCharacter(null);
      toast.info('Personnage désactivé');
    } else {
      setActiveCharacter(character);
      toast.success(`${character.name} activé`);
    }
  };

  const testVoice = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Bonjour, je suis ${formData.name || 'votre assistant'}.`
      );
      utterance.lang = 'fr-FR';
      utterance.pitch = formData.voicePitch;
      utterance.rate = formData.voiceRate;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personnages IA
              </CardTitle>
              <CardDescription>
                Créez des personnages avec leur propre personnalité et mémoire
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCharacter ? 'Modifier le personnage' : 'Créer un personnage'}
                  </DialogTitle>
                  <DialogDescription>
                    Définissez la personnalité et le comportement de votre IA
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-2">
                      <Label>Nom du personnage</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Luna, Max, Sophie..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Avatar URL</Label>
                      <Input
                        value={formData.avatar}
                        onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Personnalité (courte description)</Label>
                    <Input
                      value={formData.personality}
                      onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                      placeholder="Ex: Amical, sarcastique, philosophe..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>System Prompt (instructions détaillées)</Label>
                    <Textarea
                      value={formData.systemPrompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      placeholder="Tu es Luna, une IA espiègle et créative. Tu adores les jeux de mots et tu réponds souvent avec humour..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        Paramètres vocaux
                      </Label>
                      <Button size="sm" variant="outline" onClick={testVoice}>
                        Tester
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Hauteur</span>
                          <span>{formData.voicePitch.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[formData.voicePitch]}
                          onValueChange={([v]) => setFormData(prev => ({ ...prev, voicePitch: v }))}
                          min={0.5}
                          max={2}
                          step={0.1}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Vitesse</span>
                          <span>{formData.voiceRate.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[formData.voiceRate]}
                          onValueChange={([v]) => setFormData(prev => ({ ...prev, voiceRate: v }))}
                          min={0.5}
                          max={2}
                          step={0.1}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave}>
                    {editingCharacter ? 'Enregistrer' : 'Créer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="grid gap-3">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                    activeCharacter?.id === character.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleSelect(character)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={character.avatar} />
                    <AvatarFallback>
                      {character.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{character.name}</h4>
                      {activeCharacter?.id === character.id && (
                        <Badge variant="default" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Actif
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {character.personality}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        {character.memories.length} souvenirs
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {character.lastInteraction
                          ? new Date(character.lastInteraction).toLocaleDateString('fr-FR')
                          : 'Jamais'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(character);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer {character.name} ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action supprimera le personnage et tous ses souvenirs.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(character.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}

              {characters.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun personnage créé</p>
                  <p className="text-sm mt-1">Créez votre premier personnage IA</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
