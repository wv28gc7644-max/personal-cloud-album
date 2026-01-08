import { useState, useRef } from 'react';
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
  Mic, 
  Play, 
  Pause,
  Loader2, 
  Download, 
  Upload,
  Trash2,
  Volume2,
  User,
  Plus,
  Wand2,
  Square,
  FolderPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAICreations } from '@/hooks/useAICreations';

interface VoiceProfile {
  id: string;
  name: string;
  audioSamples: string[];
  createdAt: Date;
  language: string;
}

interface GeneratedAudio {
  id: string;
  text: string;
  audioUrl: string;
  voiceId: string;
  createdAt: Date;
}

export const VoiceCloner = () => {
  const { saveCreation } = useAICreations();
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState('');
  const [generatedAudios, setGeneratedAudios] = useState<GeneratedAudio[]>([]);
  const [newVoiceName, setNewVoiceName] = useState('');
  const [recordedSamples, setRecordedSamples] = useState<string[]>([]);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedSamples(prev => [...prev, audioUrl]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Enregistrement en cours...', { description: 'Parlez clairement pendant 10-30 secondes' });
    } catch (error) {
      toast.error('Erreur d\'accès au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const url = URL.createObjectURL(file);
        setRecordedSamples(prev => [...prev, url]);
      });
      toast.success(`${files.length} fichier(s) audio ajouté(s)`);
    }
  };

  const removeSample = (index: number) => {
    setRecordedSamples(prev => prev.filter((_, i) => i !== index));
  };

  const trainVoice = async () => {
    if (!newVoiceName.trim()) {
      toast.error('Veuillez nommer la voix');
      return;
    }

    if (recordedSamples.length === 0) {
      toast.error('Ajoutez au moins un échantillon audio');
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);

    try {
      // Simulate training progress
      const interval = setInterval(() => {
        setTrainingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 500);

      // Call local RVC/XTTS training endpoint
      const response = await fetch('http://localhost:3001/api/ai/voice/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVoiceName,
          samples: recordedSamples,
          engine: 'xtts' // or 'rvc'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newVoice: VoiceProfile = {
          id: data.voiceId || crypto.randomUUID(),
          name: newVoiceName,
          audioSamples: recordedSamples,
          createdAt: new Date(),
          language: 'fr'
        };
        
        setVoices(prev => [...prev, newVoice]);
        setSelectedVoice(newVoice.id);
        setNewVoiceName('');
        setRecordedSamples([]);
        toast.success('Voix clonée avec succès !');
      } else {
        throw new Error('Training failed');
      }
    } catch (error) {
      toast.error('Erreur lors du clonage', {
        description: 'Vérifiez que XTTS/RVC est installé'
      });
    } finally {
      setIsTraining(false);
      setTrainingProgress(0);
    }
  };

  const generateSpeech = async () => {
    if (!textToSpeak.trim()) {
      toast.error('Veuillez entrer du texte');
      return;
    }

    if (!selectedVoice) {
      toast.error('Sélectionnez une voix');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('http://localhost:3001/api/ai/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceId: selectedVoice,
          speed,
          pitch,
          language: 'fr'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newAudio: GeneratedAudio = {
          id: crypto.randomUUID(),
          text: textToSpeak,
          audioUrl: data.audioUrl,
          voiceId: selectedVoice,
          createdAt: new Date()
        };
        
        setGeneratedAudios(prev => [newAudio, ...prev]);
        
        // Auto-save to gallery
        const voiceName = voices.find(v => v.id === selectedVoice)?.name || 'Unknown';
        await saveCreation({
          type: 'voice',
          name: `${voiceName} - ${textToSpeak.slice(0, 30)}...`,
          url: data.audioUrl,
          metadata: {
            text: textToSpeak,
            voiceId: selectedVoice,
            voiceName,
            speed,
            pitch,
            model: 'XTTS'
          }
        });
        
        // Auto-play
        const audio = new Audio(data.audioUrl);
        audio.play();
        
        toast.success('Audio généré et sauvegardé !');
      } else {
        throw new Error('Synthesis failed');
      }
    } catch (error) {
      toast.error('Erreur de synthèse vocale');
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = (url: string) => {
    if (playingAudioRef.current) {
      playingAudioRef.current.pause();
    }
    const audio = new Audio(url);
    playingAudioRef.current = audio;
    audio.play();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-pink-500" />
          Clonage de Voix
        </CardTitle>
        <CardDescription>
          Clonez n'importe quelle voix avec XTTS-v2 / RVC et générez du texte parlé
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Creation Section */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Créer une nouvelle voix
          </div>

          <div className="space-y-2">
            <Label>Nom de la voix</Label>
            <Input
              value={newVoiceName}
              onChange={(e) => setNewVoiceName(e.target.value)}
              placeholder="Ex: Ma voix, Morgan Freeman, etc."
            />
          </div>

          {/* Recording Controls */}
          <div className="flex gap-2">
            <Button
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
              className="gap-2"
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4" />
                  Arrêter
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </Button>

            <label>
              <Button variant="outline" className="gap-2" asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  Uploader audio
                </span>
              </Button>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Recorded Samples */}
          {recordedSamples.length > 0 && (
            <div className="space-y-2">
              <Label>Échantillons ({recordedSamples.length})</Label>
              <div className="flex flex-wrap gap-2">
                {recordedSamples.map((sample, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => playAudio(sample)}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                    <span className="text-sm">Sample {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeSample(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training Progress */}
          {isTraining && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Entraînement du modèle...</span>
                <span>{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} />
            </div>
          )}

          <Button
            onClick={trainVoice}
            disabled={isTraining || recordedSamples.length === 0 || !newVoiceName.trim()}
            className="w-full gap-2"
          >
            {isTraining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Clonage en cours...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Cloner la voix
              </>
            )}
          </Button>
        </div>

        {/* Voice Selection */}
        {voices.length > 0 && (
          <div className="space-y-2">
            <Label>Voix disponibles</Label>
            <div className="grid grid-cols-2 gap-2">
              {voices.map(voice => (
                <Button
                  key={voice.id}
                  variant={selectedVoice === voice.id ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => setSelectedVoice(voice.id)}
                >
                  <User className="w-4 h-4" />
                  {voice.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Text to Speech */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Texte à synthétiser</Label>
            <Textarea
              value={textToSpeak}
              onChange={(e) => setTextToSpeak(e.target.value)}
              placeholder="Entrez le texte que vous voulez faire dire..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vitesse: {speed.toFixed(1)}x</Label>
              <Slider
                value={[speed]}
                onValueChange={([v]) => setSpeed(v)}
                min={0.5}
                max={2.0}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label>Tonalité: {pitch.toFixed(1)}</Label>
              <Slider
                value={[pitch]}
                onValueChange={([v]) => setPitch(v)}
                min={0.5}
                max={1.5}
                step={0.1}
              />
            </div>
          </div>

          <Button
            onClick={generateSpeech}
            disabled={isGenerating || !selectedVoice || !textToSpeak.trim()}
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
                <Volume2 className="w-4 h-4" />
                Générer l'audio
              </>
            )}
          </Button>
        </div>

        {/* Generated Audios */}
        {generatedAudios.length > 0 && (
          <div className="space-y-2">
            <Label>Audios générés</Label>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {generatedAudios.map(audio => (
                  <div
                    key={audio.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => playAudio(audio.audioUrl)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <p className="flex-1 text-sm truncate">{audio.text}</p>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {voices.length === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Créez une voix ci-dessus pour commencer à générer du texte parlé
          </p>
        )}
      </CardContent>
    </Card>
  );
};
