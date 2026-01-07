import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ZoomIn, 
  Upload, 
  Loader2, 
  Download, 
  Play,
  Image,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const UPSCALE_MODELS = [
  { id: 'realesrgan-x4plus', name: 'RealESRGAN x4+', description: 'Général, haute qualité' },
  { id: 'realesrgan-x4plus-anime', name: 'RealESRGAN Anime', description: 'Optimisé pour anime/manga' },
  { id: 'esrgan-4x', name: 'ESRGAN 4x', description: 'Standard, rapide' },
  { id: 'ultrasharp-4x', name: '4x-UltraSharp', description: 'Maximum de détails' },
  { id: 'remacri-4x', name: '4x-Remacri', description: 'Naturel, moins de sur-netteté' },
];

export const ImageUpscaler = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(4);
  const [model, setModel] = useState('realesrgan-x4plus');
  const [denoise, setDenoise] = useState(0.5);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceFile(file);
      const url = URL.createObjectURL(file);
      setSourceImage(url);
      setResultUrl(null);

      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        setOriginalSize({ width: img.width, height: img.height });
      };
      img.src = url;
    }
  };

  const upscaleImage = async () => {
    if (!sourceFile) {
      toast.error('Uploadez une image');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', sourceFile);
      formData.append('scale', scale.toString());
      formData.append('model', model);
      formData.append('denoise', denoise.toString());

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 500);

      const response = await fetch('http://localhost:3001/api/ai/image/upscale', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setResultUrl(data.imageUrl);
        setProgress(100);
        toast.success('Upscaling terminé !');
      } else {
        throw new Error('Upscaling failed');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'upscaling', {
        description: 'Vérifiez que RealESRGAN est installé'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (resultUrl) {
      const a = document.createElement('a');
      a.href = resultUrl;
      a.download = `upscaled_${scale}x_${sourceFile?.name || 'image.png'}`;
      a.click();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZoomIn className="w-5 h-5 text-sky-500" />
          Upscaling IA
        </CardTitle>
        <CardDescription>
          Agrandissez vos images jusqu'à 8x avec RealESRGAN / ESRGAN
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Upload & Preview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Image originale</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 aspect-square flex items-center justify-center">
              {sourceImage ? (
                <div className="relative w-full h-full">
                  <img 
                    src={sourceImage} 
                    alt="Source" 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {originalSize.width} × {originalSize.height}
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Uploader une image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Résultat ({scale}x)</Label>
            <div className="border rounded-lg p-4 aspect-square flex items-center justify-center bg-muted/30">
              {resultUrl ? (
                <div className="relative w-full h-full">
                  <img 
                    src={resultUrl} 
                    alt="Upscaled" 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {originalSize.width * scale} × {originalSize.height * scale}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Sparkles className="w-10 h-10" />
                  <span className="text-sm">
                    {originalSize.width > 0 
                      ? `${originalSize.width * scale} × ${originalSize.height * scale}`
                      : 'Aperçu'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Échelle: {scale}x</Label>
            <Slider
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
              min={2}
              max={8}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2x</span>
              <span>4x</span>
              <span>8x</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modèle</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UPSCALE_MODELS.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <div>
                      <div>{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Réduction de bruit: {(denoise * 100).toFixed(0)}%</Label>
            <Slider
              value={[denoise]}
              onValueChange={([v]) => setDenoise(v)}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Upscaling en cours...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={upscaleImage}
            disabled={!sourceImage || isProcessing}
            className="flex-1 gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Upscaler {scale}x
          </Button>

          {resultUrl && (
            <Button variant="outline" onClick={downloadResult} className="gap-2">
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
