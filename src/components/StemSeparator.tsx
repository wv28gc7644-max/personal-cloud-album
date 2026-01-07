import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Music2, 
  Upload, 
  Loader2, 
  Download, 
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  Drum,
  Guitar,
  Music
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StemTrack {
  id: string;
  name: string;
  icon: React.ReactNode;
  audioUrl: string | null;
  color: string;
  muted: boolean;
  volume: number;
}

interface SeparationResult {
  vocals: string;
  drums: string;
  bass: string;
  other: string;
  originalFile: string;
}

export const StemSeparator = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stems, setStems] = useState<StemTrack[]>([
    { id: 'vocals', name: 'Voix', icon: <Mic className="w-4 h-4" />, audioUrl: null, color: 'bg-pink-500', muted: false, volume: 100 },
    { id: 'drums', name: 'Batterie', icon: <Drum className="w-4 h-4" />, audioUrl: null, color: 'bg-orange-500', muted: false, volume: 100 },
    { id: 'bass', name: 'Basse', icon: <Guitar className="w-4 h-4" />, audioUrl: null, color: 'bg-blue-500', muted: false, volume: 100 },
    { id: 'other', name: 'Autres', icon: <Music className="w-4 h-4" />, audioUrl: null, color: 'bg-green-500', muted: false, volume: 100 },
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [model, setModel] = useState<'demucs' | 'spleeter'>('demucs');
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceFile(file);
      setSourceUrl(URL.createObjectURL(file));
      // Reset stems
      setStems(prev => prev.map(s => ({ ...s, audioUrl: null })));
      toast.success(`Fichier "${file.name}" chargé`);
    }
  };

  const handleSeparate = async () => {
    if (!sourceFile) {
      toast.error('Veuillez d\'abord uploader un fichier audio');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio', sourceFile);
      formData.append('model', model);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 1000);

      const response = await fetch('http://localhost:3001/api/ai/audio/separate', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data: SeparationResult = await response.json();
        
        setStems(prev => prev.map(stem => ({
          ...stem,
          audioUrl: data[stem.id as keyof SeparationResult] as string || null
        })));
        
        setProgress(100);
        toast.success('Séparation terminée !');
      } else {
        throw new Error('Separation failed');
      }
    } catch (error) {
      toast.error('Erreur de séparation', {
        description: 'Vérifiez que Demucs est installé'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlayAll = () => {
    if (isPlaying) {
      // Pause all
      Object.values(audioRefs.current).forEach(audio => audio.pause());
    } else {
      // Play all unmuted stems
      stems.forEach(stem => {
        if (stem.audioUrl && !stem.muted && audioRefs.current[stem.id]) {
          audioRefs.current[stem.id].currentTime = 0;
          audioRefs.current[stem.id].play();
        }
      });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (stemId: string) => {
    setStems(prev => prev.map(s => {
      if (s.id === stemId) {
        const newMuted = !s.muted;
        if (audioRefs.current[stemId]) {
          audioRefs.current[stemId].muted = newMuted;
        }
        return { ...s, muted: newMuted };
      }
      return s;
    }));
  };

  const playSingleStem = (stemId: string) => {
    // Pause all
    Object.values(audioRefs.current).forEach(audio => audio.pause());
    
    // Play only this stem
    if (audioRefs.current[stemId]) {
      audioRefs.current[stemId].currentTime = 0;
      audioRefs.current[stemId].play();
    }
  };

  const downloadStem = (stem: StemTrack) => {
    if (stem.audioUrl) {
      const a = document.createElement('a');
      a.href = stem.audioUrl;
      a.download = `${sourceFile?.name.replace(/\.[^/.]+$/, '')}_${stem.id}.wav`;
      a.click();
    }
  };

  const downloadAll = () => {
    stems.forEach(stem => {
      if (stem.audioUrl) {
        downloadStem(stem);
      }
    });
  };

  const hasSeparatedStems = stems.some(s => s.audioUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music2 className="w-5 h-5 text-cyan-500" />
          Séparation de Pistes (Stems)
        </CardTitle>
        <CardDescription>
          Isolez voix, batterie, basse et autres instruments avec Demucs (Meta)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label>Fichier audio source</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-6">
            {sourceFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Music className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium">{sourceFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(sourceFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <label>
                  <Button variant="outline" asChild>
                    <span>Changer</span>
                  </Button>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-3 cursor-pointer">
                <Upload className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Cliquez pour uploader</p>
                  <p className="text-sm text-muted-foreground">MP3, WAV, FLAC (max 100MB)</p>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Model Selection */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div>
            <Label className="text-sm font-medium">Modèle de séparation</Label>
            <p className="text-xs text-muted-foreground">
              {model === 'demucs' ? 'Meilleure qualité, plus lent' : 'Plus rapide, qualité correcte'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={model === 'demucs' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModel('demucs')}
            >
              Demucs
            </Button>
            <Button
              variant={model === 'spleeter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModel('spleeter')}
            >
              Spleeter
            </Button>
          </div>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Séparation en cours...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              Ce processus peut prendre plusieurs minutes selon la durée du fichier
            </p>
          </div>
        )}

        {/* Separate Button */}
        <Button
          onClick={handleSeparate}
          disabled={!sourceFile || isProcessing}
          className="w-full gap-2"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Séparation en cours...
            </>
          ) : (
            <>
              <Music2 className="w-4 h-4" />
              Séparer les pistes
            </>
          )}
        </Button>

        {/* Stems Mixer */}
        {hasSeparatedStems && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Pistes séparées</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePlayAll}
                  className="gap-2"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Jouer tout'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAll}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Tout télécharger
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {stems.map(stem => (
                <div
                  key={stem.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    stem.audioUrl 
                      ? stem.muted 
                        ? "bg-muted/30 opacity-50" 
                        : "bg-muted/30"
                      : "bg-muted/10 opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white", stem.color)}>
                        {stem.icon}
                      </div>
                      <span className="font-medium">{stem.name}</span>
                    </div>
                    {stem.audioUrl && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => playSingleStem(stem.id)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleMute(stem.id)}
                        >
                          {stem.muted ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => downloadStem(stem)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Hidden audio elements */}
                  {stem.audioUrl && (
                    <audio
                      ref={el => { if (el) audioRefs.current[stem.id] = el; }}
                      src={stem.audioUrl}
                      loop
                    />
                  )}

                  {!stem.audioUrl && (
                    <p className="text-xs text-muted-foreground">
                      En attente de séparation...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
