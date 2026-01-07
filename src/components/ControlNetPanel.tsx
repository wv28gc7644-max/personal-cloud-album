import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Layers, 
  Upload, 
  Loader2, 
  Download, 
  Play,
  User,
  Move,
  Box,
  Scan,
  Shapes
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ControlNetMode = 'pose' | 'depth' | 'canny' | 'segmentation' | 'reference';

interface ControlNetPreset {
  id: ControlNetMode;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const PRESETS: ControlNetPreset[] = [
  { id: 'pose', name: 'Pose', icon: <User className="w-4 h-4" />, description: 'Estimation de pose OpenPose' },
  { id: 'depth', name: 'Profondeur', icon: <Layers className="w-4 h-4" />, description: 'Carte de profondeur' },
  { id: 'canny', name: 'Contours', icon: <Scan className="w-4 h-4" />, description: 'Détection de contours Canny' },
  { id: 'segmentation', name: 'Segmentation', icon: <Shapes className="w-4 h-4" />, description: 'Segmentation sémantique' },
  { id: 'reference', name: 'Référence', icon: <Box className="w-4 h-4" />, description: 'Style d\'une image référence' },
];

export const ControlNetPanel = () => {
  const [mode, setMode] = useState<ControlNetMode>('pose');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [extractedControl, setExtractedControl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [controlStrength, setControlStrength] = useState(0.8);
  const [preprocessorResolution, setPreprocessorResolution] = useState(512);
  const [showPreview, setShowPreview] = useState(true);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSourceImage(url);
      setExtractedControl(null);
    }
  };

  const extractControl = async () => {
    if (!sourceImage) {
      toast.error('Uploadez une image source');
      return;
    }

    setIsExtracting(true);

    try {
      const response = await fetch('http://localhost:3001/api/ai/controlnet/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: sourceImage,
          mode,
          resolution: preprocessorResolution
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedControl(data.controlImage);
        toast.success(`${PRESETS.find(p => p.id === mode)?.name} extrait !`);
      } else {
        throw new Error('Extraction failed');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'extraction');
    } finally {
      setIsExtracting(false);
    }
  };

  const generateWithControl = async () => {
    if (!extractedControl) {
      toast.error('Extrayez d\'abord le contrôle');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 3, 90));
      }, 500);

      const response = await fetch('http://localhost:3001/api/ai/controlnet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controlImage: extractedControl,
          mode,
          strength: controlStrength,
          prompt: '', // Will be added by user in ImageGenerator
        })
      });

      clearInterval(progressInterval);

      if (response.ok) {
        setProgress(100);
        toast.success('Contrôle prêt à utiliser dans le générateur !');
      }
    } catch (error) {
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-500" />
          ControlNet
        </CardTitle>
        <CardDescription>
          Contrôlez précisément la génération avec pose, profondeur, contours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-2">
          <Label>Type de contrôle</Label>
          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map(preset => (
              <Button
                key={preset.id}
                variant={mode === preset.id ? 'default' : 'outline'}
                className="flex-col h-auto py-3 gap-1"
                onClick={() => setMode(preset.id)}
              >
                {preset.icon}
                <span className="text-xs">{preset.name}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {PRESETS.find(p => p.id === mode)?.description}
          </p>
        </div>

        {/* Source Image */}
        <div className="space-y-2">
          <Label>Image source</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              {sourceImage ? (
                <img src={sourceImage} alt="Source" className="w-full rounded" />
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer py-6">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Image source
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

            <div className="border rounded-lg p-4 bg-muted/30">
              {extractedControl ? (
                <img src={extractedControl} alt="Control" className="w-full rounded" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Layers className="w-8 h-8 mb-2" />
                  <span className="text-sm">Contrôle extrait</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4 p-3 bg-muted/30 rounded-lg">
          <div className="space-y-2">
            <Label>Résolution préprocesseur: {preprocessorResolution}px</Label>
            <Slider
              value={[preprocessorResolution]}
              onValueChange={([v]) => setPreprocessorResolution(v)}
              min={256}
              max={1024}
              step={64}
            />
          </div>

          <div className="space-y-2">
            <Label>Force du contrôle: {(controlStrength * 100).toFixed(0)}%</Label>
            <Slider
              value={[controlStrength]}
              onValueChange={([v]) => setControlStrength(v)}
              min={0.1}
              max={1.0}
              step={0.05}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Prévisualisation en temps réel</Label>
            <Switch checked={showPreview} onCheckedChange={setShowPreview} />
          </div>
        </div>

        {/* Progress */}
        {(isExtracting || isGenerating) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isExtracting ? 'Extraction...' : 'Génération...'}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={extractControl}
            disabled={!sourceImage || isExtracting}
            className="flex-1 gap-2"
            variant="outline"
          >
            {isExtracting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Scan className="w-4 h-4" />
            )}
            Extraire {PRESETS.find(p => p.id === mode)?.name}
          </Button>

          <Button
            onClick={generateWithControl}
            disabled={!extractedControl || isGenerating}
            className="flex-1 gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Utiliser dans générateur
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
