import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Music, 
  Play, 
  Pause,
  Loader2, 
  Download, 
  Wand2,
  Clock,
  Volume2,
  SkipForward
} from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedTrack {
  id: string;
  prompt: string;
  audioUrl: string;
  duration: number;
  genre: string;
  createdAt: Date;
}

const GENRES = [
  'Electronic', 'Ambient', 'Classical', 'Jazz', 'Rock', 
  'Hip-Hop', 'Pop', 'Cinematic', 'Lo-fi', 'Orchestral'
];

const MOODS = [
  'Joyeux', 'Mélancolique', 'Énergique', 'Relaxant', 
  'Épique', 'Mystérieux', 'Romantique', 'Sombre'
];

export const MusicGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Electronic');
  const [mood, setMood] = useState('Énergique');
  const [duration, setDuration] = useState(30);
  const [bpm, setBpm] = useState(120);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [continuationMode, setContinuationMode] = useState(false);
  const [sourceAudio, setSourceAudio] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() && !sourceAudio) {
      toast.error('Veuillez entrer une description ou un audio source');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 3, 95));
      }, 1000);

      const response = await fetch('http://localhost:3001/api/ai/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || `${mood} ${genre} music`,
          genre,
          mood,
          duration,
          bpm,
          continuation: continuationMode,
          sourceAudio
        })
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        const newTrack: GeneratedTrack = {
          id: crypto.randomUUID(),
          prompt: prompt || `${mood} ${genre}`,
          audioUrl: data.audioUrl,
          duration,
          genre,
          createdAt: new Date()
        };
        
        setGeneratedTracks(prev => [newTrack, ...prev]);
        setProgress(100);
        toast.success('Musique générée !');

        // Auto-play
        const audio = new Audio(data.audioUrl);
        audio.play();
        setPlayingId(newTrack.id);
      } else {
        throw new Error('Generation failed');
      }
    } catch (error) {
      toast.error('Erreur de génération', {
        description: 'Vérifiez que MusicGen/AudioCraft est installé'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSourceAudio(url);
      setContinuationMode(true);
      toast.success('Audio source ajouté pour continuation');
    }
  };

  const playTrack = (track: GeneratedTrack) => {
    const audio = new Audio(track.audioUrl);
    audio.play();
    setPlayingId(track.id);
    audio.onended = () => setPlayingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5 text-green-500" />
          Générateur de Musique
        </CardTitle>
        <CardDescription>
          Créez de la musique originale avec MusicGen / AudioCraft (Meta)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prompt */}
        <div className="space-y-2">
          <Label>Description de la musique</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez la musique que vous voulez créer... Ex: Une mélodie de piano douce avec des violons"
            className="min-h-[80px]"
          />
        </div>

        {/* Quick Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Genre</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ambiance</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOODS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Duration & BPM */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Durée: {duration}s
            </Label>
            <Slider
              value={[duration]}
              onValueChange={([v]) => setDuration(v)}
              min={10}
              max={120}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <Label>BPM: {bpm}</Label>
            <Slider
              value={[bpm]}
              onValueChange={([v]) => setBpm(v)}
              min={60}
              max={180}
              step={5}
            />
          </div>
        </div>

        {/* Continuation Mode */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SkipForward className="w-4 h-4" />
            Mode continuation
          </div>
          <p className="text-xs text-muted-foreground">
            Uploadez un extrait musical pour que l'IA le continue dans le même style
          </p>
          <label>
            <Button variant="outline" className="gap-2" asChild>
              <span>
                <Music className="w-4 h-4" />
                {sourceAudio ? 'Audio sélectionné ✓' : 'Uploader un audio'}
              </span>
            </Button>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Generation Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Composition en cours...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Générer la musique
            </>
          )}
        </Button>

        {/* Generated Tracks */}
        {generatedTracks.length > 0 && (
          <div className="space-y-2">
            <Label>Musiques générées</Label>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {generatedTracks.map(track => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <Button
                      variant={playingId === track.id ? "default" : "ghost"}
                      size="icon"
                      onClick={() => playTrack(track)}
                    >
                      {playingId === track.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{track.prompt}</p>
                      <p className="text-xs text-muted-foreground">
                        {track.genre} • {track.duration}s
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
