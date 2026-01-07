import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Play, 
  Loader2, 
  Download, 
  Settings2, 
  Wand2,
  Image,
  Film,
  Sparkles,
  RotateCcw,
  Pause,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useComfyUI } from '@/hooks/useComfyUI';

interface VideoGenerationParams {
  prompt: string;
  negativePrompt: string;
  frames: number;
  fps: number;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  seed: number;
  motionScale: number;
  loop: boolean;
}

const defaultParams: VideoGenerationParams = {
  prompt: '',
  negativePrompt: 'blurry, low quality, distorted, deformed',
  frames: 16,
  fps: 8,
  width: 512,
  height: 512,
  steps: 20,
  cfg: 7,
  seed: -1,
  motionScale: 1.0,
  loop: true
};

export const VideoGenerator = () => {
  const { isConnected } = useComfyUI();
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [params, setParams] = useState<VideoGenerationParams>(defaultParams);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const updateParam = <K extends keyof VideoGenerationParams>(key: K, value: VideoGenerationParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!params.prompt.trim() && mode === 'text-to-video') {
      toast.error('Veuillez entrer un prompt');
      return;
    }

    if (!sourceImage && mode === 'image-to-video') {
      toast.error('Veuillez sélectionner une image source');
      return;
    }

    setIsGeneratingVideo(true);
    setProgress(0);

    try {
      // Simulate video generation progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95));
      }, 500);

      // Build AnimateDiff workflow for ComfyUI
      const workflow = {
        workflow_type: mode === 'text-to-video' ? 'animatediff_txt2vid' : 'animatediff_img2vid',
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        frames: params.frames,
        fps: params.fps,
        width: params.width,
        height: params.height,
        steps: params.steps,
        cfg: params.cfg,
        seed: params.seed === -1 ? Math.floor(Math.random() * 2147483647) : params.seed,
        motion_scale: params.motionScale,
        loop: params.loop,
        source_image: sourceImage
      };

      const response = await fetch('http://localhost:3001/api/ai/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setGeneratedVideo(data.videoUrl);
        setProgress(100);
        toast.success('Vidéo générée avec succès !');
      } else {
        throw new Error('Erreur de génération');
      }
    } catch (error) {
      toast.error('Erreur lors de la génération vidéo', {
        description: 'Vérifiez que ComfyUI + AnimateDiff sont installés'
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSourceImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRandomSeed = () => {
    updateParam('seed', Math.floor(Math.random() * 2147483647));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5 text-purple-500" />
          Générateur de Vidéos IA
        </CardTitle>
        <CardDescription>
          Créez des vidéos avec AnimateDiff / Stable Video Diffusion via ComfyUI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text-to-video" className="gap-2">
              <Wand2 className="w-4 h-4" />
              Texte → Vidéo
            </TabsTrigger>
            <TabsTrigger value="image-to-video" className="gap-2">
              <Image className="w-4 h-4" />
              Image → Vidéo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text-to-video" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea
                placeholder="Décrivez la vidéo que vous voulez générer..."
                value={params.prompt}
                onChange={(e) => updateParam('prompt', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="image-to-video" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Image source</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                {sourceImage ? (
                  <div className="relative">
                    <img 
                      src={sourceImage} 
                      alt="Source" 
                      className="max-h-48 mx-auto rounded"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setSourceImage(null)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
                    <Image className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Cliquez pour uploader une image
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
              <Label>Instructions de mouvement</Label>
              <Textarea
                placeholder="Décrivez le mouvement souhaité..."
                value={params.prompt}
                onChange={(e) => updateParam('prompt', e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Negative Prompt */}
        <div className="space-y-2">
          <Label>Prompt négatif</Label>
          <Input
            value={params.negativePrompt}
            onChange={(e) => updateParam('negativePrompt', e.target.value)}
            placeholder="Ce que vous ne voulez pas..."
          />
        </div>

        {/* Video Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Frames: {params.frames}</Label>
            <Slider
              value={[params.frames]}
              onValueChange={([v]) => updateParam('frames', v)}
              min={8}
              max={48}
              step={4}
            />
          </div>

          <div className="space-y-2">
            <Label>FPS: {params.fps}</Label>
            <Slider
              value={[params.fps]}
              onValueChange={([v]) => updateParam('fps', v)}
              min={4}
              max={24}
              step={1}
            />
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Largeur</Label>
            <Select 
              value={params.width.toString()} 
              onValueChange={(v) => updateParam('width', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="256">256px</SelectItem>
                <SelectItem value="384">384px</SelectItem>
                <SelectItem value="512">512px</SelectItem>
                <SelectItem value="768">768px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hauteur</Label>
            <Select 
              value={params.height.toString()} 
              onValueChange={(v) => updateParam('height', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="256">256px</SelectItem>
                <SelectItem value="384">384px</SelectItem>
                <SelectItem value="512">512px</SelectItem>
                <SelectItem value="768">768px</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="w-4 h-4" />
            Paramètres avancés
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Steps: {params.steps}</Label>
              <Slider
                value={[params.steps]}
                onValueChange={([v]) => updateParam('steps', v)}
                min={10}
                max={50}
              />
            </div>

            <div className="space-y-2">
              <Label>CFG Scale: {params.cfg}</Label>
              <Slider
                value={[params.cfg]}
                onValueChange={([v]) => updateParam('cfg', v)}
                min={1}
                max={15}
                step={0.5}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motion Scale: {params.motionScale.toFixed(1)}</Label>
              <Slider
                value={[params.motionScale]}
                onValueChange={([v]) => updateParam('motionScale', v)}
                min={0.1}
                max={2.0}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label>Seed</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={params.seed}
                  onChange={(e) => updateParam('seed', parseInt(e.target.value) || -1)}
                />
                <Button variant="outline" size="icon" onClick={handleRandomSeed}>
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={params.loop}
                onCheckedChange={(v) => updateParam('loop', v)}
              />
              <Label>Boucle parfaite (GIF)</Label>
            </div>
          </div>
        </div>

        {/* Generation Progress */}
        {isGeneratingVideo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération en cours...
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Estimation: {Math.ceil((100 - progress) / 10)} secondes restantes
            </p>
          </div>
        )}

        {/* Generated Video */}
        {generatedVideo && !isGeneratingVideo && (
          <div className="space-y-2">
            <Label>Vidéo générée</Label>
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                src={generatedVideo}
                controls
                loop
                autoPlay
                muted
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2">
                <Download className="w-4 h-4" />
                Télécharger MP4
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <Film className="w-4 h-4" />
                Sauvegarder GIF
              </Button>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGeneratingVideo || !isConnected}
          className="w-full gap-2"
          size="lg"
        >
          {isGeneratingVideo ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Générer la vidéo
            </>
          )}
        </Button>

        {!isConnected && (
          <p className="text-xs text-center text-amber-500">
            ⚠️ ComfyUI non connecté. Configurez-le dans l'onglet IA Locale.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
