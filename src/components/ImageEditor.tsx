import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Paintbrush, 
  Eraser,
  Upload, 
  Loader2, 
  Download, 
  Wand2,
  Undo,
  Redo,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Square,
  Circle,
  Expand
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tool = 'brush' | 'eraser' | 'move';
type Mode = 'inpaint' | 'outpaint';

export const ImageEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('inpaint');
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [outpaintDirection, setOutpaintDirection] = useState<'left' | 'right' | 'up' | 'down'>('right');
  const [outpaintAmount, setOutpaintAmount] = useState(256);

  useEffect(() => {
    if (image && canvasRef.current && maskCanvasRef.current) {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');

      canvas.width = image.width;
      canvas.height = image.height;
      maskCanvas.width = image.width;
      maskCanvas.height = image.height;

      if (ctx) {
        ctx.drawImage(image, 0, 0);
      }
      if (maskCtx) {
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
  }, [image]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = url;
      
      setResultUrl(null);
      setHistory([]);
      setHistoryIndex(-1);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return;

    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'brush' ? 'white' : 'black';
    ctx.fill();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'move') return;
    setIsDrawing(true);
    
    // Save state for undo
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
        setHistoryIndex(prev => prev + 1);
      }
    }
    
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
  };

  const undo = () => {
    if (historyIndex <= 0 || !maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.putImageData(history[historyIndex - 1], 0, 0);
      setHistoryIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (historyIndex >= history.length - 1 || !maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.putImageData(history[historyIndex + 1], 0, 0);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const processImage = async () => {
    if (!image || !maskCanvasRef.current) {
      toast.error('Uploadez une image et dessinez un masque');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const maskDataUrl = maskCanvasRef.current.toDataURL('image/png');

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 3, 90));
      }, 500);

      const response = await fetch('http://localhost:3001/api/ai/image/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageUrl,
          mask: maskDataUrl,
          prompt,
          negativePrompt,
          mode,
          outpaintDirection: mode === 'outpaint' ? outpaintDirection : undefined,
          outpaintAmount: mode === 'outpaint' ? outpaintAmount : undefined
        })
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const data = await response.json();
        setResultUrl(data.imageUrl);
        setProgress(100);
        toast.success(`${mode === 'inpaint' ? 'Inpainting' : 'Outpainting'} terminé !`);
      } else {
        throw new Error('Processing failed');
      }
    } catch (error) {
      toast.error('Erreur lors du traitement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-amber-500" />
          Éditeur d'Images IA
        </CardTitle>
        <CardDescription>
          Inpainting (modifier des zones) et Outpainting (étendre l'image)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inpaint" className="gap-2">
              <Paintbrush className="w-4 h-4" />
              Inpainting
            </TabsTrigger>
            <TabsTrigger value="outpaint" className="gap-2">
              <Expand className="w-4 h-4" />
              Outpainting
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Image Upload & Canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Image</Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
                <Undo className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={clearMask}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative border rounded-lg overflow-hidden bg-[url('/placeholder.svg')] bg-repeat">
            {image ? (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto"
                />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 max-w-full h-auto opacity-50 cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ mixBlendMode: 'screen' }}
                />
              </div>
            ) : (
              <label className="flex flex-col items-center gap-3 cursor-pointer py-12">
                <Upload className="w-12 h-12 text-muted-foreground" />
                <span className="text-muted-foreground">
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

        {/* Tools */}
        {image && (
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex gap-1">
              <Button
                variant={tool === 'brush' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTool('brush')}
              >
                <Paintbrush className="w-4 h-4" />
              </Button>
              <Button
                variant={tool === 'eraser' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTool('eraser')}
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-1">
              <Label className="text-xs">Taille: {brushSize}px</Label>
              <Slider
                value={[brushSize]}
                onValueChange={([v]) => setBrushSize(v)}
                min={5}
                max={100}
              />
            </div>
          </div>
        )}

        {/* Outpaint Options */}
        {mode === 'outpaint' && image && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="grid grid-cols-4 gap-1">
                {(['left', 'right', 'up', 'down'] as const).map(dir => (
                  <Button
                    key={dir}
                    variant={outpaintDirection === dir ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOutpaintDirection(dir)}
                  >
                    {dir === 'left' && '←'}
                    {dir === 'right' && '→'}
                    {dir === 'up' && '↑'}
                    {dir === 'down' && '↓'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Extension: {outpaintAmount}px</Label>
              <Slider
                value={[outpaintAmount]}
                onValueChange={([v]) => setOutpaintAmount(v)}
                min={128}
                max={512}
                step={64}
              />
            </div>
          </div>
        )}

        {/* Prompts */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              {mode === 'inpaint' ? 'Quoi générer dans la zone masquée ?' : 'Description de l\'extension'}
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === 'inpaint' 
                ? "Ex: un chat orange, des fleurs, un ciel bleu..."
                : "Ex: continuation du paysage, plus de forêt..."
              }
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Prompt négatif (optionnel)</Label>
            <Input
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Ce que vous ne voulez pas..."
            />
          </div>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'inpaint' ? 'Inpainting' : 'Outpainting'} en cours...
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
            <img src={resultUrl} alt="Result" className="w-full rounded" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2">
                <Download className="w-4 h-4" />
                Télécharger
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  const img = new Image();
                  img.onload = () => setImage(img);
                  img.src = resultUrl;
                  setImageUrl(resultUrl);
                  setResultUrl(null);
                }}
              >
                Continuer l'édition
              </Button>
            </div>
          </div>
        )}

        {/* Process Button */}
        <Button
          onClick={processImage}
          disabled={!image || isProcessing}
          className="w-full gap-2"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              {mode === 'inpaint' ? 'Appliquer Inpainting' : 'Étendre l\'image'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
