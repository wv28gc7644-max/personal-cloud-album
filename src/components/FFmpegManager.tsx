import { useState, useCallback, useEffect } from 'react';
import { Film, CheckCircle, XCircle, Loader2, RefreshCw, Play, Download, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FFmpegStatus {
  installed: boolean;
  version: string | null;
}

interface ThumbnailProgress {
  total: number;
  completed: number;
  current: string | null;
  failed: string[];
}

export const FFmpegManager = () => {
  const [ffmpegStatus, setFfmpegStatus] = useState<FFmpegStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ThumbnailProgress | null>(null);
  const [timestampPosition, setTimestampPosition] = useState<number>(() => 
    parseInt(localStorage.getItem('mediavault-thumbnail-position') || '25')
  );
  const [thumbnailQuality, setThumbnailQuality] = useState<string>(() => 
    localStorage.getItem('mediavault-thumbnail-quality') || 'medium'
  );

  const getServerUrl = useCallback(() => {
    const saved = localStorage.getItem('mediavault-admin-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.localServerUrl || 'http://localhost:3001';
    }
    return 'http://localhost:3001';
  }, []);

  const checkFFmpeg = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${getServerUrl()}/api/check-ffmpeg`);
      if (response.ok) {
        const data = await response.json();
        setFfmpegStatus(data);
        if (data.installed) {
          toast.success('FFmpeg détecté', { description: data.version });
        } else {
          toast.warning('FFmpeg non installé');
        }
      } else {
        setFfmpegStatus({ installed: false, version: null });
        toast.error('Erreur de connexion au serveur');
      }
    } catch (err) {
      setFfmpegStatus({ installed: false, version: null });
      toast.error('Serveur non accessible');
    } finally {
      setIsChecking(false);
    }
  }, [getServerUrl]);

  const generateAllThumbnails = useCallback(async () => {
    setIsGenerating(true);
    setProgress({ total: 0, completed: 0, current: null, failed: [] });
    
    try {
      const response = await fetch(`${getServerUrl()}/api/generate-all-thumbnails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          position: timestampPosition / 100,
          quality: thumbnailQuality 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setProgress({
          total: result.total,
          completed: result.completed,
          current: null,
          failed: result.failed || []
        });
        
        if (result.completed > 0) {
          toast.success(`${result.completed} thumbnails générés`, {
            description: result.failed?.length > 0 ? `${result.failed.length} échecs` : undefined
          });
        } else if (result.total === 0) {
          toast.info('Aucune vidéo sans thumbnail trouvée');
        }
      } else {
        toast.error('Erreur lors de la génération');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setIsGenerating(false);
    }
  }, [getServerUrl, timestampPosition, thumbnailQuality]);

  const handlePositionChange = (value: number[]) => {
    setTimestampPosition(value[0]);
    localStorage.setItem('mediavault-thumbnail-position', value[0].toString());
  };

  const handleQualityChange = (value: string) => {
    setThumbnailQuality(value);
    localStorage.setItem('mediavault-thumbnail-quality', value);
  };

  useEffect(() => {
    checkFFmpeg();
  }, []);

  const progressPercent = progress ? (progress.total > 0 ? (progress.completed / progress.total) * 100 : 0) : 0;

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" />
            Génération de thumbnails (FFmpeg)
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkFFmpeg}
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </CardTitle>
        <CardDescription>
          Générez des miniatures haute qualité pour vos vidéos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status FFmpeg */}
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          ffmpegStatus?.installed 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-amber-500/10 border-amber-500/30"
        )}>
          {ffmpegStatus === null ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : ffmpegStatus.installed ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-500" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {ffmpegStatus === null 
                ? 'Vérification...' 
                : ffmpegStatus.installed 
                  ? 'FFmpeg installé' 
                  : 'FFmpeg non détecté'}
            </p>
            {ffmpegStatus?.version && (
              <p className="text-xs text-muted-foreground">{ffmpegStatus.version}</p>
            )}
          </div>
          {!ffmpegStatus?.installed && (
            <a 
              href="https://www.gyan.dev/ffmpeg/builds/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Télécharger
            </a>
          )}
        </div>

        {/* Settings */}
        {ffmpegStatus?.installed && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Paramètres de génération</span>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Position de capture</Label>
                  <span className="text-xs text-muted-foreground">{timestampPosition}% de la vidéo</span>
                </div>
                <Slider
                  value={[timestampPosition]}
                  onValueChange={handlePositionChange}
                  min={5}
                  max={95}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Choisissez à quel moment de la vidéo capturer la miniature
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Qualité du thumbnail</Label>
                <Select value={thumbnailQuality} onValueChange={handleQualityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse (240p) - Plus rapide</SelectItem>
                    <SelectItem value="medium">Moyenne (480p) - Recommandé</SelectItem>
                    <SelectItem value="high">Haute (720p) - Meilleure qualité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {isGenerating && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Génération en cours...</span>
              <span>{progress.completed} / {progress.total}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {progress.current && (
              <p className="text-xs text-muted-foreground truncate">
                En cours : {progress.current}
              </p>
            )}
          </div>
        )}

        {/* Result */}
        {!isGenerating && progress && progress.completed > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm">
              {progress.completed} thumbnail{progress.completed > 1 ? 's' : ''} généré{progress.completed > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Failed files */}
        {progress?.failed && progress.failed.length > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{progress.failed.length} fichier(s) en échec</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
              {progress.failed.map((file, i) => (
                <li key={i} className="truncate">• {file}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Generate Button */}
        <Button 
          onClick={generateAllThumbnails}
          disabled={!ffmpegStatus?.installed || isGenerating}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Générer tous les thumbnails manquants
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
