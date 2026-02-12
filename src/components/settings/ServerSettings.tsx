import { useState, useCallback, useEffect } from 'react';
import { useLocalServer } from '@/hooks/useLocalServer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Server, CheckCircle, XCircle, Loader2, RefreshCw, FolderOpen, Package, Trash2, Clock, Film } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getLocalServerUrl } from '@/utils/localServerUrl';

// ── Helpers localStorage pour les réglages vidéo ──
const VIDEO_SETTINGS_KEY = 'mediavault-video-preview-settings';

export interface VideoPreviewSettings {
  hoverDelayEnabled: boolean;
  hoverDelayMs: number;
  previewEnabled: boolean;
  previewDurationSec: number;
}

export const defaultVideoSettings: VideoPreviewSettings = {
  hoverDelayEnabled: true,
  hoverDelayMs: 500,
  previewEnabled: true,
  previewDurationSec: 5,
};

export const getVideoPreviewSettings = (): VideoPreviewSettings => {
  try {
    const raw = localStorage.getItem(VIDEO_SETTINGS_KEY);
    if (raw) return { ...defaultVideoSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultVideoSettings;
};

const saveVideoSettings = (s: VideoPreviewSettings) => {
  localStorage.setItem(VIDEO_SETTINGS_KEY, JSON.stringify(s));
};

export function ServerSettings() {
  const { isConnected, isLoading, error, testConnection, loadFilesFromServer, filesCount } = useLocalServer();
  const [serverUrl, setServerUrl] = useState(() =>
    localStorage.getItem('mediavault-server-url') || 'http://localhost:3001'
  );

  // ── Sharp status ──
  const [sharpInstalled, setSharpInstalled] = useState<boolean | null>(null);
  const [sharpChecking, setSharpChecking] = useState(false);
  const [sharpInstalling, setSharpInstalling] = useState(false);

  // ── Cache stats ──
  const [cacheStats, setCacheStats] = useState<{ files: number; sizeFormatted: string } | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);

  // ── Video preview settings ──
  const [videoSettings, setVideoSettings] = useState<VideoPreviewSettings>(getVideoPreviewSettings);

  const serverBase = getLocalServerUrl();

  // ── Fetch sharp status + cache on mount ──
  useEffect(() => {
    if (!isConnected) return;
    checkSharp();
    fetchCacheStats();
  }, [isConnected]);

  const checkSharp = async () => {
    setSharpChecking(true);
    try {
      const r = await fetch(`${serverBase}/api/check-sharp`);
      const d = await r.json();
      setSharpInstalled(d.installed);
    } catch {
      setSharpInstalled(null);
    } finally {
      setSharpChecking(false);
    }
  };

  const installSharp = async () => {
    setSharpInstalling(true);
    try {
      const r = await fetch(`${serverBase}/api/install-sharp`, { method: 'POST' });
      const d = await r.json();
      toast.success(d.message || 'Installation lancée');
    } catch {
      toast.error("Erreur lors de l'installation de sharp");
    } finally {
      setSharpInstalling(false);
    }
  };

  const fetchCacheStats = async () => {
    setCacheLoading(true);
    try {
      const r = await fetch(`${serverBase}/api/cache-stats`);
      const d = await r.json();
      setCacheStats({ files: d.files, sizeFormatted: d.sizeFormatted });
    } catch {
      setCacheStats(null);
    } finally {
      setCacheLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      await fetch(`${serverBase}/api/cache`, { method: 'DELETE' });
      toast.success('Cache vidé');
      fetchCacheStats();
    } catch {
      toast.error('Erreur lors du vidage du cache');
    }
  };

  // ── Video settings helpers ──
  const updateVideo = (patch: Partial<VideoPreviewSettings>) => {
    const next = { ...videoSettings, ...patch };
    setVideoSettings(next);
    saveVideoSettings(next);
  };

  const handleSaveUrl = () => {
    localStorage.setItem('mediavault-server-url', serverUrl);
    toast.success('URL du serveur sauvegardée');
  };

  return (
    <div className="space-y-4">
      {/* ── Connexion serveur ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Connexion au serveur local
          </CardTitle>
          <CardDescription>Connectez-vous au serveur Node.js pour synchroniser vos médias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">URL du serveur</Label>
            <div className="flex gap-2">
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:3001"
              />
              <Button onClick={handleSaveUrl} variant="secondary">Sauvegarder</Button>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <span className={cn("text-sm font-medium", isConnected ? "text-green-500" : "text-muted-foreground")}>
                {isLoading ? 'Connexion...' : isConnected ? 'Connecté' : 'Non connecté'}
              </span>
            </div>
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => testConnection()} variant="outline" className="gap-2" disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Tester la connexion
            </Button>
            <Button onClick={() => loadFilesFromServer()} variant="default" className="gap-2" disabled={isLoading || !isConnected}>
              <FolderOpen className="w-4 h-4" />
              Charger les fichiers
            </Button>
          </div>

          {filesCount > 0 && (
            <p className="text-sm text-muted-foreground">{filesCount} fichier(s) chargé(s) depuis le serveur</p>
          )}
        </CardContent>
      </Card>

      {/* ── Dépendances serveur ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Dépendances serveur
          </CardTitle>
          <CardDescription>
            Modules optionnels pour améliorer les performances. Installés sur le serveur local.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-1">
              <p className="text-sm font-medium">sharp</p>
              <p className="text-xs text-muted-foreground">
                Génère des miniatures réduites (400px) au lieu de servir l'image originale. Réduit la bande passante et accélère le chargement de la galerie.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {sharpChecking ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : sharpInstalled === true ? (
                <span className="flex items-center gap-1 text-green-500 text-xs font-medium">
                  <CheckCircle className="w-4 h-4" /> Installé
                </span>
              ) : sharpInstalled === false ? (
                <Button size="sm" onClick={installSharp} disabled={sharpInstalling} className="gap-1">
                  {sharpInstalling && <Loader2 className="w-3 h-3 animate-spin" />}
                  Installer
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Non connecté</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Cache des miniatures ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Cache des miniatures
          </CardTitle>
          <CardDescription>
            Les miniatures sont générées une seule fois puis stockées sur le serveur pour accélérer les chargements suivants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <div>
              {cacheStats ? (
                <p className="text-sm">
                  <span className="font-medium">{cacheStats.files}</span> fichier(s) ·{' '}
                  <span className="font-medium">{cacheStats.sizeFormatted}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {cacheLoading ? 'Chargement...' : 'Non disponible'}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
              <Button size="sm" variant="outline" onClick={fetchCacheStats} disabled={cacheLoading || !isConnected}>
                <RefreshCw className={cn("w-3 h-3", cacheLoading && "animate-spin")} />
              </Button>
              <Button size="sm" variant="destructive" onClick={clearCache} disabled={!isConnected} className="gap-1">
                <Trash2 className="w-3 h-3" />
                Vider
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Prévisualisation vidéo ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Prévisualisation vidéo
          </CardTitle>
          <CardDescription>
            Contrôlez le comportement des vidéos au survol des miniatures dans la galerie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* ── Délai de survol ── */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Délai avant lecture
                </p>
                <p className="text-xs text-muted-foreground">
                  Temps d'attente avant de lancer la vidéo quand vous survolez une miniature. Évite les chargements accidentels.
                </p>
              </div>
              <Switch
                checked={videoSettings.hoverDelayEnabled}
                onCheckedChange={(v) => updateVideo({ hoverDelayEnabled: v })}
              />
            </div>

            {videoSettings.hoverDelayEnabled && (
              <div className="space-y-2 pl-6">
                <Slider
                  min={0}
                  max={5000}
                  step={videoSettings.hoverDelayMs < 1000 ? 1 : 500}
                  value={[videoSettings.hoverDelayMs]}
                  onValueChange={([v]) => updateVideo({ hoverDelayMs: v })}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={5000}
                    value={videoSettings.hoverDelayMs}
                    onChange={(e) => updateVideo({ hoverDelayMs: Math.min(5000, Math.max(0, Number(e.target.value) || 0)) })}
                    className="w-24 h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">ms</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {videoSettings.hoverDelayMs < 1000
                      ? `${videoSettings.hoverDelayMs} ms`
                      : `${(videoSettings.hoverDelayMs / 1000).toFixed(1)} s`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Préchargement / durée de prévisualisation ── */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  Prévisualisation au survol
                </p>
                <p className="text-xs text-muted-foreground">
                  {videoSettings.previewEnabled
                    ? `Seules les ${videoSettings.previewDurationSec} premières secondes seront lues au survol. La suite se charge au clic.`
                    : "Désactivé : la vidéo ne joue qu'au clic pour l'ouvrir en grand. Réduit la consommation réseau et RAM."}
                </p>
              </div>
              <Switch
                checked={videoSettings.previewEnabled}
                onCheckedChange={(v) => updateVideo({ previewEnabled: v })}
              />
            </div>

            {videoSettings.previewEnabled && (
              <div className="space-y-2 pl-6">
                <Slider
                  min={1}
                  max={30}
                  step={1}
                  value={[videoSettings.previewDurationSec]}
                  onValueChange={([v]) => updateVideo({ previewDurationSec: v })}
                />
                <div className="flex items-center justify-between">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={videoSettings.previewDurationSec}
                    onChange={(e) => updateVideo({ previewDurationSec: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })}
                    className="w-20 h-8 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">{videoSettings.previewDurationSec} seconde{videoSettings.previewDurationSec > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
