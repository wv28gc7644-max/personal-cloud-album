import { useState, useEffect } from 'react';
import { useComfyUI, GenerationParams } from '@/hooks/useComfyUI';
import { useAICreations } from '@/hooks/useAICreations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Image,
  Wand2,
  Settings2,
  Download,
  Copy,
  Shuffle,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Loader2,
  XCircle,
  Plus,
  Trash2,
  Save,
  FolderPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Carré', icon: Square, width: 1024, height: 1024 },
  { id: '16:9', label: 'Paysage', icon: RectangleHorizontal, width: 1344, height: 768 },
  { id: '9:16', label: 'Portrait', icon: RectangleVertical, width: 768, height: 1344 },
  { id: '4:3', label: '4:3', icon: RectangleHorizontal, width: 1152, height: 896 },
  { id: '3:4', label: '3:4', icon: RectangleVertical, width: 896, height: 1152 }
];

const DEFAULT_SAMPLERS = [
  'euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 
  'dpmpp_sde', 'ddim', 'uni_pc', 'lms'
];

const DEFAULT_SCHEDULERS = [
  'normal', 'karras', 'exponential', 'sgm_uniform', 'simple'
];

interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
  negativePrompt: string;
}

export function ImageGenerator() {
  const {
    config,
    isConnected,
    isLoading,
    progress,
    error,
    generatedImages,
    generate,
    interrupt
  } = useComfyUI();
  
  const { saveCreation } = useAICreations();

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('ugly, blurry, low quality, distorted, deformed');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [steps, setSteps] = useState(20);
  const [cfg, setCfg] = useState(7);
  const [sampler, setSampler] = useState('euler');
  const [scheduler, setScheduler] = useState('normal');
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [batchSize, setBatchSize] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => {
    const saved = localStorage.getItem('imagegen-saved-prompts');
    return saved ? JSON.parse(saved) : [];
  });
  const [models, setModels] = useState<string[]>([]);
  const [samplers, setSamplers] = useState<string[]>(DEFAULT_SAMPLERS);

  // Save prompts to localStorage
  useEffect(() => {
    localStorage.setItem('imagegen-saved-prompts', JSON.stringify(savedPrompts));
  }, [savedPrompts]);

  const selectedRatio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[0];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Entrez un prompt');
      return;
    }

    if (!isConnected || !config.enabled) {
      toast.error('ComfyUI non connecté');
      return;
    }

    try {
      const params: GenerationParams = {
        prompt,
        negativePrompt,
        width: selectedRatio.width,
        height: selectedRatio.height,
        steps,
        cfg,
        sampler,
        scheduler,
        seed,
        batchSize
      };

      await generate(params);
      toast.success('Image(s) générée(s) !');
    } catch (err) {
      toast.error('Erreur de génération');
    }
  };

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000000));
  };

  const handleSavePrompt = () => {
    if (!prompt.trim()) return;

    const name = window.prompt('Nom du prompt :');
    if (!name) return;

    const newPrompt: SavedPrompt = {
      id: crypto.randomUUID(),
      name,
      prompt,
      negativePrompt
    };

    setSavedPrompts(prev => [...prev, newPrompt]);
    toast.success('Prompt sauvegardé');
  };

  const handleLoadPrompt = (saved: SavedPrompt) => {
    setPrompt(saved.prompt);
    setNegativePrompt(saved.negativePrompt);
    toast.info(`Prompt "${saved.name}" chargé`);
  };

  const handleDeletePrompt = (id: string) => {
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur de téléchargement');
    }
  };

  const handleSaveToGallery = async (imageUrl: string, index: number) => {
    await saveCreation({
      type: 'image',
      name: `Image ${index + 1} - ${prompt.slice(0, 30)}...`,
      url: imageUrl,
      metadata: {
        prompt,
        negativePrompt,
        width: selectedRatio.width,
        height: selectedRatio.height,
        steps,
        cfg,
        sampler,
        seed,
        model: 'ComfyUI/SD'
      }
    });
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copié');
  };

  if (!config.enabled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">ComfyUI n'est pas activé</p>
          <p className="text-sm text-muted-foreground mt-1">
            Activez-le dans Paramètres → IA Locale
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Controls */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Générateur d'Images
            </CardTitle>
            <CardDescription>
              Créez des images avec Stable Diffusion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prompt</Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={handleCopyPrompt}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleSavePrompt}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Une photo ultra-réaliste d'un chat astronaute sur la lune..."
                className="min-h-[100px]"
              />
            </div>

            {/* Negative Prompt */}
            <div className="space-y-2">
              <Label>Prompt négatif</Label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Ce que vous ne voulez pas voir..."
                className="min-h-[60px]"
              />
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <Button
                    key={ratio.id}
                    variant={aspectRatio === ratio.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAspectRatio(ratio.id)}
                    className="flex-1"
                  >
                    <ratio.icon className="w-4 h-4 mr-1" />
                    {ratio.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Batch Size */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Nombre d'images</Label>
                <span className="text-sm text-muted-foreground">{batchSize}</span>
              </div>
              <Slider
                value={[batchSize]}
                onValueChange={([v]) => setBatchSize(v)}
                min={1}
                max={4}
                step={1}
              />
            </div>

            {/* Advanced Settings Toggle */}
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Paramètres avancés
              </span>
              <span>{showAdvanced ? '−' : '+'}</span>
            </Button>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Steps</Label>
                    <span className="text-sm text-muted-foreground">{steps}</span>
                  </div>
                  <Slider
                    value={[steps]}
                    onValueChange={([v]) => setSteps(v)}
                    min={1}
                    max={50}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>CFG Scale</Label>
                    <span className="text-sm text-muted-foreground">{cfg}</span>
                  </div>
                  <Slider
                    value={[cfg]}
                    onValueChange={([v]) => setCfg(v)}
                    min={1}
                    max={20}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sampler</Label>
                  <Select value={sampler} onValueChange={setSampler}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {samplers.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Scheduler</Label>
                  <Select value={scheduler} onValueChange={setScheduler}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_SCHEDULERS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Seed</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={seed ?? ''}
                      onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Aléatoire"
                    />
                    <Button variant="outline" size="icon" onClick={handleRandomSeed}>
                      <Shuffle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            {(progress.status === 'queued' || progress.status === 'generating') && (
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {progress.status === 'queued' ? 'En attente...' : 'Génération...'}
                  </span>
                  <span>
                    {progress.currentStep && progress.totalSteps
                      ? `${progress.currentStep}/${progress.totalSteps}`
                      : `${Math.round(progress.progress)}%`
                    }
                  </span>
                </div>
                <Progress value={progress.progress} />
              </div>
            )}

            {/* Generate Button */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Générer
                  </>
                )}
              </Button>
              {isLoading && (
                <Button variant="destructive" onClick={interrupt}>
                  Annuler
                </Button>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Images générées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((url, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border">
                    <AspectRatio ratio={selectedRatio.width / selectedRatio.height}>
                      <img
                        src={url}
                        alt={`Generated ${i + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </AspectRatio>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleDownload(url)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleSaveToGallery(url, i)}>
                        <FolderPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - Saved Prompts */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prompts sauvegardés</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {savedPrompts.map((saved) => (
                  <div
                    key={saved.id}
                    className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer group"
                    onClick={() => handleLoadPrompt(saved)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{saved.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePrompt(saved.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {saved.prompt}
                    </p>
                  </div>
                ))}

                {savedPrompts.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Aucun prompt sauvegardé
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardContent className="py-4">
            <div className={cn(
              "flex items-center gap-2 text-sm",
              isConnected ? "text-green-600" : "text-red-600"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              {isConnected ? 'ComfyUI connecté' : 'ComfyUI déconnecté'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
