import { useState, useRef, useCallback } from 'react';
import { MediaItem } from '@/types/media';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Download, Loader2, AlertTriangle, CheckCircle, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { getLocalServerUrl } from '@/utils/localServerUrl';
import { cn } from '@/lib/utils';

interface UpscaleModalProps {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Scale = 2 | 4 | 8;

const SCALE_OPTIONS: { value: Scale; label: string }[] = [
  { value: 2, label: '×2' },
  { value: 4, label: '×4' },
  { value: 8, label: '×8' },
];

interface GpuInfo {
  id: number;
  name: string;
  type: string;
  vram: number;
  priority: number;
}

export function UpscaleModal({ item, open, onOpenChange }: UpscaleModalProps) {
  const [scale, setScale] = useState<Scale>(4);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [cacheBuster, setCacheBuster] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gpus, setGpus] = useState<GpuInfo[]>([]);
  const [selectedGpu, setSelectedGpu] = useState<number | null>(null);
  // Comparison slider
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const serverBase = getLocalServerUrl();

  // Detect GPUs on open
  const gpuDetected = useRef(false);
  const detectGpus = useCallback(async () => {
    if (gpuDetected.current) return;
    gpuDetected.current = true;
    try {
      const r = await fetch(`${serverBase}/api/detect-gpus`);
      if (r.ok) {
        const data = await r.json();
        setGpus(data.gpus || []);
        if (data.recommended) setSelectedGpu(data.recommended.id);
      }
    } catch {}
  }, [serverBase]);

  if (open && !gpuDetected.current) detectGpus();

  const reset = () => {
    setResultUrl(null);
    setFileSize(null);
    setCacheBuster(0);
    setError(null);
    setProgress(0);
    setProgressMsg('');
    setSliderPos(50);
  };

  const handleClose = () => {
    if (isUpscaling) return;
    reset();
    onOpenChange(false);
  };

