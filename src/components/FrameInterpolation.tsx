import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Film, 
  Upload, 
  Loader2, 
  Download, 
  Play,
  Gauge,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export const FrameInterpolation = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [targetFps, setTargetFps] = useState('60');
  const [model, setModel] = useState<'rife' | 'film'>('rife');
  const [slowMotion, setSlowMotion] = useState(1);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResultUrl(null);
    }
  };

  const processInterpolation = async () => {
    if (!videoFile) {
      toast.error('Uploadez une vidéo');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('targetFps', targetFps);
      formData.append('model', model);
      formData.append('slowMotion', slowMotion.toString());

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 90));
      }, 500);

      const response = await fetch('http://localhost:3001/api/ai/video/interpolate', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setResultUrl(data.videoUrl);
        setProgress(100);
        toast.success('Interpolation terminée !');
      } else {
        throw new Error('Processing failed');
      }
    } catch (error) {
      toast.error('Erreur lors du traitement', {
        description: 'Vérifiez que RIFE/FILM est installé'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="w-5 h-5 text-cyan-500" />
          Interpolation de Frames
        </CardTitle>
        <CardDescription>
          Augmentez le FPS de vos vidéos ou créez du slow motion fluide (RIFE / FILM)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Upload */}
        <div className="space-y-2">
          <Label>Vidéo source</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-4">
            {videoUrl ? (
              <div className="space-y-2">
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded max-h-48"
                />
                <label className="block">
                  <Button variant="outline" size="sm" asChild>
                    <span>Changer de vidéo</span>
                  </Button>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 cursor-pointer py-6">
                <Upload className="w-10 h-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Cliquez pour uploader une vidéo
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

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              FPS cible
            </Label>
            <Select value={targetFps} onValueChange={setTargetFps}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 FPS</SelectItem>
                <SelectItem value="60">60 FPS</SelectItem>
                <SelectItem value="120">120 FPS</SelectItem>
                <SelectItem value="240">240 FPS (slow motion)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modèle</Label>
            <Select value={model} onValueChange={(v) => setModel(v as 'rife' | 'film')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rife">RIFE (rapide)</SelectItem>
                <SelectItem value="film">FILM (qualité)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Slow Motion */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Slow Motion: {slowMotion}x
          </Label>
          <Slider
            value={[slowMotion]}
            onValueChange={([v]) => setSlowMotion(v)}
            min={1}
            max={8}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            1x = vitesse normale, 8x = 8 fois plus lent
          </p>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Interpolation en cours...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              Ce processus peut prendre plusieurs minutes
            </p>
          </div>
        )}

        {/* Result */}
        {resultUrl && (
          <div className="space-y-2">
            <Label>Résultat ({targetFps} FPS)</Label>
            <video
              src={resultUrl}
              controls
              autoPlay
              loop
              className="w-full rounded"
            />
            <Button variant="outline" className="w-full gap-2">
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          </div>
        )}

        {/* Process Button */}
        <Button
          onClick={processInterpolation}
          disabled={!videoFile || isProcessing}
          className="w-full gap-2"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Lancer l'interpolation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
