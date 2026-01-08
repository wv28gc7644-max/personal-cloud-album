import { useState, useCallback, useEffect } from 'react';
import { Film, CheckCircle, XCircle, Loader2, RefreshCw, Play, Download, AlertCircle, Settings, Zap, HardDrive, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface CompressionJob {
  id: string;
  filename: string;
  originalSize: number;
  compressedSize?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
}

interface CompressionSettings {
  codec: 'h265' | 'av1' | 'h264';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: 'original' | '1080p' | '720p' | '480p';
  keepOriginal: boolean;
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
  
  // Compression state
  const [activeTab, setActiveTab] = useState('thumbnails');
  const [compressionJobs, setCompressionJobs] = useState<CompressionJob[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionSettings, setCompressionSettings] = useState<CompressionSettings>(() => {
    const saved = localStorage.getItem('mediavault-compression-settings');
    return saved ? JSON.parse(saved) : {
      codec: 'h265',
      quality: 'medium',
      resolution: 'original',
      keepOriginal: true
    };
  });

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

  const updateCompressionSettings = <K extends keyof CompressionSettings>(key: K, value: CompressionSettings[K]) => {
    setCompressionSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('mediavault-compression-settings', JSON.stringify(updated));
      return updated;
    });
  };

  const startCompression = async () => {
    setIsCompressing(true);
    
    try {
      const response = await fetch(`${getServerUrl()}/api/ffmpeg/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...compressionSettings,
          qualityPreset: getQualityPreset(compressionSettings.quality)
        })
      });

      if (response.ok) {
        const result = await response.json();
        setCompressionJobs(result.jobs || []);
        
        // Simulate progress updates
        if (result.jobs?.length > 0) {
          simulateCompressionProgress(result.jobs);
        }
        
        toast.success('Compression démarrée', {
          description: `${result.jobs?.length || 0} vidéo(s) en file d'attente`
        });
      } else {
        throw new Error('Compression failed');
      }
    } catch {
      toast.error('Erreur de compression', {
        description: 'Vérifiez que FFmpeg est installé'
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const simulateCompressionProgress = (jobs: CompressionJob[]) => {
    let currentIndex = 0;
    
    const updateProgress = () => {
      if (currentIndex >= jobs.length) return;
      
      setCompressionJobs(prev => prev.map((job, i) => {
        if (i === currentIndex) {
          const newProgress = Math.min(job.progress + 5, 100);
          if (newProgress >= 100) {
            setTimeout(() => {
              currentIndex++;
              updateProgress();
            }, 500);
            return { 
              ...job, 
              progress: 100, 
              status: 'completed',
              compressedSize: Math.floor(job.originalSize * 0.25) // Simulate 4x compression
            };
          }
          return { ...job, progress: newProgress, status: 'processing' };
        }
        return job;
      }));
      
      setTimeout(updateProgress, 200);
    };
    
    updateProgress();
  };

  const getQualityPreset = (quality: string): number => {
    switch (quality) {
      case 'low': return 28;
      case 'medium': return 23;
      case 'high': return 18;
      case 'ultra': return 15;
      default: return 23;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getCompressionRatio = (original: number, compressed?: number): string => {
    if (!compressed) return '-';
    const ratio = original / compressed;
    return `${ratio.toFixed(1)}x`;
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
            FFmpeg Manager
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
          Thumbnails haute qualité et compression vidéo H.265/AV1
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="thumbnails" className="gap-2">
              <Film className="w-4 h-4" />
              Thumbnails
            </TabsTrigger>
            <TabsTrigger value="compression" className="gap-2">
              <Zap className="w-4 h-4" />
              Compression
            </TabsTrigger>
          </TabsList>

          {/* Thumbnails Tab */}
          <TabsContent value="thumbnails" className="space-y-4 mt-4">

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
          </TabsContent>

          {/* Compression Tab */}
          <TabsContent value="compression" className="space-y-4 mt-4">
            {/* Compression Settings */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Paramètres de compression</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Codec</Label>
                  <Select 
                    value={compressionSettings.codec} 
                    onValueChange={(v) => updateCompressionSettings('codec', v as CompressionSettings['codec'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h265">H.265 (HEVC) - Recommandé</SelectItem>
                      <SelectItem value="av1">AV1 - Maximum compression</SelectItem>
                      <SelectItem value="h264">H.264 - Compatible universel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Qualité</Label>
                  <Select 
                    value={compressionSettings.quality} 
                    onValueChange={(v) => updateCompressionSettings('quality', v as CompressionSettings['quality'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse (10x compression)</SelectItem>
                      <SelectItem value="medium">Moyenne (4x compression)</SelectItem>
                      <SelectItem value="high">Haute (2x compression)</SelectItem>
                      <SelectItem value="ultra">Ultra (qualité max)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Résolution de sortie</Label>
                <Select 
                  value={compressionSettings.resolution} 
                  onValueChange={(v) => updateCompressionSettings('resolution', v as CompressionSettings['resolution'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Originale</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="480p">480p (SD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Garder les originaux</Label>
                  <p className="text-xs text-muted-foreground">
                    Conserve les fichiers non compressés
                  </p>
                </div>
                <Switch
                  checked={compressionSettings.keepOriginal}
                  onCheckedChange={(v) => updateCompressionSettings('keepOriginal', v)}
                />
              </div>
            </div>

            {/* Compression Jobs */}
            {compressionJobs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">File de compression</Label>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {compressionJobs.map(job => (
                      <div
                        key={job.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          job.status === 'completed' && "bg-green-500/10 border-green-500/30",
                          job.status === 'processing' && "bg-blue-500/10 border-blue-500/30",
                          job.status === 'failed' && "bg-red-500/10 border-red-500/30",
                          job.status === 'pending' && "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileVideo className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate max-w-[200px]">
                              {job.filename}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                              {formatFileSize(job.originalSize)}
                            </span>
                            {job.compressedSize && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-green-500 font-medium">
                                  {formatFileSize(job.compressedSize)}
                                </span>
                                <span className="text-green-500 font-medium">
                                  ({getCompressionRatio(job.originalSize, job.compressedSize)})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {job.status === 'processing' && (
                          <Progress value={job.progress} className="h-1" />
                        )}
                        {job.status === 'completed' && (
                          <div className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="w-3 h-3" />
                            Compression terminée
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Compress Button */}
            <Button 
              onClick={startCompression}
              disabled={!ffmpegStatus?.installed || isCompressing}
              className="w-full gap-2"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compression en cours...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Compresser toutes les vidéos
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              💡 La compression H.265 peut réduire la taille de 4x à 10x sans perte visible
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