  const handleUpscale = async () => {
    if (!item) return;
    reset();
    setIsUpscaling(true);
    setProgress(5);
    setProgressMsg('Envoi au service d\'upscaling…');

    const sentPath = item.sourcePath || item.url;
    console.log('[Upscale] Envoi mediaPath:', sentPath);
    console.log('[Upscale] item.sourcePath:', item.sourcePath);
    console.log('[Upscale] item.url:', item.url);
    console.log('[Upscale] item.isLinked:', item.isLinked);
    console.log('[Upscale] serverBase:', serverBase);

    try {
      const r = await fetch(`${serverBase}/api/upscale-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaPath: sentPath, scale, gpuId: selectedGpu }),
      });

      console.log('[Upscale] Réponse HTTP status:', r.status);

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        console.error('[Upscale] Erreur serveur:', d);
        throw new Error(d.error || `Erreur ${r.status}`);
      }

      setProgress(60);
      setProgressMsg('Traitement en cours…');

      const data = await r.json();
      console.log('[Upscale] Réponse complète:', JSON.stringify(data));
      console.log('[Upscale] URL reçue:', data.url);
      
      const fullUrl = `${serverBase}${data.url}`;
      console.log('[Upscale] URL complète image:', fullUrl);
      
      setProgress(100);
      setProgressMsg('Upscaling terminé !');
      setResultUrl(data.url);
      setFileSize(data.fileSize || null);
      setCacheBuster(Date.now());
      toast.success(`Image upscalée ×${scale}${data.fileSize ? ` (${(data.fileSize/1024/1024).toFixed(1)} Mo)` : ''} sauvegardée !`);
    } catch (err: any) {
      console.error('[Upscale] Erreur:', err);
      setError(err.message || 'Erreur inconnue');
      toast.error('Upscaling échoué : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleDownloadResult = () => {
    if (!resultUrl || !item) return;
    const a = document.createElement('a');
    a.href = `${serverBase}${resultUrl}`;
    a.download = `${item.name.replace(/\.[^.]+$/, '')}_upscaled_${scale}x${item.name.match(/\.[^.]+$/)?.[0] || ''}`;
    a.click();
  };

  // Comparison drag logic
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSliderPos(x * 100);
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  if (!item) return null;

  const thumbnailSrc = item.thumbnailUrl || item.url;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Upscaling IA — {item.name}
          </DialogTitle>
          <DialogDescription>Comparez l'image originale et upscalée</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-1">
              <p className="text-sm font-medium">Facteur d'agrandissement</p>
              <div className="flex gap-2">
                {SCALE_OPTIONS.map(opt => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={scale === opt.value ? 'default' : 'outline'}
                    onClick={() => { setScale(opt.value); reset(); }}
                    disabled={isUpscaling}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* GPU Selection */}
            {gpus.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">GPU</p>
                <div className="flex gap-2 flex-wrap">
                  {gpus.map(gpu => (
                    <Button
                      key={gpu.id}
                      size="sm"
                      variant={selectedGpu === gpu.id ? 'default' : 'outline'}
                      onClick={() => setSelectedGpu(gpu.id)}
                      disabled={isUpscaling}
                      className="text-xs"
                    >
                      {gpu.name.length > 20 ? gpu.name.slice(0, 20) + '…' : gpu.name}
                      {gpu.vram > 0 && ` (${gpu.vram > 1024 ? (gpu.vram/1024).toFixed(0) + 'G' : gpu.vram + 'M'})`}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="ml-auto">
              {!resultUrl ? (
                <Button onClick={handleUpscale} disabled={isUpscaling} className="gap-2">
                  {isUpscaling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isUpscaling ? 'Upscaling…' : `Upscaler ×${scale}`}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={reset} variant="outline" size="sm">Recommencer</Button>
                  <Button onClick={handleDownloadResult} size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Télécharger
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          {isUpscaling && (
            <div className="space-y-1.5">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{progressMsg}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Upscaling impossible</p>
                <p className="text-xs mt-0.5 opacity-80">{error}</p>
                <p className="text-xs mt-1 opacity-70">Vérifiez que le service ESRGAN (port 9004) est démarré dans Paramètres → Serveur local.</p>
              </div>
            </div>
          )}

          {/* Before / After comparison */}
          <div className="grid grid-cols-2 gap-3 text-center text-xs text-muted-foreground">
            {/* Before */}
            <div className="space-y-1">
              <p className="font-medium">Avant</p>
              <div className="rounded-lg overflow-hidden border border-border/50 aspect-video bg-muted flex items-center justify-center">
                <img src={thumbnailSrc} alt="Avant" className="max-w-full max-h-full object-contain" />
              </div>
              <p>Original</p>
            </div>

            {/* After */}
            <div className="space-y-1">
              <p className="font-medium">Après</p>
              <div className="rounded-lg overflow-hidden border border-border/50 aspect-video bg-muted flex items-center justify-center relative">
                {resultUrl ? (
                  <>
                    <img 
                      src={`${serverBase}${resultUrl}?t=${cacheBuster}`} 
                      alt="Après" 
                      className="max-w-full max-h-full object-contain"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        console.log('[Upscale] Image "Après" chargée OK:', img.naturalWidth, 'x', img.naturalHeight, `${serverBase}${resultUrl}`);
                      }}
                      onError={(e) => {
                        console.error('[Upscale] Échec chargement image "Après":', `${serverBase}${resultUrl}`);
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const msg = document.createElement('div');
                          msg.className = 'flex flex-col items-center gap-1 text-xs p-2';
                          msg.innerHTML = `<span class="text-destructive font-medium">⚠️ Image introuvable</span><span class="opacity-70 break-all text-[10px]">${serverBase}${resultUrl}</span>`;
                          parent.appendChild(msg);
                        }
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      ×{scale}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                    <ZoomIn className="w-8 h-8" />
                    <span className="text-xs">Résultat ici</span>
                  </div>
                )}
              </div>
              <p>{resultUrl ? `Upscalé ×${scale}${fileSize ? ` — ${(fileSize/1024/1024).toFixed(1)} Mo` : ''}` : '—'}</p>
            </div>
          </div>

          {/* Comparison slider (shown when result exists) */}
          {resultUrl && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-center text-muted-foreground">Glissez pour comparer</p>
              <div
                ref={sliderRef}
                className="relative rounded-lg overflow-hidden border border-border/50 aspect-video select-none cursor-col-resize"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* After (base) */}
                <img
                  src={`${serverBase}${resultUrl}?t=${cacheBuster}`}
                  alt="Après"
                  className="absolute inset-0 w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                />
                {/* Before (clipped) */}
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                  <img
                    src={thumbnailSrc}
                    alt="Avant"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ width: `${10000 / sliderPos}%`, maxWidth: 'none' }}
                  />
                </div>
                {/* Divider */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-col-resize"
                  style={{ left: `${sliderPos}%` }}
                  onMouseDown={() => { dragging.current = true; }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-3 bg-muted-foreground rounded" />
                      <div className="w-0.5 h-3 bg-muted-foreground rounded" />
                    </div>
                  </div>
                </div>
                {/* Labels */}
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Avant</div>
                <div className="absolute bottom-2 right-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Après ×{scale}</div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Les fichiers upscalés sont sauvegardés dans un sous-dossier <code className="bg-muted px-1 rounded">upscaled/</code> à côté du fichier original.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
