import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Copy,
  FileText,
  Play,
  Square,
  Terminal,
  HardDrive,
  Cpu,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  Package
} from 'lucide-react';
import { useLocalAIDiagnostics, AIServiceStatus, DiagnosticLog } from '@/hooks/useLocalAIDiagnostics';
import { useLocalAI } from '@/hooks/useLocalAI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SERVICE_INSTALL_COMMANDS: Record<string, { windows: string; docker: string }> = {
  ollama: {
    windows: 'winget install Ollama.Ollama',
    docker: 'docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama'
  },
  comfyui: {
    windows: 'git clone https://github.com/comfyanonymous/ComfyUI && cd ComfyUI && python -m venv venv && venv\\Scripts\\activate && pip install -r requirements.txt',
    docker: 'docker run -d -p 8188:8188 --gpus all yanwk/comfyui-boot:latest'
  },
  whisper: {
    windows: 'pip install openai-whisper flask flask-cors',
    docker: 'docker build -t mediavault-whisper ./docker/whisper && docker run -d -p 9000:9000 mediavault-whisper'
  },
  xtts: {
    windows: 'pip install TTS flask flask-cors',
    docker: 'docker build -t mediavault-xtts ./docker/xtts && docker run -d -p 8020:8020 mediavault-xtts'
  },
  musicgen: {
    windows: 'pip install audiocraft flask flask-cors',
    docker: 'docker build -t mediavault-musicgen ./docker/musicgen && docker run -d -p 8030:8030 mediavault-musicgen'
  },
  demucs: {
    windows: 'pip install demucs flask flask-cors',
    docker: 'docker build -t mediavault-demucs ./docker/demucs && docker run -d -p 8040:8040 mediavault-demucs'
  },
  clip: {
    windows: 'pip install clip-interrogator flask flask-cors',
    docker: 'docker build -t mediavault-clip ./docker/clip && docker run -d -p 8060:8060 mediavault-clip'
  },
  esrgan: {
    windows: 'pip install realesrgan flask flask-cors',
    docker: 'docker build -t mediavault-esrgan ./docker/esrgan && docker run -d -p 8070:8070 mediavault-esrgan'
  }
};

