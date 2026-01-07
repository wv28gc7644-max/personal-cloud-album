import { useState, useEffect } from 'react';
import { useLocalAI, GPU_PROFILES } from '@/hooks/useLocalAI';
import { useComfyUI } from '@/hooks/useComfyUI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Server,
  Cpu,
  Zap,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Image,
  MessageSquare,
  Gauge,
  HardDrive,
  Activity,
  Terminal,
  Bell,
  Package,
  Settings2,
  Rocket,
  ExternalLink,
  Copy,
  Play,
  Music,
  Mic,
  Search,
  AlertTriangle,
  FileDown,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AIServiceDiagnostics } from './AIServiceDiagnostics';
import { AIServiceLogs } from './AIServiceLogs';
import { WebhookNotifications } from './WebhookNotifications';

// Service configuration
interface AIService {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  port: number;
  category: 'text' | 'image' | 'audio' | 'analysis';
  required: boolean;
  installCmd: string[];
  downloadUrl?: string;
}

const AI_SERVICES: AIService[] = [
  { 
    id: 'ollama', name: 'Ollama', 
    description: 'Modèles texte (LLaMA, Mistral)', 
    icon: MessageSquare, port: 11434, category: 'text', required: true,
    installCmd: ['winget install Ollama.Ollama'],
    downloadUrl: 'https://ollama.com/download'
  },
  { 
    id: 'comfyui', name: 'ComfyUI', 
    description: 'Images & Vidéos (Stable Diffusion)', 
    icon: Image, port: 8188, category: 'image', required: true,
    installCmd: ['git clone https://github.com/comfyanonymous/ComfyUI', 'pip install -r requirements.txt']
  },
  { 
    id: 'whisper', name: 'Whisper', 
    description: 'Transcription audio → texte', 
    icon: Mic, port: 9000, category: 'audio', required: false,
    installCmd: ['pip install openai-whisper']
  },
  { 
    id: 'xtts', name: 'XTTS', 
    description: 'Synthèse vocale & clonage', 
    icon: Music, port: 8020, category: 'audio', required: false,
    installCmd: ['pip install TTS']
  },
  { 
    id: 'musicgen', name: 'MusicGen', 
    description: 'Génération de musique', 
    icon: Music, port: 8030, category: 'audio', required: false,
    installCmd: ['pip install audiocraft']
  },
  { 
    id: 'demucs', name: 'Demucs', 
    description: 'Séparation de pistes audio', 
    icon: Music, port: 8040, category: 'audio', required: false,
    installCmd: ['pip install demucs']
  },
  { 
    id: 'clip', name: 'CLIP', 
    description: 'Recherche sémantique', 
    icon: Search, port: 8060, category: 'analysis', required: false,
    installCmd: ['pip install clip-interrogator']
  },
  { 
    id: 'esrgan', name: 'ESRGAN', 
    description: 'Upscaling d\'images', 
    icon: Zap, port: 8070, category: 'analysis', required: false,
    installCmd: ['pip install realesrgan']
  },
];

