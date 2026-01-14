import { useState, useCallback, useEffect } from 'react';
import { Film, CheckCircle, XCircle, Loader2, RefreshCw, Play, Download, AlertCircle, Settings, Zap, HardDrive, FileVideo, Rocket, ExternalLink, FolderOpen, Copy } from 'lucide-react';
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
import { getLocalServerUrl } from '@/utils/localServerUrl';

interface FFmpegInstallProgress {
  step: 'idle' | 'downloading' | 'extracting' | 'configuring' | 'verifying' | 'completed' | 'failed';
  progress: number;
  message: string;
}

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
  const [connectivityDiag, setConnectivityDiag] = useState<string | null>(null);
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

  // Installation automatique FFmpeg
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<FFmpegInstallProgress>({
    step: 'idle',
    progress: 0,
    message: ''
  });

  const getServerUrl = useCallback(() => {
    return getLocalServerUrl();
  }, []);

  const isHttpsContext = typeof window !== 'undefined' && window.location.protocol === 'https:';

  const checkFFmpeg = useCallback(async () => {
    setIsChecking(true);
    const serverUrl = getServerUrl();

    try {
      const response = await fetch(`${serverUrl}/api/check-ffmpeg`, {
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const data = await response.json();
        setFfmpegStatus(data);
        setConnectivityDiag(null);
        if (data.installed) {
          toast.success('FFmpeg détecté', { description: data.version });
        } else {
          toast.warning('FFmpeg non installé');
        }
      } else {
        setFfmpegStatus({ installed: false, version: null });
        setConnectivityDiag(
          JSON.stringify(
            {
              kind: 'http_error',
              status: response.status,
              serverUrl,
              origin: typeof window !== 'undefined' ? window.location.origin : 'unknown'
            },
            null,
            2
          )
        );
        toast.error('Erreur de connexion au serveur');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFfmpegStatus({ installed: false, version: null });
      setConnectivityDiag(
        JSON.stringify(
          {
            kind: 'fetch_failed',
            message,
            serverUrl,
            origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
            httpsContext: isHttpsContext
          },
          null,
          2
        )
      );
      toast.error('Serveur non accessible', {
        description: message
      });
    } finally {
      setIsChecking(false);
    }
  }, [getServerUrl, isHttpsContext]);

  // Installation automatique FFmpeg en un clic
  const installFFmpegAutomatically = useCallback(async () => {
    const serverUrl = getServerUrl();
    setIsInstalling(true);
    setInstallProgress({ step: 'downloading', progress: 0, message: 'Connexion au serveur...' });

    // Pré-check: si on est dans un contexte HTTPS avec localhost en HTTP, ça ne pourra pas marcher.
    if (isHttpsContext && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(serverUrl)) {
      setIsInstalling(false);
      const msg =
        "Bloqué par le navigateur (HTTPS → http://localhost). Ouvrez l'interface via http://localhost:3001 (en local) puis relancez l'installation.";
      setInstallProgress({ step: 'failed', progress: 0, message: msg });
      setConnectivityDiag(
        JSON.stringify(
          {
            kind: 'mixed_content_blocked',
            serverUrl,
            origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
            httpsContext: true,
            fix: 'Ouvrir http://localhost:3001 (ou lancer start-mediavault.bat) puis refaire la vérification / installation.'
          },
          null,
          2
        )
      );
      toast.error('Automatisation impossible depuis cette page', {
        description: "Ouvrez MediaVault en local (http://localhost:3001) pour piloter le serveur."
      });
      return;
    }

    try {
      // Vérifier que le serveur répond réellement
      const health = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!health.ok) throw new Error(`health_not_ok (${health.status})`);

      // Étape 1: Demander au serveur d'installer FFmpeg
      const response = await fetch(`${serverUrl}/api/install-ffmpeg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`install_start_failed (${response.status})`);
      }

      let finished = false;
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${serverUrl}/api/ffmpeg-install-status`, {
            signal: AbortSignal.timeout(5000)
          });
          if (!statusResponse.ok) return;

          const status = await statusResponse.json();
          setInstallProgress({
            step: status.step,
            progress: status.progress,
            message: status.message
          });

          if (status.step === 'completed') {
            finished = true;
            clearInterval(pollInterval);
            setIsInstalling(false);
            setFfmpegStatus({ installed: true, version: status.version || 'FFmpeg installé' });
            setConnectivityDiag(null);
            toast.success('FFmpeg installé avec succès !', {
              description: 'Vous pouvez maintenant utiliser toutes les fonctionnalités'
            });
          } else if (status.step === 'failed') {
            finished = true;
            clearInterval(pollInterval);
            setIsInstalling(false);
            setInstallProgress({ step: 'failed', progress: 0, message: status.message || "Échec de l'installation" });
            toast.error("Échec de l'installation", {
              description: status.message
            });
          }
        } catch {
          // Ignorer les erreurs de polling temporaires
        }
      }, 1000);

      // Timeout après 5 minutes
      setTimeout(() => {
        if (finished) return;
        clearInterval(pollInterval);
        setIsInstalling(false);
        setInstallProgress({ step: 'failed', progress: 0, message: "Timeout - L'installation a pris trop de temps" });
      }, 300000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setIsInstalling(false);
      setInstallProgress({
        step: 'failed',
        progress: 0,
        message: `Impossible de contacter le serveur local: ${message}`
      });
      setConnectivityDiag(
        JSON.stringify(
          {
            kind: 'install_failed_preflight',
            message,
            serverUrl,
            origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
            httpsContext: isHttpsContext
          },
          null,
          2
        )
      );
      toast.error('Serveur non accessible', { description: message });
    }
  }, [getServerUrl, isHttpsContext]);

  const simulateLocalInstall = async () => {
    const steps = [
      { step: 'downloading' as const, progress: 20, message: 'Téléchargement FFmpeg (50 MB)...' },
      { step: 'downloading' as const, progress: 40, message: 'Téléchargement en cours...' },
      { step: 'downloading' as const, progress: 60, message: 'Téléchargement terminé' },
      { step: 'extracting' as const, progress: 70, message: 'Extraction des fichiers...' },
      { step: 'configuring' as const, progress: 85, message: 'Configuration du PATH système...' },
      { step: 'verifying' as const, progress: 95, message: "Vérification de l'installation..." },
      { step: 'completed' as const, progress: 100, message: 'Installation terminée !' }
    ];

    for (const stepInfo of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setInstallProgress(stepInfo);
    }

    setIsInstalling(false);
    await checkFFmpeg();
  };

  // Télécharger server.cjs (serveur local) - version synchronisée avec le repo
  const downloadLocalServerFile = useCallback(() => {
    import('../../server.cjs?raw').then(({ default: serverCjs }) => {
      const blob = new Blob([serverCjs], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'server.cjs';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('server.cjs téléchargé', {
        description: 'Placez-le avec le .bat dans un même dossier (ex: C:\\MediaVault\\)'
      });
    });
  }, []);

  // Télécharger un script de démarrage (Windows)
  const downloadStartMediaVaultBat = useCallback(() => {
    // Version avec logs ok/fail + infos machine
    const batContent = [
      '@echo off',
      'setlocal enabledelayedexpansion',
      'title MediaVault - Demarrage',
      'color 0A',
      'chcp 65001 >nul',
      '',
      'set "MV_NAME=%~n0"',
      'set "MV_ROOT=%~dp0"',
      'set "MV_LOGROOT=%MV_ROOT%logs"',
      'set "MV_LOGTMP=%MV_LOGROOT%\\_tmp"',
      'set "MV_TS=%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%"',
      'set "MV_TS=%MV_TS: =0%"',
      'set "MV_RUN=%MV_NAME%-%MV_TS%"',
      'if not exist "%MV_LOGROOT%" mkdir "%MV_LOGROOT%" >nul 2>&1',
      'if not exist "%MV_LOGTMP%" mkdir "%MV_LOGTMP%" >nul 2>&1',
      'set "MV_LOGFILE=%MV_LOGTMP%\\%MV_RUN%.log"',
      '',
      'call :MAIN > "%MV_LOGFILE%" 2>&1',
      'set "MV_EXIT=%errorlevel%"',
      'if %MV_EXIT% equ 0 (',
      '  if not exist "%MV_LOGROOT%\\ok" mkdir "%MV_LOGROOT%\\ok" >nul 2>&1',
      '  move /y "%MV_LOGFILE%" "%MV_LOGROOT%\\ok\\%MV_RUN%.log" >nul',
      ') else (',
      '  if not exist "%MV_LOGROOT%\\fail" mkdir "%MV_LOGROOT%\\fail" >nul 2>&1',
      '  move /y "%MV_LOGFILE%" "%MV_LOGROOT%\\fail\\%MV_RUN%.log" >nul',
      ')',
      'echo.',
      'echo Log: %MV_LOGROOT%',
      'pause',
      'exit /b %MV_EXIT%',
      '',
      ':MAIN',
      'echo.',
      'echo  ============================================',
      'echo           MediaVault - Demarrage',
      'echo  ============================================',
      'echo.',
      'echo [SYS] Windows:',
      'ver',
      'echo.',
      'echo [SYS] CPU / RAM / GPU:',
      'wmic cpu get name /value 2>nul',
      'wmic computersystem get totalphysicalmemory /value 2>nul',
      'wmic path win32_videocontroller get name /value 2>nul',
      'echo.',
      '',
      ':: Verifier Node.js',
      'echo [1/4] Verification de Node.js...',
      'where node >nul 2>nul',
      'if %errorlevel% neq 0 (',
      '    echo [ERREUR] Node.js n\'est pas installe!',
      '    echo Telecharger depuis: https://nodejs.org/',
      '    exit /b 1',
      ')',
      'for /f "tokens=1" %%i in (\'node -v\') do set NODE_VERSION=%%i',
      'echo       Node.js %NODE_VERSION% detecte',
      '',
      ':: Aller au dossier du projet',
      'echo.',
      'echo [2/4] Navigation vers le dossier...',
      'cd /d "%~dp0"',
      'echo       Dossier: %CD%',
      '',
      ':: Verifier si le serveur est deja en cours',
      'echo.',
      'echo [3/4] Verification du serveur...',
      'netstat -ano | findstr :3001 >nul 2>nul',
      'if %errorlevel% equ 0 (',
      '    echo       Serveur deja en cours sur le port 3001',
      ') else (',
      '    echo       Demarrage du serveur local...',
      '    start /min cmd /c "node server.cjs"',
      '    timeout /t 2 /nobreak >nul',
      ')',
      '',
      ':: Ouvrir le navigateur',
      'echo.',
      'echo [4/4] Ouverture du navigateur...',
      'timeout /t 1 /nobreak >nul',
      'start http://localhost:3001',
      '',
      'echo.',
      'echo  MediaVault est pret : http://localhost:3001',
      'echo.',
      'exit /b 0'
    ].join('\r\n');

    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Lancer MediaVault.bat';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Lancer MediaVault.bat téléchargé', {
      description: 'Crée un dossier logs\\ok et logs\\fail pour diagnostiquer en 1 seule fois.'
    });
  }, []);

  // Télécharger le script d'installation FFmpeg (manuel)
  const downloadInstallScript = useCallback(() => {
    const scriptLines = [
      '@echo off',
      'setlocal enabledelayedexpansion',
      'title Installation FFmpeg pour MediaVault',
      'color 0A',
      '',
      'echo ========================================================',
      'echo        INSTALLATION AUTOMATIQUE FFMPEG',
      'echo ========================================================',
      'echo.',
      '',
      'set "FFMPEG_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"',
      'set "INSTALL_DIR=%USERPROFILE%\\MediaVault-AI\\ffmpeg"',
      'set "TEMP_ZIP=%TEMP%\\ffmpeg.zip"',
      '',
      'echo [1/5] Creation du dossier d installation...',
      'if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"',
      '',
      'echo [2/5] Telechargement de FFmpeg...',
      'echo     URL: %FFMPEG_URL%',
      'powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri \'%FFMPEG_URL%\' -OutFile \'%TEMP_ZIP%\'"',
      '',
      'if not exist "%TEMP_ZIP%" (',
      '    echo ERREUR: Le telechargement a echoue',
      '    pause',
      '    exit /b 1',
      ')',
      '',
      'echo [3/5] Extraction des fichiers...',
      'powershell -Command "Expand-Archive -Path \'%TEMP_ZIP%\' -DestinationPath \'%INSTALL_DIR%\' -Force"',
      '',
      'echo [4/5] Configuration du PATH systeme...',
      'for /d %%D in ("%INSTALL_DIR%\\ffmpeg-*") do (',
      '    set "FFMPEG_BIN=%%D\\bin"',
      '    echo     Dossier trouve: !FFMPEG_BIN!',
      ')',
      '',
      'if defined FFMPEG_BIN (',
      '    setx PATH "%PATH%;!FFMPEG_BIN!"',
      '    echo     PATH mis a jour avec: !FFMPEG_BIN!',
      ') else (',
      '    echo ERREUR: Dossier FFmpeg non trouve apres extraction',
      '    pause',
      '    exit /b 1',
      ')',
      '',
      'echo [5/5] Nettoyage...',
      'del "%TEMP_ZIP%" 2>nul',
      '',
      'echo.',
      'echo ========================================================',
      'echo              INSTALLATION TERMINEE !',
      'echo ========================================================',
      'echo.',
      'echo FFmpeg est maintenant installe dans: %INSTALL_DIR%',
      'echo.',
      'echo IMPORTANT: Fermez et rouvrez votre terminal pour que',
      'echo le PATH soit pris en compte, puis relancez MediaVault.',
      'echo.',
      'pause',
      'endlocal'
    ];

    const script = scriptLines.join('\r\n');
    const blob = new Blob([script], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install-ffmpeg.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Script téléchargé', {
      description: "Exécutez install-ffmpeg.bat en tant qu'administrateur"
    });
  }, []);

  // Télécharger un script diagnostic (collecte un rapport utile même si l'UI ne détecte rien)
  const downloadDiagnosticScript = useCallback(() => {
    const serverUrl = getServerUrl();

    const scriptLines = [
      '@echo off',
      'setlocal',
      'chcp 65001 >nul 2>&1',
      'title Diagnostic MediaVault (serveur + FFmpeg)',
      'color 0A',
      '',
      'set "OUTDIR=%USERPROFILE%\\MediaVault-AI\\logs"',
      'if not exist "%OUTDIR%" mkdir "%OUTDIR%"',
      '',
      'set "STAMP=%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%"',
      'set "STAMP=%STAMP: =0%"',
      'set "OUT=%OUTDIR%\\mediavault-diagnostic-%STAMP%.txt"',
      '',
      'echo MediaVault diagnostic > "%OUT%"',
      'echo Date: %date% %time%>> "%OUT%"',
      'echo.>> "%OUT%"',
      `echo [1] URL serveur configuree: ${serverUrl} >> "%OUT%"`,
      'echo.>> "%OUT%"',
      'echo [2] Test /api/health >> "%OUT%"',
      `powershell -NoProfile -Command "$u='${serverUrl}'; $r = try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 ($u + '/api/health')).Content } catch { 'ERROR: ' + $_.Exception.Message }; $r" >> "%OUT%"`,
      'echo.>> "%OUT%"',
      'echo [3] Test /api/check-ffmpeg >> "%OUT%"',
      `powershell -NoProfile -Command "$u='${serverUrl}'; $r = try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 8 ($u + '/api/check-ffmpeg')).Content } catch { 'ERROR: ' + $_.Exception.Message }; $r" >> "%OUT%"`,
      'echo.>> "%OUT%"',
      'echo [4] Rapport complet /api/debug/report >> "%OUT%"',
      `powershell -NoProfile -Command "$u='${serverUrl}'; $r = try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 ($u + '/api/debug/report')).Content } catch { 'ERROR: ' + $_.Exception.Message }; $r" >> "%OUT%"`,
      'echo.>> "%OUT%"',
      'echo [5] Version FFmpeg (PATH) >> "%OUT%"',
      'ffmpeg -version >> "%OUT%" 2>&1',
      'echo.>> "%OUT%"',
      'echo Fichier genere: %OUT%',
      'echo Envoyez ce fichier au support.',
      'start "" "%OUTDIR%"',
      'pause',
      'endlocal'
    ];

    const script = scriptLines.join('\r\n');
    const blob = new Blob([script], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediavault-diagnostic.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Script diagnostic téléchargé', {
      description: 'Lancez-le puis envoyez le fichier .txt généré.'
    });
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
        </div>

        {/* Diagnostic de connectivité (cas le plus fréquent: app ouverte en HTTPS) */}
        {!ffmpegStatus?.installed && connectivityDiag && (
          <div className={cn(
            "p-4 rounded-lg border space-y-2",
            isHttpsContext ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/30 border-border/50"
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Connexion au serveur local impossible
                </p>
                {isHttpsContext ? (
                  <p className="text-sm text-muted-foreground">
                    Votre navigateur bloque l'accès à <code className="px-1 rounded bg-muted">http://localhost</code> depuis cette page sécurisée.
                    Ouvrez l'interface en local :{' '}
                    <a className="underline" href="http://localhost:3001" target="_blank" rel="noreferrer">http://localhost:3001</a>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Le serveur local ne répond pas. Vérifiez qu'il est démarré (node server.cjs) et que l'URL est correcte dans les réglages.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(connectivityDiag);
                      toast.success('Diagnostic copié');
                    } catch {
                      toast.error('Impossible de copier le diagnostic');
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={downloadDiagnosticScript}
                >
                  <Download className="w-4 h-4" />
                  Script diagnostic
                </Button>
              </div>
            </div>

            <pre className="text-xs overflow-auto max-h-40 p-2 rounded bg-muted/50 border border-border/50">
{connectivityDiag}
            </pre>
          </div>
        )}

        {/* Installation automatique - Affiché seulement si FFmpeg non installé */}
        {!ffmpegStatus?.installed && ffmpegStatus !== null && (
          <div className="space-y-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Installation automatique FFmpeg</span>
            </div>
            
            {isInstalling ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{installProgress.message}</span>
                  <span className="text-muted-foreground">{installProgress.progress}%</span>
                </div>
                <Progress value={installProgress.progress} className="h-2" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>
                    {installProgress.step === 'downloading' && 'Téléchargement...'}
                    {installProgress.step === 'extracting' && 'Extraction...'}
                    {installProgress.step === 'configuring' && 'Configuration...'}
                    {installProgress.step === 'verifying' && 'Vérification...'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Installez FFmpeg en un clic pour activer les thumbnails et la compression vidéo.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={installFFmpegAutomatically}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Rocket className="w-4 h-4" />
                    Installer automatiquement
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={downloadInstallScript}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Script manuel (.bat)
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <a 
                    href="https://www.gyan.dev/ffmpeg/builds/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Téléchargement officiel
                  </a>
                  <span>•</span>
                  <span>~50 MB • Windows x64</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup" className="gap-2">
              <HardDrive className="w-4 h-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="thumbnails" className="gap-2">
              <Film className="w-4 h-4" />
              Thumbnails
            </TabsTrigger>
            <TabsTrigger value="compression" className="gap-2">
              <Zap className="w-4 h-4" />
              Compression
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab (manuel + fichiers) */}
          <TabsContent value="setup" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border bg-muted/30 border-border/50 space-y-3">
              <p className="text-sm">
                Objectif : lancer MediaVault <strong>en local</strong> (HTTP) pour que le navigateur autorise la connexion au serveur et que FFmpeg puisse être détecté.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2" onClick={downloadLocalServerFile}>
                  <Download className="w-4 h-4" />
                  Télécharger server.cjs
                </Button>
                <Button variant="outline" className="gap-2" onClick={downloadStartMediaVaultBat}>
                  <Download className="w-4 h-4" />
                  Télécharger Lancer MediaVault.bat
                </Button>
              </div>

              <div className="text-sm space-y-2">
                <p className="font-medium">Étapes (Windows) :</p>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Créez un dossier : <code className="px-1 rounded bg-muted">C:\\MediaVault\\</code></li>
                  <li>Mettez <code className="px-1 rounded bg-muted">server.cjs</code> + <code className="px-1 rounded bg-muted">Lancer MediaVault.bat</code> dedans</li>
                  <li>Installez Node.js (LTS) si besoin : <a className="underline" href="https://nodejs.org/" target="_blank" rel="noreferrer">nodejs.org</a></li>
                  <li>Double-cliquez <code className="px-1 rounded bg-muted">Lancer MediaVault.bat</code></li>
                  <li>Ouvrez ensuite MediaVault ici : <a className="underline" href="http://localhost:3001" target="_blank" rel="noreferrer">http://localhost:3001</a></li>
                </ol>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-muted/30 border-border/50 space-y-3">
              <p className="text-sm font-medium">Installation FFmpeg (manuel)</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-2" onClick={downloadInstallScript}>
                  <Download className="w-4 h-4" />
                  install-ffmpeg.bat
                </Button>
                <Button variant="outline" className="gap-2" onClick={downloadDiagnosticScript}>
                  <Download className="w-4 h-4" />
                  mediavault-diagnostic.bat
                </Button>
              </div>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                <li>Clique droit sur <code className="px-1 rounded bg-muted">install-ffmpeg.bat</code> → <strong>Exécuter en tant qu’administrateur</strong></li>
                <li>Fermez / rouvrez votre terminal (ou redémarrez) pour que le PATH soit pris en compte</li>
                <li>Revenez ici et cliquez sur le bouton ↻ en haut pour “Vérifier”</li>
                <li>Si ça coince : lancez <code className="px-1 rounded bg-muted">mediavault-diagnostic.bat</code> et gardez le .txt généré (il contient TOUT)</li>
              </ol>
            </div>
          </TabsContent>

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