export function AIServiceManager() {
  const { 
    services, 
    logs, 
    systemInfo,
    isRunningDiagnostics,
    runFullDiagnostics,
    checkSingleService,
    addLog,
    clearLogs,
    downloadLogs,
    copyLogsToClipboard
  } = useLocalAIDiagnostics();
  
  const { config, updateConfig } = useLocalAI();
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [installMethod, setInstallMethod] = useState<'windows' | 'docker'>('windows');

  // Run diagnostics on mount
  useEffect(() => {
    runFullDiagnostics();
  }, []);

  const getStatusIcon = (status: AIServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'offline':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: AIServiceStatus['status']) => {
    const variants: Record<typeof status, string> = {
      online: 'bg-green-500/20 text-green-400 border-green-500/30',
      offline: 'bg-red-500/20 text-red-400 border-red-500/30',
      error: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      checking: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    const labels: Record<typeof status, string> = {
      online: 'En ligne',
      offline: 'Hors ligne',
      error: 'Erreur',
      checking: 'Vérification...'
    };
    return (
      <Badge variant="outline" className={cn('text-xs', variants[status])}>
        {labels[status]}
      </Badge>
    );
  };

  const getLogIcon = (level: DiagnosticLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleCopyLogs = async () => {
    const success = await copyLogsToClipboard();
    if (success) {
      toast.success('Logs copiés dans le presse-papiers');
    } else {
      toast.error('Impossible de copier les logs');
    }
  };

  const handleDownloadInstallScript = (type: 'full' | 'uninstall') => {
    let scriptContent: string;
    const filename = type === 'full' ? 'install-mediavault-ai.ps1' : 'uninstall-mediavault-ai.ps1';
    
    if (type === 'full') {
      scriptContent = `#Requires -RunAsAdministrator
# MediaVault AI Suite - Installation Complete
# Exécuter avec: powershell -ExecutionPolicy Bypass -File install-mediavault-ai.ps1

$ErrorActionPreference = "Continue"
$InstallDir = "$env:USERPROFILE\\MediaVault-AI"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  MEDIAVAULT AI SUITE - INSTALLATION EN UN CLIC" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Create install directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$LogFile = "$InstallDir\\install.log"
Start-Transcript -Path $LogFile -Append

# Install Ollama
Write-Host "[1/4] Installation de Ollama..." -ForegroundColor Yellow
try {
    winget install --id Ollama.Ollama -e --accept-package-agreements --accept-source-agreements --silent
    Write-Host "  ✓ Ollama installé" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Erreur Ollama: $_" -ForegroundColor Red
}

# Install Python if needed
Write-Host "[2/4] Vérification de Python..." -ForegroundColor Yellow
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    winget install --id Python.Python.3.11 -e --accept-package-agreements --accept-source-agreements --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-Host "  ✓ Python disponible" -ForegroundColor Green

# Install Git if needed
Write-Host "[3/4] Vérification de Git..." -ForegroundColor Yellow
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-Host "  ✓ Git disponible" -ForegroundColor Green

# Install ComfyUI
Write-Host "[4/4] Installation de ComfyUI..." -ForegroundColor Yellow
$ComfyPath = "$InstallDir\\ComfyUI"
if (!(Test-Path $ComfyPath)) {
    Set-Location $InstallDir
    git clone https://github.com/comfyanonymous/ComfyUI.git
    Set-Location $ComfyPath
    python -m venv venv
    .\\venv\\Scripts\\Activate.ps1
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
    pip install -r requirements.txt --quiet
    deactivate
}
Write-Host "  ✓ ComfyUI installé" -ForegroundColor Green

# Create start script
@"
@echo off
echo Démarrage des services IA MediaVault...
start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul
cd /d "$InstallDir\\ComfyUI"
start "ComfyUI" /min cmd /c "venv\\Scripts\\activate.bat && python main.py --listen 0.0.0.0"
echo Services démarrés!
echo Ollama: http://localhost:11434
echo ComfyUI: http://localhost:8188
pause
"@ | Out-File -FilePath "$InstallDir\\start-ai.bat" -Encoding ASCII

# Create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\\Desktop\\MediaVault AI.lnk")
$Shortcut.TargetPath = "$InstallDir\\start-ai.bat"
$Shortcut.Save()

Stop-Transcript

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  INSTALLATION TERMINÉE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Raccourci créé sur le Bureau: 'MediaVault AI'"
Write-Host "Log d'installation: $LogFile"
Write-Host ""
Write-Host "Appuyez sur une touche pour terminer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;
    } else {
      scriptContent = `#Requires -RunAsAdministrator
# MediaVault AI Suite - Désinstallation Complete
# Exécuter avec: powershell -ExecutionPolicy Bypass -File uninstall-mediavault-ai.ps1

$ErrorActionPreference = "Continue"
$InstallDir = "$env:USERPROFILE\\MediaVault-AI"

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Red
Write-Host "  MEDIAVAULT AI SUITE - DÉSINSTALLATION" -ForegroundColor Red
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Voulez-vous vraiment désinstaller tous les services IA? (O/N)"
if ($confirm -ne "O" -and $confirm -ne "o") {
    Write-Host "Annulé."
    exit
}

Write-Host ""
Write-Host "[1/5] Arrêt des services..." -ForegroundColor Yellow
taskkill /F /IM ollama.exe 2>$null
taskkill /F /IM python.exe /FI "WINDOWTITLE eq ComfyUI*" 2>$null
Write-Host "  ✓ Services arrêtés" -ForegroundColor Green

Write-Host "[2/5] Désinstallation de Ollama..." -ForegroundColor Yellow
winget uninstall --id Ollama.Ollama -e --silent 2>$null
Write-Host "  ✓ Ollama désinstallé" -ForegroundColor Green

Write-Host "[3/5] Suppression du dossier d'installation..." -ForegroundColor Yellow
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
    Write-Host "  ✓ Dossier supprimé: $InstallDir" -ForegroundColor Green
}

Write-Host "[4/5] Suppression du raccourci bureau..." -ForegroundColor Yellow
$shortcut = "$env:USERPROFILE\\Desktop\\MediaVault AI.lnk"
if (Test-Path $shortcut) {
    Remove-Item $shortcut -Force
    Write-Host "  ✓ Raccourci supprimé" -ForegroundColor Green
}

Write-Host "[5/5] Nettoyage Docker (optionnel)..." -ForegroundColor Yellow
$cleanDocker = Read-Host "Supprimer aussi les conteneurs Docker? (O/N)"
if ($cleanDocker -eq "O" -or $cleanDocker -eq "o") {
    docker stop mediavault-ollama mediavault-comfyui mediavault-whisper mediavault-xtts 2>$null
    docker rm mediavault-ollama mediavault-comfyui mediavault-whisper mediavault-xtts 2>$null
    docker volume rm mediavault_ollama_data mediavault_comfyui_models 2>$null
    Write-Host "  ✓ Conteneurs Docker supprimés" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  DÉSINSTALLATION TERMINÉE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur une touche pour terminer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;
    }
    
    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Script ${type === 'full' ? 'd\'installation' : 'de désinstallation'} téléchargé`);
  };

  const onlineCount = services.filter(s => s.status === 'online').length;
  const offlineCount = services.filter(s => s.status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{onlineCount}</p>
              <p className="text-sm text-muted-foreground">Services actifs</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/20">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{offlineCount}</p>
              <p className="text-sm text-muted-foreground">Services hors ligne</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Cpu className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium truncate max-w-[150px]">
                {systemInfo?.gpu?.split('/')[0] || 'Non détecté'}
              </p>
              <p className="text-sm text-muted-foreground">GPU</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <HardDrive className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium">{systemInfo?.memory || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">Mémoire</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="install">Installation</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="help">Aide</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={runFullDiagnostics} 
              disabled={isRunningDiagnostics}
              className="gap-2"
            >
              {isRunningDiagnostics ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Vérifier tous les services
            </Button>
            
            <Button variant="outline" onClick={handleCopyLogs} className="gap-2">
              <Copy className="w-4 h-4" />
              Copier le rapport
            </Button>
            
            <Button variant="outline" onClick={downloadLogs} className="gap-2">
              <FileText className="w-4 h-4" />
              Télécharger le rapport
            </Button>
          </div>

          <div className="grid gap-3">
            <AnimatePresence>
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Collapsible
                    open={expandedService === service.id}
                    onOpenChange={(open) => setExpandedService(open ? service.id : null)}
                  >
                    <Card className={cn(
                      "transition-all",
                      service.status === 'online' && "border-green-500/30",
                      service.status === 'offline' && "border-red-500/30",
                      service.status === 'error' && "border-yellow-500/30"
                    )}>
                      <CollapsibleTrigger className="w-full">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getStatusIcon(service.status)}
                            <div className="text-left">
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-muted-foreground">{service.url}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {service.latency && (
                              <span className="text-xs text-muted-foreground">
                                {service.latency}ms
                              </span>
                            )}
                            {getStatusBadge(service.status)}
                            {expandedService === service.id ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          {service.error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                              <p className="font-medium text-red-400 mb-1">Erreur:</p>
                              <p className="text-red-300">{service.error}</p>
                            </div>
                          )}
                          
                          {service.capabilities && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Fonctionnalités:</p>
                              <div className="flex flex-wrap gap-1">
                                {service.capabilities.map(cap => (
                                  <Badge key={cap} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => checkSingleService(service.id)}
                              className="gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Retester
                            </Button>
                            
                            {service.status === 'online' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(service.url, '_blank')}
                                className="gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ouvrir
                              </Button>
                            )}
                            
                            {service.status === 'offline' && SERVICE_INSTALL_COMMANDS[service.id] && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    installMethod === 'windows' 
                                      ? SERVICE_INSTALL_COMMANDS[service.id].windows
                                      : SERVICE_INSTALL_COMMANDS[service.id].docker
                                  );
                                  toast.success('Commande copiée');
                                }}
                                className="gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                Copier commande
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Installation Tab */}
        <TabsContent value="install" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Installation en un clic
              </CardTitle>
              <CardDescription>
                Téléchargez et exécutez le script pour installer automatiquement tous les services IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  size="lg" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => handleDownloadInstallScript('full')}
                >
                  <Download className="w-6 h-6" />
                  <span className="font-semibold">Télécharger le script d'installation</span>
                  <span className="text-xs opacity-80">install-mediavault-ai.ps1</span>
                </Button>
                
                <Button 
                  size="lg" 
                  variant="destructive"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => handleDownloadInstallScript('uninstall')}
                >
                  <Trash2 className="w-6 h-6" />
                  <span className="font-semibold">Télécharger le script de désinstallation</span>
                  <span className="text-xs opacity-80">uninstall-mediavault-ai.ps1</span>
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium mb-2">Comment exécuter le script:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Clic droit sur le fichier téléchargé</li>
                  <li>Sélectionnez "Exécuter avec PowerShell"</li>
                  <li>Acceptez l'exécution en tant qu'administrateur</li>
                  <li>Attendez la fin de l'installation</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Installation manuelle par service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant={installMethod === 'windows' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInstallMethod('windows')}
                >
                  Windows
                </Button>
                <Button 
                  variant={installMethod === 'docker' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInstallMethod('docker')}
                >
                  Docker
                </Button>
              </div>
              
              <div className="space-y-3">
                {services.map(service => (
                  <div key={service.id} className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{service.name}</span>
                      {getStatusBadge(service.status)}
                    </div>
                    {SERVICE_INSTALL_COMMANDS[service.id] && (
                      <div className="flex gap-2">
                        <code className="flex-1 text-xs bg-background p-2 rounded overflow-x-auto">
                          {installMethod === 'windows' 
                            ? SERVICE_INSTALL_COMMANDS[service.id].windows
                            : SERVICE_INSTALL_COMMANDS[service.id].docker
                          }
                        </code>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              installMethod === 'windows' 
                                ? SERVICE_INSTALL_COMMANDS[service.id].windows
                                : SERVICE_INSTALL_COMMANDS[service.id].docker
                            );
                            toast.success('Commande copiée');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Logs de diagnostic ({logs.length})</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearLogs}>
                Effacer
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyLogs}>
                <Copy className="w-4 h-4 mr-1" />
                Copier tout
              </Button>
            </div>
          </div>
          
          <Card>
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2 font-mono text-sm">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun log. Lancez un diagnostic pour commencer.
                  </p>
                ) : (
                  logs.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex gap-2 p-2 rounded",
                        log.level === 'error' && "bg-red-500/10",
                        log.level === 'warning' && "bg-yellow-500/10",
                        log.level === 'success' && "bg-green-500/10"
                      )}
                    >
                      {getLogIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{log.timestamp.toLocaleTimeString()}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.service}
                          </Badge>
                        </div>
                        <p className={cn(
                          log.level === 'error' && "text-red-400",
                          log.level === 'warning' && "text-yellow-400",
                          log.level === 'success' && "text-green-400"
                        )}>
                          {log.message}
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            → {log.details}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Guide de dépannage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Service "Hors ligne"
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Vérifiez que le service est démarré</li>
                    <li>Utilisez le script "start-ai-services.bat"</li>
                    <li>Vérifiez que le port n'est pas bloqué par un pare-feu</li>
                  </ul>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    Erreur CORS
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Le service doit autoriser les requêtes cross-origin</li>
                    <li>Utilisez les serveurs Flask fournis avec CORS activé</li>
                    <li>Vérifiez la configuration du service</li>
                  </ul>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Problèmes de GPU
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Installez les derniers drivers NVIDIA</li>
                    <li>Vérifiez que CUDA est installé</li>
                    <li>Utilisez le mode CPU si pas de GPU compatible</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <h4 className="font-semibold mb-2">Besoin d'aide?</h4>
                <p className="text-sm text-muted-foreground">
                  Copiez le rapport de diagnostic complet et partagez-le pour obtenir de l'aide.
                  Le rapport contient toutes les informations nécessaires pour diagnostiquer les problèmes.
                </p>
                <Button className="mt-3" onClick={handleCopyLogs}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le rapport complet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