export function LocalAISettingsReorganized() {
  const {
    config: aiConfig,
    updateConfig: updateAIConfig,
    isConnected: ollamaConnected,
    isLoading: ollamaLoading,
    models,
    error: ollamaError,
    testConnection: testOllama,
    pullModel,
    deleteModel,
    gpuProfiles
  } = useLocalAI();

  const {
    config: comfyConfig,
    updateConfig: updateComfyConfig,
    isConnected: comfyConnected,
    isLoading: comfyLoading,
    error: comfyError,
    testConnection: testComfy
  } = useComfyUI();

  const [pullProgress, setPullProgress] = useState<{ model: string; status: string; progress: number } | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, 'unknown' | 'online' | 'offline' | 'checking'>>({});

  // Test connections on mount
  useEffect(() => {
    if (aiConfig.enabled) testOllama();
    if (comfyConfig.enabled) testComfy();
  }, []);

  const checkService = async (service: AIService) => {
    setServiceStatuses(prev => ({ ...prev, [service.id]: 'checking' }));
    
    try {
      const endpoint = service.id === 'ollama' ? '/api/tags' : 
                      service.id === 'comfyui' ? '/system_stats' : '/health';
      const response = await fetch(`http://localhost:${service.port}${endpoint}`, {
        signal: AbortSignal.timeout(3000)
      });
      setServiceStatuses(prev => ({ ...prev, [service.id]: response.ok ? 'online' : 'offline' }));
    } catch {
      setServiceStatuses(prev => ({ ...prev, [service.id]: 'offline' }));
    }
  };

  const checkAllServices = async () => {
    for (const service of AI_SERVICES) {
      await checkService(service);
    }
    toast.success('Vérification terminée');
  };

  const handlePullModel = async () => {
    if (!newModelName.trim()) {
      toast.error('Entrez un nom de modèle');
      return;
    }

    setPullProgress({ model: newModelName, status: 'Démarrage...', progress: 0 });

    const success = await pullModel(newModelName, (status, completed, total) => {
      setPullProgress({
        model: newModelName,
        status,
        progress: total > 0 ? (completed / total) * 100 : 0
      });
    });

    if (success) {
      toast.success(`Modèle ${newModelName} installé`);
      setNewModelName('');
    } else {
      toast.error('Échec du téléchargement');
    }
    
    setPullProgress(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
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

  const currentProfile = gpuProfiles.find(p => p.id === aiConfig.gpuProfile);
  const onlineCount = Object.values(serviceStatuses).filter(s => s === 'online').length;
  const offlineCount = Object.values(serviceStatuses).filter(s => s === 'offline').length;

  const INSTALL_SCRIPT = `@echo off
title MediaVault AI - Installation Complete
color 0B

echo ========================================
echo   MediaVault AI Suite - Installation
echo ========================================
echo.

:: Verifier admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Executez en tant qu'Administrateur!
    pause
    exit /b 1
)

set INSTALL_PATH=C:\\MediaVault\\AI
mkdir "%INSTALL_PATH%" 2>nul
cd /d "%INSTALL_PATH%"

echo [1/5] Installation Ollama...
winget install Ollama.Ollama -h --accept-package-agreements

echo [2/5] Telechargement modeles de base...
ollama pull mistral
ollama pull llava

echo [3/5] Installation Python 3.11...
winget install Python.Python.3.11 -h --accept-package-agreements

echo [4/5] Installation packages Python IA...
pip install openai-whisper TTS demucs audiocraft insightface ultralytics clip-interrogator realesrgan

echo [5/5] Clonage ComfyUI...
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI && pip install -r requirements.txt

echo.
echo ========================================
echo   Installation terminee !
echo ========================================
pause`;

  return (
    <div className="space-y-6">
      {/* Quick Status Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">IA Locale</h3>
                <p className="text-sm text-muted-foreground">
                  {aiConfig.enabled ? 'Activée' : 'Désactivée'} • 
                  {ollamaConnected ? ` ${models.length} modèles` : ' Non connecté'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <Badge variant="outline" className={cn(
                  "gap-1",
                  onlineCount > 0 ? "border-green-500/50 text-green-500" : ""
                )}>
                  <CheckCircle className="h-3 w-3" />
                  {onlineCount}
                </Badge>
                <Badge variant="outline" className={cn(
                  "gap-1",
                  offlineCount > 0 ? "border-red-500/50 text-red-500" : ""
                )}>
                  <XCircle className="h-3 w-3" />
                  {offlineCount}
                </Badge>
              </div>
              <Switch
                checked={aiConfig.enabled}
                onCheckedChange={(checked) => updateAIConfig({ enabled: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-background">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="install" className="gap-2 data-[state=active]:bg-background">
            <Package className="h-4 w-4" />
            Installation
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2 data-[state=active]:bg-background">
            <MessageSquare className="h-4 w-4" />
            Modèles
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2 data-[state=active]:bg-background">
            <Settings2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-background">
            <Terminal className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Services IA</h3>
            <Button variant="outline" size="sm" onClick={checkAllServices}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tout vérifier
            </Button>
          </div>

          {/* Service Categories */}
          {['text', 'image', 'audio', 'analysis'].map(category => (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {category === 'text' && '🔤 Texte'}
                {category === 'image' && '🖼️ Image & Vidéo'}
                {category === 'audio' && '🎵 Audio'}
                {category === 'analysis' && '🔍 Analyse'}
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {AI_SERVICES.filter(s => s.category === category).map(service => {
                  const status = serviceStatuses[service.id] || 'unknown';
                  return (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        status === 'online' && "bg-green-500/5 border-green-500/30",
                        status === 'offline' && "bg-red-500/5 border-red-500/30",
                        status === 'unknown' && "bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        status === 'online' && "bg-green-500/20",
                        status === 'offline' && "bg-red-500/20",
                        status === 'unknown' && "bg-muted"
                      )}>
                        <service.icon className={cn(
                          "h-4 w-4",
                          status === 'online' && "text-green-500",
                          status === 'offline' && "text-red-500",
                          status === 'unknown' && "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{service.name}</span>
                          {service.required && (
                            <Badge variant="secondary" className="text-[10px] h-4">Requis</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        :{service.port}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => checkService(service)}
                      >
                        {status === 'checking' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Installation Tab */}
        <TabsContent value="install" className="space-y-4">
          {/* Quick Install */}
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Rocket className="h-5 w-5 text-green-500" />
                Installation Rapide
              </CardTitle>
              <CardDescription>
                Téléchargez et exécutez ce script pour installer tous les composants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={() => downloadScript(INSTALL_SCRIPT, 'install-mediavault-ai.bat')}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Télécharger le script
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(INSTALL_SCRIPT)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Exécutez en tant qu'Administrateur (clic droit → Exécuter en tant qu'admin)
              </p>
            </CardContent>
          </Card>

          {/* Manual Installation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Installation manuelle</CardTitle>
              <CardDescription>Installez chaque service individuellement</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {AI_SERVICES.map(service => (
                  <AccordionItem key={service.id} value={service.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <service.icon className="h-4 w-4 text-primary" />
                        <span>{service.name}</span>
                        {service.required && (
                          <Badge variant="secondary" className="text-xs">Requis</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      
                      <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                        {service.installCmd.map((cmd, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <code>{cmd}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(cmd)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      {service.downloadUrl && (
                        <Button variant="link" className="h-auto p-0 text-xs" asChild>
                          <a href={service.downloadUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Page de téléchargement
                          </a>
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Scripts de démarrage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Play className="h-5 w-5 text-primary" />
                Scripts de gestion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-3 flex-col" asChild>
                  <a href="/scripts/start-ai-services.bat" download>
                    <Play className="h-5 w-5 mb-1 text-green-500" />
                    <span className="font-medium">Démarrer les services</span>
                    <span className="text-xs text-muted-foreground">start-ai-services.bat</span>
                  </a>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col" asChild>
                  <a href="/scripts/stop-ai-services.bat" download>
                    <XCircle className="h-5 w-5 mb-1 text-red-500" />
                    <span className="font-medium">Arrêter les services</span>
                    <span className="text-xs text-muted-foreground">stop-ai-services.bat</span>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          {/* Connection Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-5 w-5" />
                Connexion Ollama
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={aiConfig.ollamaUrl}
                  onChange={(e) => updateAIConfig({ ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => testOllama()} disabled={ollamaLoading}>
                  {ollamaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                ollamaConnected ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                {ollamaConnected ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      Connecté • {models.length} modèle(s)
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-600 dark:text-red-400">
                      {ollamaError || 'Non connecté'}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Download Model */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5" />
                Télécharger un modèle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="mistral:7b ou llama3.2:latest"
                  disabled={!ollamaConnected || !!pullProgress}
                />
                <Button 
                  onClick={handlePullModel}
                  disabled={!ollamaConnected || !newModelName.trim() || !!pullProgress}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Installer
                </Button>
              </div>
              
              {pullProgress && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{pullProgress.model}</span>
                    <span>{pullProgress.status}</span>
                  </div>
                  <Progress value={pullProgress.progress} />
                </div>
              )}

              {/* Recommended Models */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Modèles recommandés :</p>
                <div className="flex flex-wrap gap-1">
                  {currentProfile?.recommendedModels.map(model => (
                    <Badge 
                      key={model} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setNewModelName(model)}
                    >
                      {model}
                    </Badge>
                  )) || ['mistral', 'llama3.2', 'gemma2', 'phi3'].map(m => (
                    <Badge 
                      key={m} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setNewModelName(m)}
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installed Models */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Modèles installés</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {models.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Aucun modèle installé</p>
                      <p className="text-xs">Téléchargez un modèle ci-dessus</p>
                    </div>
                  ) : (
                    models.map(model => (
                      <div
                        key={model.name}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          aiConfig.selectedModel === model.name && "border-primary bg-primary/5"
                        )}
                      >
                        <div>
                          <p className="font-medium">{model.name}</p>
                          <p className="text-xs text-muted-foreground">{model.size}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={aiConfig.selectedModel === model.name ? "default" : "outline"}
                            onClick={() => updateAIConfig({ selectedModel: model.name })}
                          >
                            {aiConfig.selectedModel === model.name ? 'Actif' : 'Utiliser'}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteModel(model.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          {/* GPU Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <HardDrive className="h-5 w-5" />
                Profil GPU
              </CardTitle>
              <CardDescription>Sélectionnez votre configuration matérielle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={aiConfig.gpuProfile}
                onValueChange={(v) => updateAIConfig({ gpuProfile: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gpuProfiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        <span>{profile.name}</span>
                        <Badge variant="secondary" className="text-xs">{profile.vram}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Priority Mode */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gauge className="h-5 w-5" />
                Priorité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'quality', label: 'Qualité', icon: Zap, desc: 'Meilleurs résultats' },
                  { id: 'balanced', label: 'Équilibré', icon: Gauge, desc: 'Bon compromis' },
                  { id: 'speed', label: 'Rapidité', icon: RefreshCw, desc: 'Réponses rapides' }
                ].map(mode => (
                  <Button
                    key={mode.id}
                    variant={aiConfig.priorityMode === mode.id ? 'default' : 'outline'}
                    className="h-auto py-4 flex-col gap-1"
                    onClick={() => updateAIConfig({ priorityMode: mode.id as any })}
                  >
                    <mode.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{mode.label}</span>
                    <span className="text-[10px] text-muted-foreground">{mode.desc}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ComfyUI Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="h-5 w-5" />
                ComfyUI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="font-medium">Activer ComfyUI</Label>
                  <p className="text-xs text-muted-foreground">Génération d'images locale</p>
                </div>
                <Switch
                  checked={comfyConfig.enabled}
                  onCheckedChange={(checked) => updateComfyConfig({ enabled: checked })}
                />
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={comfyConfig.url}
                  onChange={(e) => updateComfyConfig({ url: e.target.value })}
                  placeholder="http://localhost:8188"
                />
                <Button variant="outline" onClick={() => testComfy()} disabled={comfyLoading}>
                  {comfyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                comfyConnected ? "bg-green-500/10" : "bg-muted/50"
              )}>
                {comfyConnected ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Connecté</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{comfyError || 'Non connecté'}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grok Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-xl font-bold">𝕏</span>
                Grok (xAI)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pour utiliser Grok, configurez votre clé API xAI dans les secrets du backend.
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Créez un compte sur <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.x.ai</a></li>
                <li>Générez une clé API</li>
                <li>Ajoutez-la comme secret <code className="bg-muted px-1 rounded">XAI_API_KEY</code></li>
              </ol>
            </CardContent>
          </Card>

          {/* Notifications */}
          <WebhookNotifications />
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <AIServiceDiagnostics />
          <AIServiceLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
