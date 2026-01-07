import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  Video, 
  Upload, 
  Loader2, 
  Download, 
  Play,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

export const LipSync = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(0.8);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const processLipSync = async () => {
    if (!videoFile || !audioFile) {
      toast.error('Uploadez une vidéo et un audio');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('audio', audioFile);
      formData.append('quality', quality.toString());

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 1000);

      const response = await fetch('http://localhost:3001/api/ai/video/lipsync', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setResultUrl(data.videoUrl);
        setProgress(100);
        toast.success('Lip sync terminé !');
      } else {
        throw new Error('Processing failed');
      }
    } catch (error) {
      toast.error('Erreur lors du traitement', {
        description: 'Vérifiez que Wav2Lip/SadTalker est installé'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setAudioFile(null);
    setAudioUrl(null);
    setResultUrl(null);
    setProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-rose-500" />
          Lip Sync (Synchronisation Labiale)
        </CardTitle>
        <CardDescription>
          Synchronisez les lèvres d'une vidéo avec un nouvel audio (Wav2Lip / SadTalker)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Video Upload */}
          <div className="space-y-2">
            <Label>Vidéo source (avec visage)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded max-h-40 object-cover"
                />
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
                  <Video className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Uploader une vidéo
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Audio Upload */}
          <div className="space-y-2">
            <Label>Audio à synchroniser</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              {audioUrl ? (
                <div className="space-y-2">
                  <audio src={audioUrl} controls className="w-full" />
                  <p className="text-xs text-muted-foreground text-center">
                    {audioFile?.name}
                  </p>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
                  <Mic className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Uploader un audio
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Quality Setting */}
        <div className="space-y-2">
          <Label>Qualité: {(quality * 100).toFixed(0)}%</Label>
          <Slider
            value={[quality]}
            onValueChange={([v]) => setQuality(v)}
            min={0.5}
            max={1.0}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            Plus élevé = meilleure qualité mais plus lent
          </p>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Traitement en cours...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Result */}
        {resultUrl && (
          <div className="space-y-2">
            <Label>Résultat</Label>
            <video
              src={resultUrl}
              controls
              autoPlay
              className="w-full rounded"
            />
            <Button variant="outline" className="w-full gap-2">
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={processLipSync}
            disabled={!videoFile || !audioFile || isProcessing}
            className="flex-1 gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Lancer le Lip Sync
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
