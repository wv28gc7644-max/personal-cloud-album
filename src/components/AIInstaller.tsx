import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Loader2, 
  CheckCircle,
  XCircle,
  Play,
  Copy,
  Terminal,
  HardDrive,
  Cpu,
  Zap,
  Package,
  AlertTriangle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AITool {
  id: string;
  name: string;
  description: string;
  size: string;
  required: boolean;
  installed: boolean;
  installing: boolean;
  category: 'text' | 'image' | 'audio' | 'analysis';
  commands: string[];
  downloadUrl?: string;
  pythonPackage?: string;
}

const AI_TOOLS: AITool[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Moteur IA texte local (LLaMA, Mistral, etc.)',
    size: '~500 MB + modèles',
    required: true,
    installed: false,
    installing: false,
    category: 'text',
    commands: ['winget install Ollama.Ollama'],
    downloadUrl: 'https://ollama.com/download'
  },
  {
    id: 'comfyui',
    name: 'ComfyUI',
    description: 'Interface nodale pour Stable Diffusion',
    size: '~2 GB + modèles',
    required: true,
    installed: false,
    installing: false,
    category: 'image',
    commands: [
      'git clone https://github.com/comfyanonymous/ComfyUI',
      'cd ComfyUI',
      'pip install -r requirements.txt'
    ],
    downloadUrl: 'https://github.com/comfyanonymous/ComfyUI'
  },
  {
    id: 'whisper',
    name: 'Whisper (OpenAI)',
    description: 'Transcription audio → texte',
    size: '~1.5 GB (large-v3)',
    required: false,
    installed: false,
    installing: false,
    category: 'audio',
    commands: ['pip install openai-whisper'],
    pythonPackage: 'openai-whisper'
  },
  {
    id: 'xtts',
    name: 'XTTS-v2 (Coqui)',
    description: 'Synthèse vocale + clonage de voix',
    size: '~2 GB',
    required: false,
    installed: false,
    installing: false,
    category: 'audio',
    commands: ['pip install TTS'],
    pythonPackage: 'TTS'
  },
  {
    id: 'rvc',
    name: 'RVC (Retrieval Voice Conversion)',
    description: 'Conversion de voix haute qualité',
    size: '~1 GB',
    required: false,
    installed: false,
    installing: false,
    category: 'audio',
    commands: ['git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI'],
    downloadUrl: 'https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI'
  },
  {
    id: 'demucs',
    name: 'Demucs (Meta)',
    description: 'Séparation de pistes audio',
    size: '~300 MB',
    required: false,
    installed: false,
    installing: false,
    category: 'audio',
    commands: ['pip install demucs'],
    pythonPackage: 'demucs'
  },
  {
    id: 'musicgen',
    name: 'MusicGen (Meta)',
    description: 'Génération de musique IA',
    size: '~3.5 GB',
    required: false,
    installed: false,
    installing: false,
    category: 'audio',
    commands: ['pip install audiocraft'],
    pythonPackage: 'audiocraft'
  },
  {
    id: 'insightface',
    name: 'InsightFace',
    description: 'Reconnaissance et analyse faciale',
    size: '~500 MB',
    required: false,
    installed: false,
    installing: false,
    category: 'analysis',
    commands: ['pip install insightface onnxruntime-gpu'],
    pythonPackage: 'insightface'
  },
  {
    id: 'clip',
    name: 'CLIP (OpenAI)',
    description: 'Recherche sémantique images/texte',
    size: '~400 MB',
    required: false,
    installed: false,
    installing: false,
    category: 'analysis',
    commands: ['pip install clip-interrogator'],
    pythonPackage: 'clip-interrogator'
  },
  {
    id: 'yolo',
    name: 'YOLOv8 (Ultralytics)',
    description: 'Détection d\'objets en temps réel',
    size: '~100 MB',
    required: false,
    installed: false,
    installing: false,
    category: 'analysis',
    commands: ['pip install ultralytics'],
    pythonPackage: 'ultralytics'
  },
  {
    id: 'animatediff',
    name: 'AnimateDiff',
    description: 'Génération vidéo pour ComfyUI',
    size: '~2 GB',
    required: false,
    installed: false,
    installing: false,
    category: 'image',
    commands: [
      'cd ComfyUI/custom_nodes',
      'git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved'
    ]
  }
];

