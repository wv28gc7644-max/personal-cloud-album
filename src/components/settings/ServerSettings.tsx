import { useState, useCallback, useEffect } from 'react';
import { useLocalServer } from '@/hooks/useLocalServer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Server, CheckCircle, XCircle, Loader2, RefreshCw, FolderOpen, Package, Trash2, Clock, Film, AlertTriangle, ExternalLink, Stethoscope, Play, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getLocalServerUrl } from '@/utils/localServerUrl';

// ── Helpers localStorage pour les réglages vidéo ──
const VIDEO_SETTINGS_KEY = 'mediavault-video-preview-settings';

export interface VideoPreviewSettings {
  hoverDelayEnabled: boolean;
  hoverDelayMs: number;
  previewEnabled: boolean;
  previewDurationSec: number;
  preloadMediaCount: number;   // 0 = rien, -1 = tous
  preloadScrollRows: number;   // 0 = écran visible seulement, -1 = toutes
  preloadBufferSeconds: number; // 0 = rien, -1 = illimité
}

export const defaultVideoSettings: VideoPreviewSettings = {
  hoverDelayEnabled: true,
  hoverDelayMs: 500,
  previewEnabled: true,
  previewDurationSec: 5,
  preloadMediaCount: 0,
  preloadScrollRows: 0,
  preloadBufferSeconds: 0,
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
  const [sharpInstallResult, setSharpInstallResult] = useState<{ success: boolean; message: string; output?: string } | null>(null);

  // ── FFmpeg status ──
  const [ffmpegInstalled, setFfmpegInstalled] = useState<boolean | null>(null);
  const [ffmpegVersion, setFfmpegVersion] = useState<string | null>(null);
  const [ffmpegChecking, setFfmpegChecking] = useState(false);
  const [ffmpegInstalling, setFfmpegInstalling] = useState(false);
  const [ffmpegProgress, setFfmpegProgress] = useState<{ step: string; progress: number; message: string } | null>(null);

  // ── ESRGAN status ──
  const [esrganAvailable, setEsrganAvailable] = useState<boolean | null>(null);
  const [esrganChecking, setEsrganChecking] = useState(false);

  // ── Cache stats ──
  const [cacheStats, setCacheStats] = useState<{ files: number; sizeFormatted: string } | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);

  // ── Cache diagnostic ──
  const [cacheDiagRunning, setCacheDiagRunning] = useState(false);
  const [cacheDiagResults, setCacheDiagResults] = useState<string | null>(null);

  // ── Pre-generate ──
  const [pregenRunning, setPregenRunning] = useState(false);
  const [pregenResults, setPregenResults] = useState<string | null>(null);

  // ── Diagnostic ──
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResults, setDiagResults] = useState<string | null>(null);

  // ── Video preview settings ──
  const [videoSettings, setVideoSettings] = useState<VideoPreviewSettings>(getVideoPreviewSettings);

  const serverBase = getLocalServerUrl();

  // Detect mixed content (HTTPS page → HTTP server)
  const isMixedContent = typeof window !== 'undefined'
    && window.location.protocol === 'https:'
    && /^http:\/\//i.test(serverBase);

  // ── Auto-connexion au montage ──
  useEffect(() => {
    testConnection({ silent: true });
  }, []);

  // ── Fetch sharp status + cache on mount ──
  useEffect(() => {
    if (!isConnected) return;
    checkSharp();
    checkFfmpeg();
    checkEsrgan();
    fetchCacheStats();
  }, [isConnected]);

  const checkEsrgan = async () => {
    setEsrganChecking(true);
    try {
      const r = await fetch('http://localhost:9004/health', { signal: AbortSignal.timeout(3000) });
      setEsrganAvailable(r.ok);
    } catch {
      setEsrganAvailable(false);
    } finally {
      setEsrganChecking(false);
    }
  };



  const checkFfmpeg = async () => {
    setFfmpegChecking(true);
    try {
      const r = await fetch(`${serverBase}/api/check-ffmpeg`);
      const d = await r.json();
      setFfmpegInstalled(d.installed);
      if (d.version) setFfmpegVersion(d.version);
    } catch {
      setFfmpegInstalled(null);
    } finally {
      setFfmpegChecking(false);
    }
  };

  const installFfmpeg = async () => {
    setFfmpegInstalling(true);
    setFfmpegProgress({ step: 'downloading', progress: 5, message: 'Démarrage...' });
    try {
      await fetch(`${serverBase}/api/install-ffmpeg`, { method: 'POST' });
      // Poll status
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`${serverBase}/api/ffmpeg-install-status`);
          const d = await r.json();
          setFfmpegProgress({ step: d.step, progress: d.progress, message: d.message });
          if (d.step === 'completed' || d.step === 'failed') {
            clearInterval(poll);
            setFfmpegInstalling(false);
            if (d.step === 'completed') {
              toast.success('FFmpeg installé avec succès !');
              checkFfmpeg();
            } else {
              toast.error(d.message || 'Échec de l\'installation FFmpeg');
            }
          }
        } catch {
          clearInterval(poll);
          setFfmpegInstalling(false);
          toast.error('Erreur lors du suivi de l\'installation');
        }
      }, 2000);
    } catch {
      setFfmpegInstalling(false);
      toast.error('Erreur réseau lors de l\'installation FFmpeg');
    }
  };

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
    setSharpInstallResult(null);
    try {
      const r = await fetch(`${serverBase}/api/install-sharp`, { method: 'POST' });
      const d = await r.json();
      setSharpInstallResult(d);
      if (d.success) {
        toast.success(d.message || 'Sharp installé avec succès');
        setSharpInstalled(d.verified || false);
        if (!d.verified) {
          toast.info('Redémarrez le serveur pour activer Sharp');
        }
      } else {
        toast.error(d.message || "Échec de l'installation");
      }
      // Re-check sharp status
      checkSharp();
    } catch (e) {
      setSharpInstallResult({ success: false, message: "Erreur réseau lors de l'installation" });
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

  // ── Diagnostic cache ──
  const runCacheDiagnostic = async () => {
    setCacheDiagRunning(true);
    setCacheDiagResults(null);
    try {
      const r = await fetch(`${serverBase}/api/cache-diagnostic`, { signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      const lines = [
        `=== Diagnostic Cache — ${new Date().toLocaleString()} ===`,
        '',
        `📁 Dossier cache: ${d.cacheDir}`,
        `   Existe: ${d.cacheDirExists ? '✅ Oui' : '❌ Non'}`,
        `   Inscriptible: ${d.cacheDirWritable ? '✅ Oui' : '❌ Non'}`,
        '',
        `🔧 Sharp: ${d.sharpAvailable ? '✅ Disponible' : '❌ Non installé'}`,
        `🎬 FFmpeg: ${d.ffmpegAvailable ? '✅ Disponible' : '❌ Non trouvé'}`,
        '',
        `📊 Médias: ${d.totalMedia} fichier(s)`,
        ...(d.linkedFoldersScanned != null ? [`   Dossiers liés scannés: ${d.linkedFoldersScanned}`] : []),
        `   En cache: ${d.cachedCount}`,
        `   Manquants: ${d.missingCount}`,
        '',
        ...(d.errors.length > 0 ? ['⚠️ Erreurs:', ...d.errors.map((e: string) => `   - ${e}`)] : ['✅ Aucune erreur']),
      ];
      setCacheDiagResults(lines.join('\n'));
    } catch (err: any) {
      setCacheDiagResults(`❌ Erreur: ${err.message || 'Impossible de contacter le serveur'}`);
    } finally {
      setCacheDiagRunning(false);
    }
  };

  // ── Pré-générer les miniatures ──
  const runPregenerate = async () => {
    setPregenRunning(true);
    setPregenResults(null);
    try {
      const r = await fetch(`${serverBase}/api/generate-thumbnails`, { method: 'POST' });
      const d = await r.json();
      const lines = [
        `=== Pré-génération terminée ===`,
        `Total: ${d.total} fichier(s)`,
        `Générées: ${d.generated}`,
        `Déjà en cache: ${d.skipped}`,
        `Erreurs: ${d.errors}`,
        ...(d.linkedFoldersScanned != null ? [`Dossiers liés scannés: ${d.linkedFoldersScanned}`] : []),
      ];
      setPregenResults(lines.join('\n'));
      toast.success(`${d.generated} miniature(s) générée(s)`);
      fetchCacheStats();
    } catch (err: any) {
      setPregenResults(`❌ Erreur: ${err.message}`);
      toast.error('Erreur lors de la pré-génération');
    } finally {
      setPregenRunning(false);
    }
  };

  // ── Diagnostic complet ──
  const runDiagnostic = async () => {
    setDiagRunning(true);
    const lines: string[] = [`=== Diagnostic serveur — ${new Date().toLocaleString()} ===`, `URL: ${serverBase}`, ''];

    const endpoints = [
      { name: '/api/health', url: `${serverBase}/api/health` },
      { name: '/api/check-sharp', url: `${serverBase}/api/check-sharp` },
      { name: '/api/cache-stats', url: `${serverBase}/api/cache-stats` },
    ];

    for (const ep of endpoints) {
      try {
        const r = await fetch(ep.url, { signal: AbortSignal.timeout(5000) });
        const text = await r.text();
        lines.push(`✅ ${ep.name} → ${r.status}`);
        lines.push(`   ${text.slice(0, 300)}`);
      } catch (err: any) {
        lines.push(`❌ ${ep.name} → ${err.message || 'Erreur inconnue'}`);
      }
      lines.push('');
    }

    setDiagResults(lines.join('\n'));
    setDiagRunning(false);
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
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <span className={cn("text-sm font-medium", isConnected ? "text-emerald-500" : "text-muted-foreground")}>
                {isLoading ? 'Connexion...' : isConnected ? 'Connecté' : 'Non connecté'}
              </span>
            </div>
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>

          {/* Mixed content warning */}
          {!isConnected && isMixedContent && (
            <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-500">Connexion bloquée par le navigateur</p>
                  <p className="text-xs text-muted-foreground">
                    Tu consultes l'application depuis une page HTTPS, mais ton serveur local fonctionne en HTTP. 
                    Le navigateur bloque cette connexion pour des raisons de sécurité.
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    👉 Pour utiliser toutes les fonctionnalités (Sharp, cache, miniatures), ouvre l'application 
                    directement depuis ton serveur local :
                  </p>
                  <a
                    href={serverBase}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ouvrir {serverBase}
                  </a>
                </div>
              </div>
            </div>
          )}

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

          <div className="flex gap-2">
            <Button onClick={runDiagnostic} variant="outline" className="gap-2" disabled={diagRunning} size="sm">
              <Stethoscope className={cn("w-4 h-4", diagRunning && "animate-spin")} />
              Diagnostic complet
            </Button>
          </div>

          {diagResults && (
            <pre className="text-xs bg-muted/50 border border-border/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
              {diagResults}
            </pre>
          )}

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
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
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
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <CheckCircle className="w-4 h-4" /> Installé
                    </span>
                    <Button size="sm" variant="ghost" onClick={installSharp} disabled={sharpInstalling} className="gap-1 h-7 px-2">
                      <RotateCcw className="w-3 h-3" />
                      <span className="text-xs">Réinstaller</span>
                    </Button>
                  </div>
                ) : sharpInstalled === false ? (
                  <Button size="sm" onClick={installSharp} disabled={sharpInstalling} className="gap-1">
                    {sharpInstalling && <Loader2 className="w-3 h-3 animate-spin" />}
                    {sharpInstalling ? 'Installation...' : 'Installer Sharp'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {isMixedContent ? 'Ouvre l\'app en local' : 'Serveur non connecté'}
                  </span>
                )}
              </div>
            </div>
            {sharpInstalling && (
              <Progress value={undefined} className="h-1.5" />
            )}
            {sharpInstallResult && (
              <div className={cn("p-2 rounded text-xs border", sharpInstallResult.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-destructive/10 border-destructive/30")}>
                <p className="font-medium">{sharpInstallResult.message}</p>
                {sharpInstallResult.output && (
                  <pre className="mt-1 text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap font-mono opacity-70">{sharpInstallResult.output}</pre>
                )}
              </div>
            )}
          </div>

          {/* ── FFmpeg ── */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">ffmpeg</p>
                <p className="text-xs text-muted-foreground">
                  Requis pour extraire les miniatures des vidéos (MP4, WebM, MOV…). Sans FFmpeg, seules les images auront des miniatures.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {ffmpegChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : ffmpegInstalled === true ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <CheckCircle className="w-4 h-4" /> {ffmpegVersion || 'Installé'}
                    </span>
                    <Button size="sm" variant="ghost" onClick={installFfmpeg} disabled={ffmpegInstalling} className="gap-1 h-7 px-2">
                      <RotateCcw className="w-3 h-3" />
                      <span className="text-xs">Réinstaller</span>
                    </Button>
                  </div>
                ) : ffmpegInstalled === false ? (
                  <Button size="sm" onClick={installFfmpeg} disabled={ffmpegInstalling} className="gap-1">
                    {ffmpegInstalling && <Loader2 className="w-3 h-3 animate-spin" />}
                    {ffmpegInstalling ? 'Installation...' : 'Installer FFmpeg'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {isMixedContent ? 'Ouvre l\'app en local' : 'Serveur non connecté'}
                  </span>
                )}
              </div>
            </div>
            {ffmpegInstalling && ffmpegProgress && (
              <div className="space-y-2">
                <Progress value={ffmpegProgress.progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{ffmpegProgress.message}</p>
              </div>
            )}
          </div>

          {/* ── ESRGAN ── */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  ESRGAN (Upscaling IA)
                </p>
                <p className="text-xs text-muted-foreground">
                  Service d'upscaling par intelligence artificielle (port 9004). Permet d'agrandir photos et vidéos ×2, ×4, ×8 sans perte de qualité visible.
                </p>
                <p className="text-xs text-muted-foreground">
                  Installation : <code className="bg-muted px-1 rounded">docker run -p 9004:9004 mediavault/esrgan</code> ou via le script Python dans <code className="bg-muted px-1 rounded">docker/esrgan/</code>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {esrganChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : esrganAvailable === true ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <CheckCircle className="w-4 h-4" /> Disponible
                    </span>
                    <Button size="sm" variant="ghost" onClick={checkEsrgan} className="gap-1 h-7 px-2">
                      <RefreshCw className="w-3 h-3" />
                      <span className="text-xs">Vérifier</span>
                    </Button>
                  </div>
                ) : esrganAvailable === false ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <XCircle className="w-4 h-4 text-destructive" /> Non disponible
                    </span>
                    <Button size="sm" variant="ghost" onClick={checkEsrgan} className="gap-1 h-7 px-2">
                      <RefreshCw className="w-3 h-3" />
                      <span className="text-xs">Réessayer</span>
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Serveur non connecté</span>
                )}
              </div>
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
                  {cacheLoading ? 'Chargement...' : isMixedContent ? 'Ouvre l\'app en local pour gérer le cache' : 'Serveur non connecté'}
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

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={runPregenerate} disabled={pregenRunning || !isConnected} className="gap-1">
              {pregenRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Pré-générer toutes les miniatures
            </Button>
            <Button size="sm" variant="outline" onClick={runCacheDiagnostic} disabled={cacheDiagRunning || !isConnected} className="gap-1">
              {cacheDiagRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Stethoscope className="w-3 h-3" />}
              Diagnostiquer le cache
            </Button>
          </div>

          {pregenRunning && <Progress value={undefined} className="h-1.5" />}

          {pregenResults && (
            <pre className="text-xs bg-muted/50 border border-border/50 rounded-lg p-3 whitespace-pre-wrap font-mono">{pregenResults}</pre>
          )}

          {cacheDiagResults && (
            <pre className="text-xs bg-muted/50 border border-border/50 rounded-lg p-3 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">{cacheDiagResults}</pre>
          )}
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

          {/* ── Préchargement avancé ── */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-1">
              <p className="text-sm font-medium">Préchargement avancé</p>
              <p className="text-xs text-muted-foreground">
                Contrôlez la quantité de contenu chargé en avance pour fluidifier la navigation. Valeurs élevées = plus de RAM/réseau utilisés.
              </p>
            </div>

            {/* Médias préchargés */}
            <div className="space-y-2">
              <Label className="text-xs">Médias préchargés</Label>
              <div className="flex items-center gap-2">
                <Slider
                  min={-1}
                  max={500}
                  step={10}
                  value={[videoSettings.preloadMediaCount]}
                  onValueChange={([v]) => updateVideo({ preloadMediaCount: v })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={-1}
                  max={9999}
                  value={videoSettings.preloadMediaCount}
                  onChange={(e) => updateVideo({ preloadMediaCount: Math.max(-1, Number(e.target.value) || 0) })}
                  className="w-20 h-8 text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {videoSettings.preloadMediaCount === -1 ? '♾️ Tous les médias' : videoSettings.preloadMediaCount === 0 ? 'Aucun préchargement' : `${videoSettings.preloadMediaCount} médias`}
              </p>
            </div>

            {/* Lignes pre-scroll */}
            <div className="space-y-2">
              <Label className="text-xs">Lignes pré-scroll</Label>
              <div className="flex items-center gap-2">
                <Slider
                  min={-1}
                  max={50}
                  step={1}
                  value={[videoSettings.preloadScrollRows]}
                  onValueChange={([v]) => updateVideo({ preloadScrollRows: v })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={-1}
                  max={999}
                  value={videoSettings.preloadScrollRows}
                  onChange={(e) => updateVideo({ preloadScrollRows: Math.max(-1, Number(e.target.value) || 0) })}
                  className="w-20 h-8 text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {videoSettings.preloadScrollRows === -1 ? '♾️ Toutes les lignes' : videoSettings.preloadScrollRows === 0 ? 'Écran visible uniquement' : `${videoSettings.preloadScrollRows} ligne(s) en avance`}
              </p>
            </div>

            {/* Tampon vidéo */}
            <div className="space-y-2">
              <Label className="text-xs">Tampon vidéo (secondes)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  min={-1}
                  max={300}
                  step={5}
                  value={[videoSettings.preloadBufferSeconds]}
                  onValueChange={([v]) => updateVideo({ preloadBufferSeconds: v })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={-1}
                  max={3600}
                  value={videoSettings.preloadBufferSeconds}
                  onChange={(e) => updateVideo({ preloadBufferSeconds: Math.max(-1, Number(e.target.value) || 0) })}
                  className="w-20 h-8 text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {videoSettings.preloadBufferSeconds === -1 ? '♾️ Illimité' : videoSettings.preloadBufferSeconds === 0 ? 'Aucun tampon' : videoSettings.preloadBufferSeconds >= 60 ? `${Math.floor(videoSettings.preloadBufferSeconds / 60)}min ${videoSettings.preloadBufferSeconds % 60}s` : `${videoSettings.preloadBufferSeconds}s`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
