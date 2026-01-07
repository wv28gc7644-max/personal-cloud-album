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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Check,
  RefreshCw,
  Sparkles,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import VoiceConversation from './VoiceConversation';

// Suggestions de noms par genre
const NAME_SUGGESTIONS = {
  male: [
    ['Lucas', 'Hugo', 'Gabriel', 'Arthur', 'Nathan', 'Louis'],
    ['Maxime', 'Théo', 'Adam', 'Jules', 'Raphaël', 'Léo'],
    ['Antoine', 'Victor', 'Thomas', 'Alexandre', 'Nicolas', 'Mathieu']
  ],
  female: [
    ['Emma', 'Jade', 'Louise', 'Léa', 'Chloé', 'Alice'],
    ['Manon', 'Camille', 'Sarah', 'Eva', 'Léonie', 'Clara'],
    ['Marie', 'Anna', 'Sofia', 'Inès', 'Lina', 'Julia']
  ],
  neutral: [
    ['Alex', 'Charlie', 'Eden', 'Sasha', 'Robin', 'Noa'],
    ['Camille', 'Morgan', 'Alix', 'Louison', 'Sacha', 'Andrea'],
    ['Ange', 'Dominique', 'Maxime', 'Claude', 'Stéphane', 'Leslie']
  ]
};

// Avatars suggestions
const AVATAR_SUGGESTIONS = [
  ['🤖', '👨‍💼', '👩‍💼', '🧑‍💻', '👨‍🔬', '👩‍🔬'],
  ['🧙‍♂️', '🧙‍♀️', '🦸‍♂️', '🦸‍♀️', '🧛', '🧚'],
  ['🐱', '🐶', '🦊', '🐼', '🦉', '🐉'],
  ['😎', '🤓', '😊', '😇', '🤔', '😏']
];

// Personnalités suggestions
const PERSONALITY_SUGGESTIONS = [
  { trait: 'Amical & Chaleureux', description: 'Toujours positif et encourageant' },
  { trait: 'Sarcastique & Spirituel', description: 'Humour pince-sans-rire et réparties' },
  { trait: 'Philosophe & Réfléchi', description: 'Profond, aime les grandes questions' },
  { trait: 'Créatif & Artistique', description: 'Imaginatif, pense hors des sentiers' },
  { trait: 'Professionnel & Expert', description: 'Précis, factuel, orienté solution' },
  { trait: 'Mystérieux & Énigmatique', description: 'Parle par métaphores, intriguant' }
];

// Voix ElevenLabs disponibles
const ELEVENLABS_VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', description: 'Voix masculine chaleureuse' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', description: 'Voix féminine douce' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'male', description: 'Voix masculine profonde' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', description: 'Voix féminine naturelle' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'male', description: 'Voix masculine jeune' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'male', description: 'Voix masculine britannique' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', description: 'Voix féminine énergique' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', description: 'Voix féminine expressive' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', description: 'Voix masculine claire' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'female', description: 'Voix féminine américaine' }
];

interface CharacterFormData {
  name: string;
  personality: string;
  systemPrompt: string;
  avatar?: string;
  voicePitch: number;
  voiceRate: number;
  gender: 'male' | 'female' | 'neutral';
  voiceId: string;
}