// Script PowerShell d'installation complète
const POWERSHELL_INSTALLER = `
# MediaVault AI Suite - Installation Script
# Exécuter en tant qu'Administrateur

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MediaVault AI Suite - Installation   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier les privilèges admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERREUR: Ce script doit être exécuté en tant qu'Administrateur!" -ForegroundColor Red
    pause
    exit 1
}

$InstallPath = "C:\\MediaVault\\AI"
New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
Set-Location $InstallPath

Write-Host "[1/8] Installation de Python 3.11..." -ForegroundColor Yellow
winget install Python.Python.3.11 --accept-package-agreements --accept-source-agreements

Write-Host "[2/8] Installation de Git..." -ForegroundColor Yellow
winget install Git.Git --accept-package-agreements --accept-source-agreements

Write-Host "[3/8] Installation de Ollama..." -ForegroundColor Yellow
winget install Ollama.Ollama --accept-package-agreements --accept-source-agreements

Write-Host "[4/8] Installation de CUDA Toolkit (pour GPU NVIDIA)..." -ForegroundColor Yellow
winget install Nvidia.CUDA --accept-package-agreements --accept-source-agreements

Write-Host "[5/8] Clonage de ComfyUI..." -ForegroundColor Yellow
if (-not (Test-Path "$InstallPath\\ComfyUI")) {
    git clone https://github.com/comfyanonymous/ComfyUI.git
}
Set-Location "$InstallPath\\ComfyUI"
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt

Write-Host "[6/8] Installation des extensions ComfyUI..." -ForegroundColor Yellow
Set-Location "$InstallPath\\ComfyUI\\custom_nodes"
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git
git clone https://github.com/ltdrdata/ComfyUI-Manager.git
git clone https://github.com/Fannovel16/comfyui_controlnet_aux.git

Write-Host "[7/8] Installation des packages Python IA..." -ForegroundColor Yellow
pip install openai-whisper TTS demucs audiocraft insightface onnxruntime-gpu ultralytics clip-interrogator

Write-Host "[8/8] Téléchargement des modèles de base..." -ForegroundColor Yellow
ollama pull mistral
ollama pull llava

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Installation terminée avec succès !  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Téléchargez un modèle Stable Diffusion dans ComfyUI\\models\\checkpoints\\" -ForegroundColor White
Write-Host "2. Lancez Ollama: ollama serve" -ForegroundColor White
Write-Host "3. Lancez ComfyUI: python main.py" -ForegroundColor White
Write-Host "4. Lancez MediaVault: node server.cjs" -ForegroundColor White
Write-Host ""
pause
`;

// Script batch simplifié
const BAT_INSTALLER = `@echo off
title MediaVault AI Suite - Installation
color 0B

echo.
echo ========================================
echo   MediaVault AI Suite - Installation
echo ========================================
echo.

:: Vérifier admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Executez ce script en tant qu'Administrateur!
    echo Clic droit ^> Executer en tant qu'administrateur
    pause
    exit /b 1
)

set INSTALL_PATH=C:\\MediaVault\\AI
mkdir "%INSTALL_PATH%" 2>nul
cd /d "%INSTALL_PATH%"

echo [1/6] Installation de Ollama...
winget install Ollama.Ollama --accept-package-agreements --accept-source-agreements

echo [2/6] Telechargement des modeles Ollama...
ollama pull mistral
ollama pull llava

echo [3/6] Installation de Python (si necessaire)...
winget install Python.Python.3.11 --accept-package-agreements --accept-source-agreements

echo [4/6] Installation des packages Python IA...
pip install openai-whisper TTS demucs insightface ultralytics

echo [5/6] Clonage de ComfyUI...
if not exist ComfyUI (
    git clone https://github.com/comfyanonymous/ComfyUI.git
)

echo [6/6] Installation des dependances ComfyUI...
cd ComfyUI
pip install -r requirements.txt
cd custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git
git clone https://github.com/ltdrdata/ComfyUI-Manager.git

echo.
echo ========================================
echo   Installation terminee !
echo ========================================
echo.
echo Telechargez un modele SD dans:
echo %INSTALL_PATH%\\ComfyUI\\models\\checkpoints\\
echo.
pause
`;

export const AIInstaller = () => {
  const [tools, setTools] = useState<AITool[]>(AI_TOOLS);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [currentInstalling, setCurrentInstalling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tools');

  const checkInstalledTools = async () => {
    setIsChecking(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/ai/check-installed');
      if (response.ok) {
        const data = await response.json();
        setTools(prev => prev.map(tool => ({
          ...tool,
          installed: data.installed?.includes(tool.id) || false
        })));
        toast.success('Vérification terminée');
      }
    } catch (error) {
      toast.error('Impossible de vérifier les installations', {
        description: 'Le serveur local n\'est pas accessible'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const installTool = async (toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (!tool) return;

    setTools(prev => prev.map(t => 
      t.id === toolId ? { ...t, installing: true } : t
    ));
    setCurrentInstalling(toolId);

    try {
      const response = await fetch('http://localhost:3001/api/ai/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, commands: tool.commands })
      });

      if (response.ok) {
        setTools(prev => prev.map(t => 
          t.id === toolId ? { ...t, installed: true, installing: false } : t
        ));
        toast.success(`${tool.name} installé avec succès !`);
      } else {
        throw new Error('Installation failed');
      }
    } catch (error) {
      toast.error(`Erreur lors de l'installation de ${tool.name}`);
      setTools(prev => prev.map(t => 
        t.id === toolId ? { ...t, installing: false } : t
      ));
    } finally {
      setCurrentInstalling(null);
    }
  };

  const installAllSelected = async () => {
    const toInstall = tools.filter(t => !t.installed);
    setIsInstalling(true);
    setInstallProgress(0);

    for (let i = 0; i < toInstall.length; i++) {
      await installTool(toInstall[i].id);
      setInstallProgress(((i + 1) / toInstall.length) * 100);
    }

    setIsInstalling(false);
    toast.success('Installation complète terminée !');
  };

  const copyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    toast.success('Script copié dans le presse-papier');
  };

  const downloadScript = (script: string, filename: string) => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const installedCount = tools.filter(t => t.installed).length;
  const requiredInstalled = tools.filter(t => t.required && t.installed).length;
  const requiredTotal = tools.filter(t => t.required).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Installation des Outils IA
        </CardTitle>
        <CardDescription>
          Installez automatiquement tous les moteurs IA nécessaires sur votre PC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <div className="text-2xl font-bold">{installedCount}/{tools.length}</div>
            <div className="text-xs text-muted-foreground">Outils installés</div>
          </div>
          <div className={cn(
            "p-4 rounded-lg text-center",
            requiredInstalled === requiredTotal 
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-amber-500/10 border border-amber-500/30"
          )}>
            <div className="text-2xl font-bold">{requiredInstalled}/{requiredTotal}</div>
            <div className="text-xs text-muted-foreground">Requis installés</div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkInstalledTools}
              disabled={isChecking}
              className="gap-2"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Vérifier
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tools">Outils individuels</TabsTrigger>
            <TabsTrigger value="auto">Installation auto</TabsTrigger>
            <TabsTrigger value="manual">Scripts manuels</TabsTrigger>
          </TabsList>

          {/* Individual Tools Tab */}
          <TabsContent value="tools" className="space-y-4 mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {['text', 'image', 'audio', 'analysis'].map(category => (
                  <div key={category} className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">
                      {category === 'text' && '🔤 Texte'}
                      {category === 'image' && '🖼️ Image/Vidéo'}
                      {category === 'audio' && '🎵 Audio'}
                      {category === 'analysis' && '🔍 Analyse'}
                    </Label>
                    {tools.filter(t => t.category === category).map(tool => (
                      <div
                        key={tool.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          tool.installed 
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-muted/30 border-border/50"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tool.name}</span>
                            {tool.required && (
                              <Badge variant="secondary" className="text-xs">Requis</Badge>
                            )}
                            {tool.installed && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                          <p className="text-xs text-muted-foreground">{tool.size}</p>
                        </div>
                        <div className="flex gap-2">
                          {tool.downloadUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(tool.downloadUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant={tool.installed ? "outline" : "default"}
                            size="sm"
                            onClick={() => installTool(tool.id)}
                            disabled={tool.installing || tool.installed}
                          >
                            {tool.installing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : tool.installed ? (
                              'Installé'
                            ) : (
                              'Installer'
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {isInstalling && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Installation en cours: {currentInstalling}</span>
                  <span>{installProgress.toFixed(0)}%</span>
                </div>
                <Progress value={installProgress} />
              </div>
            )}

            <Button
              onClick={installAllSelected}
              disabled={isInstalling || installedCount === tools.length}
              className="w-full gap-2"
              size="lg"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Installation en cours...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Tout installer ({tools.length - installedCount} restants)
                </>
              )}
            </Button>
          </TabsContent>

          {/* Auto Installation Tab */}
          <TabsContent value="auto" className="space-y-4 mt-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-500">Prérequis</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Windows 10/11 avec droits Administrateur</li>
                    <li>• GPU NVIDIA avec 8+ GB VRAM recommandé</li>
                    <li>• 50+ GB d'espace disque libre</li>
                    <li>• Connexion Internet stable</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Script PowerShell (Recommandé)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Installation complète avec GPU CUDA, tous les modèles et extensions.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyScript(POWERSHELL_INSTALLER)}
                      className="gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copier
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadScript(POWERSHELL_INSTALLER, 'install-ai-suite.ps1')}
                      className="gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Télécharger .ps1
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Script Batch (Simple)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Installation basique, idéale pour les débutants.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyScript(BAT_INSTALLER)}
                      className="gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copier
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadScript(BAT_INSTALLER, 'install-ai-suite.bat')}
                      className="gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Télécharger .bat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <p className="text-sm font-medium">Instructions :</p>
              <ol className="text-xs text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs">1</span>
                  <span>Téléchargez le script PowerShell ou Batch</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs">2</span>
                  <span>Clic droit → "Exécuter en tant qu'administrateur"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs">3</span>
                  <span>Attendez la fin de l'installation (~30-60 min)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs">4</span>
                  <span>Téléchargez un modèle Stable Diffusion (SDXL recommandé)</span>
                </li>
              </ol>
            </div>
          </TabsContent>

          {/* Manual Scripts Tab */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-3">
              {tools.map(tool => (
                <div key={tool.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{tool.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyScript(tool.commands.join('\n'))}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto">
                    {tool.commands.join('\n')}
                  </pre>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