const DEFAULT_FORM: CharacterFormData = {
  name: '',
  personality: '',
  systemPrompt: '',
  avatar: '',
  voicePitch: 1,
  voiceRate: 1,
  gender: 'neutral',
  voiceId: 'JBFqnCBsd6RMkjVDRZzb'
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
  const [nameSuggestionIndex, setNameSuggestionIndex] = useState(0);
  const [avatarSuggestionIndex, setAvatarSuggestionIndex] = useState(0);
  const [voiceConversationOpen, setVoiceConversationOpen] = useState(false);
  const [selectedCharacterForVoice, setSelectedCharacterForVoice] = useState<AICharacter | null>(null);

  const handleOpenCreate = () => {
    setEditingCharacter(null);
    setFormData(DEFAULT_FORM);
    setNameSuggestionIndex(0);
    setAvatarSuggestionIndex(0);
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
      voiceRate: character.voiceSettings?.rate || 1,
      gender: (character as any).gender || 'neutral',
      voiceId: (character as any).voiceId || 'JBFqnCBsd6RMkjVDRZzb'
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    const characterData = {
      name: formData.name,
      personality: formData.personality,
      systemPrompt: formData.systemPrompt,
      avatar: formData.avatar || undefined,
      voiceSettings: {
        pitch: formData.voicePitch,
        rate: formData.voiceRate
      },
      gender: formData.gender,
      voiceId: formData.voiceId
    };

    if (editingCharacter) {
      updateCharacter(editingCharacter.id, characterData);
      toast.success('Personnage modifié');
    } else {
      createCharacter(characterData);
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

  const handleStartVoiceChat = (character: AICharacter, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCharacterForVoice(character);
    setVoiceConversationOpen(true);
  };

  const regenerateNames = () => {
    const nextIndex = (nameSuggestionIndex + 1) % NAME_SUGGESTIONS[formData.gender].length;
    setNameSuggestionIndex(nextIndex);
  };

  const regenerateAvatars = () => {
    const nextIndex = (avatarSuggestionIndex + 1) % AVATAR_SUGGESTIONS.length;
    setAvatarSuggestionIndex(nextIndex);
  };

  const selectName = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
  };

  const selectAvatar = (emoji: string) => {
    setFormData(prev => ({ ...prev, avatar: emoji }));
  };

  const selectPersonality = (trait: string, description: string) => {
    setFormData(prev => ({
      ...prev,
      personality: trait,
      systemPrompt: prev.systemPrompt || `Tu es ${prev.name || 'un assistant'}, ${description.toLowerCase()}. Tu réponds toujours en français de manière naturelle et engageante.`
    }));
  };

  const testVoice = async () => {
    // Essayer ElevenLabs d'abord
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            text: `Bonjour, je suis ${formData.name || 'votre assistant'}.`,
            voiceId: formData.voiceId
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.audioContent) {
          const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.log('ElevenLabs non disponible, fallback vers Web Speech');
    }

    // Fallback vers Web Speech API
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

  const currentNames = NAME_SUGGESTIONS[formData.gender][nameSuggestionIndex];
  const currentAvatars = AVATAR_SUGGESTIONS[avatarSuggestionIndex];

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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCharacter ? 'Modifier le personnage' : 'Créer un personnage'}
                  </DialogTitle>
                  <DialogDescription>
                    Définissez la personnalité et le comportement de votre IA
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                  {/* Genre */}
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <div className="flex gap-2">
                      {(['male', 'female', 'neutral'] as const).map(g => (
                        <Button
                          key={g}
                          variant={formData.gender === g ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                        >
                          {g === 'male' ? '♂️ Masculin' : g === 'female' ? '♀️ Féminin' : '⚪ Neutre'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Suggestions de noms */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Nom du personnage</Label>
                      <Button variant="ghost" size="sm" onClick={regenerateNames} className="gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Régénérer
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentNames.map(name => (
                        <Button
                          key={name}
                          variant={formData.name === name ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => selectName(name)}
                        >
                          {name}
                        </Button>
                      ))}
                    </div>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ou entrez un nom personnalisé..."
                    />
                  </div>

                  {/* Suggestions d'avatars */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Avatar</Label>
                      <Button variant="ghost" size="sm" onClick={regenerateAvatars} className="gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Plus d'options
                      </Button>
                    </div>
                    <div className="flex gap-2 mb-2">
                      {currentAvatars.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => selectAvatar(emoji)}
                          className={cn(
                            "text-3xl p-2 rounded-lg border-2 transition-all hover:scale-110",
                            formData.avatar === emoji 
                              ? "border-primary bg-primary/10" 
                              : "border-transparent hover:border-muted"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={formData.avatar?.startsWith('http') ? formData.avatar : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                      placeholder="Ou URL d'image personnalisée..."
                    />
                  </div>

                  {/* Suggestions de personnalités */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Personnalité
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERSONALITY_SUGGESTIONS.map(p => (
                        <Button
                          key={p.trait}
                          variant={formData.personality === p.trait ? 'default' : 'outline'}
                          className="h-auto py-2 flex-col items-start text-left"
                          onClick={() => selectPersonality(p.trait, p.description)}
                        >
                          <span className="font-medium">{p.trait}</span>
                          <span className="text-xs opacity-70">{p.description}</span>
                        </Button>
                      ))}
                    </div>
                    <Input
                      value={formData.personality}
                      onChange={(e) => setFormData(prev => ({ ...prev, personality: e.target.value }))}
                      placeholder="Ou personnalité personnalisée..."
                      className="mt-2"
                    />
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label>System Prompt (instructions détaillées)</Label>
                    <Textarea
                      value={formData.systemPrompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      placeholder="Instructions personnalisées pour l'IA..."
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Voix ElevenLabs */}
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        Voix (ElevenLabs)
                      </Label>
                      <Button size="sm" variant="outline" onClick={testVoice}>
                        Écouter
                      </Button>
                    </div>

                    <Select
                      value={formData.voiceId}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, voiceId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une voix" />
                      </SelectTrigger>
                      <SelectContent>
                        {ELEVENLABS_VOICES.filter(v => 
                          formData.gender === 'neutral' || v.gender === formData.gender
                        ).map(voice => (
                          <SelectItem key={voice.id} value={voice.id}>
                            <div className="flex items-center gap-2">
                              <span>{voice.name}</span>
                              <span className="text-xs text-muted-foreground">
                                - {voice.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Hauteur (fallback)</span>
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
                          <span>Vitesse (fallback)</span>
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
                    {character.avatar && !character.avatar.startsWith('http') ? (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-muted">
                        {character.avatar}
                      </div>
                    ) : (
                      <>
                        <AvatarImage src={character.avatar} />
                        <AvatarFallback>
                          {character.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </>
                    )}
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
                      className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                      onClick={(e) => handleStartVoiceChat(character, e)}
                      title="Discuter en vocal"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
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

      {/* Voice Conversation Modal */}
      {selectedCharacterForVoice && (
        <VoiceConversation
          open={voiceConversationOpen}
          onOpenChange={setVoiceConversationOpen}
          characterName={selectedCharacterForVoice.name}
          characterAvatar={selectedCharacterForVoice.avatar || '🤖'}
          voiceId={(selectedCharacterForVoice as any).voiceId || 'JBFqnCBsd6RMkjVDRZzb'}
        />
      )}
    </div>
  );
}
