import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Download, Trash2, RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2, Copy, FileText, Play, Square, Terminal, HardDrive, Cpu, Zap, ChevronDown, ChevronRight, ExternalLink, Package, FolderOpen } from 'lucide-react';
import { useLocalAIDiagnostics, AIServiceStatus, DiagnosticLog } from '@/hooks/useLocalAIDiagnostics';
import { useLocalAI } from '@/hooks/useLocalAI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
const SERVICE_INSTALL_COMMANDS: Record<string, {
  windows: string;
  docker: string;
}> = {
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
    clearLogs,
    downloadLogs,
    copyLogsToClipboard
  } = useLocalAIDiagnostics();
  const {
    config
  } = useLocalAI();
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [installMethod, setInstallMethod] = useState<'windows' | 'docker'>('windows');
  useEffect(() => {
    runFullDiagnostics();
  }, []);
  const getStatusIcon = (status: AIServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'offline':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'not_installed':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
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
      not_installed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      error: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      checking: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      blocked: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    };
    const labels: Record<typeof status, string> = {
      online: 'En ligne',
      offline: 'Hors ligne',
      not_installed: 'Non installé',
      error: 'Erreur',
      checking: 'Vérification...',
      blocked: 'Bloqué (HTTPS)'
    };
    return <Badge variant="outline" className={cn('text-xs', variants[status])}>
        {labels[status]}
      </Badge>;
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
  const downloadScript = (scriptName: string) => {
    const link = document.createElement('a');
    link.href = `/scripts/${scriptName}`;
    link.download = scriptName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Script ${scriptName} téléchargé`);
  };
  const onlineCount = services.filter(s => s.status === 'online').length;
  const offlineCount = services.filter(s => s.status === 'offline' || s.status === 'not_installed').length;
  const gpuLabel = systemInfo?.gpuType === 'intel-arc' ? 'Intel Arc' : systemInfo?.gpuType === 'nvidia' ? 'NVIDIA' : systemInfo?.gpuType === 'amd' ? 'AMD' : systemInfo?.gpu?.split('/')[0]?.slice(0, 20) || 'Non détecté';
  return <div className="space-y-6">
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
            <div className={cn("p-3 rounded-lg", systemInfo?.gpuType === 'intel-arc' ? "bg-blue-500/20" : systemInfo?.gpuType === 'nvidia' ? "bg-green-500/20" : "bg-muted")}>
              <Cpu className={cn("w-6 h-6", systemInfo?.gpuType === 'intel-arc' ? "text-blue-500" : systemInfo?.gpuType === 'nvidia' ? "text-green-500" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-sm font-medium truncate max-w-[150px]">{gpuLabel}</p>
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
            <Button onClick={runFullDiagnostics} disabled={isRunningDiagnostics} className="gap-2">
              {isRunningDiagnostics ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
              {services.map((service, index) => <motion.div key={service.id} initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: index * 0.05
            }}>
                  <Collapsible open={expandedService === service.id} onOpenChange={open => setExpandedService(open ? service.id : null)}>
                    <Card className={cn("transition-all", service.status === 'online' && "border-green-500/30", service.status === 'offline' && "border-red-500/30", service.status === 'not_installed' && "border-orange-500/30", service.status === 'error' && "border-yellow-500/30")}>
                      <CollapsibleTrigger className="w-full">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getStatusIcon(service.status)}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{service.name}</p>
                                {service.portMode && <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    {service.portMode}
                                  </Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{service.url}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {service.latency && <span className="text-xs text-muted-foreground">
                                {service.latency}ms
                              </span>}
                            {getStatusBadge(service.status)}
                            {expandedService === service.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          {service.error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                              <p className="font-medium text-red-400 mb-1">Erreur:</p>
                              <p className="text-red-300">{service.error}</p>
                            </div>}
                          
                          {service.installPath && <div className="p-2 rounded bg-muted/50 text-xs font-mono flex items-center gap-2">
                              <FolderOpen className="w-3 h-3" />
                              <span>%USERPROFILE%\MediaVault-AI\{service.installPath}</span>
                            </div>}
                          
                          {service.capabilities && <div>
                              <p className="text-sm text-muted-foreground mb-2">Fonctionnalités:</p>
                              <div className="flex flex-wrap gap-1">
                                {service.capabilities.map(cap => <Badge key={cap} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>)}
                              </div>
                            </div>}
                          
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => checkSingleService(service.id)} className="gap-1">
                              <RefreshCw className="w-3 h-3" />
                              Retester
                            </Button>
                            
                            {service.status === 'online' && <Button size="sm" variant="outline" onClick={() => window.open(service.url, '_blank')} className="gap-1">
                                <ExternalLink className="w-3 h-3" />
                                Ouvrir
                              </Button>}
                            
                            {(service.status === 'offline' || service.status === 'not_installed') && SERVICE_INSTALL_COMMANDS[service.id] && <Button size="sm" variant="default" onClick={() => {
                          navigator.clipboard.writeText(installMethod === 'windows' ? SERVICE_INSTALL_COMMANDS[service.id].windows : SERVICE_INSTALL_COMMANDS[service.id].docker);
                          toast.success('Commande copiée');
                        }} className="gap-1">
                                <Copy className="w-3 h-3" />
                                Copier commande
                              </Button>}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </motion.div>)}
            </AnimatePresence>
          </div>
        </TabsContent>

          {/* Installation Tab */}
        <TabsContent value="install" className="space-y-4">
          {/* Quick Download Scripts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Installation (Auto + Mode Debug)
              </CardTitle>
              <CardDescription>
                Utilise le mode "Debug étape par étape" pour trouver exactement où ça coince. Chaque étape crée un log dédié.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode normal */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Mode normal (1 clic)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button size="lg" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('install-ai-suite-auto.bat')}>
                    <Download className="w-6 h-6" />
                    <span className="font-semibold">Installation + diagnostic</span>
                    <span className="text-xs opacity-80">install-ai-suite-auto.bat</span>
                  </Button>

                  <Button size="lg" variant="secondary" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('install-ai-suite-complete.ps1')}>
                    <Download className="w-6 h-6" />
                    <span className="font-semibold">Installation PowerShell</span>
                    <span className="text-xs opacity-80">install-ai-suite-complete.ps1</span>
                  </Button>

                  <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('start-ai-services.bat')}>
                    <Play className="w-6 h-6" />
                    <span className="font-semibold">Démarrer les services</span>
                    <span className="text-xs opacity-80">start-ai-services.bat</span>
                  </Button>
                </div>
              </div>

              {/* Mode debug étape par étape */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Mode Debug (étape par étape) — temporaire</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('step-00-prepare.bat')}>
                    <FileText className="w-6 h-6" />
                    <span className="font-semibold">Étape 00</span>
                    <span className="text-xs opacity-80">Préparation / logs</span>
                  </Button>

                  <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('step-01-prereqs.bat')}>
                    <FileText className="w-6 h-6" />
                    <span className="font-semibold">Étape 01</span>
                    <span className="text-xs opacity-80">Prérequis (winget)</span>
                  </Button>

                  <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('step-02-python311.bat')}>
                    <FileText className="w-6 h-6" />
                    <span className="font-semibold">Étape 02</span>
                    <span className="text-xs opacity-80">Python 3.11</span>
                  </Button>

                  <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('step-03-git.bat')}>
                    <FileText className="w-6 h-6" />
                    <span className="font-semibold">Étape 03</span>
                    <span className="text-xs opacity-80">Git</span>
                  </Button>

                  <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('step-04-ollama.bat')}>
                    
                    <span className="font-semibold">Étape 04</span>
                    <span className="text-xs opacity-80">Ollama</span>
                  </Button>

                  <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('step-05-run-complete-installer.bat')}>
                    <FileText className="w-6 h-6" />
                    <span className="font-semibold">Étape 05</span>
                    <span className="text-xs opacity-80">Installer services (PS1)</span>
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Ordre recommandé :</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Étape 00 → 01 → 02 → 03 → 04 → 05</li>
                    <li>Si une étape échoue, envoie-moi juste le fichier log correspondant (dans <code className="px-1 py-0.5 rounded bg-muted">%USERPROFILE%\MediaVault-AI\logs\</code>).</li>
                  </ol>
                </div>
              </div>

              {/* Outils */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('stop-ai-services.bat')}>
                  <Square className="w-6 h-6" />
                  <span className="font-semibold">Arrêter les services</span>
                  <span className="text-xs opacity-80">stop-ai-services.bat</span>
                </Button>

                <Button size="lg" variant="outline" className="h-auto py-4 flex-col gap-2 border-amber-500/50 hover:bg-amber-500/10" onClick={async () => {
                try {
                  const response = await fetch('http://localhost:3001/api/ai/install-logs');
                  if (!response.ok) {
                    const err = await response.json();
                    toast.error(err.error || 'Impossible de récupérer les logs');
                    return;
                  }
                  const data = await response.json();
                  const blob = new Blob([data.content], {
                    type: 'text/plain'
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = data.filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success(`Log téléchargé: ${data.filename}`);
                } catch (e) {
                  toast.error('Serveur local non accessible. Lancez server.cjs d\'abord.');
                }
              }}>
                  <FileText className="w-6 h-6 text-amber-500" />
                  <span className="font-semibold">Dernier log d'installation</span>
                  <span className="text-xs opacity-80">Télécharger automatiquement</span>
                </Button>

                <Button size="lg" variant="destructive" className="h-auto py-4 flex-col gap-2" onClick={() => downloadScript('uninstall-ai-suite.bat')}>
                  <Trash2 className="w-6 h-6" />
                  <span className="font-semibold">Désinstallation</span>
                  <span className="text-xs opacity-80">uninstall-ai-suite.bat</span>
                </Button>
              </div>
              
              {systemInfo?.gpuType === 'intel-arc' && <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Intel Arc GPU Détecté
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Votre système dispose d'un GPU Intel Arc. Le script d'installation configurera 
                    automatiquement PyTorch avec support Intel OneAPI pour de meilleures performances.
                  </p>
                </div>}
            </CardContent>
          </Card>

          {/* Manual Installation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Installation manuelle par service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant={installMethod === 'windows' ? 'default' : 'outline'} size="sm" onClick={() => setInstallMethod('windows')}>
                  Windows
                </Button>
                <Button variant={installMethod === 'docker' ? 'default' : 'outline'} size="sm" onClick={() => setInstallMethod('docker')}>
                  Docker
                </Button>
              </div>
              
              <div className="space-y-3">
                {services.map(service => <div key={service.id} className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{service.name}</span>
                      {getStatusBadge(service.status)}
                    </div>
                    {SERVICE_INSTALL_COMMANDS[service.id] && <div className="flex gap-2">
                        <code className="flex-1 text-xs bg-background p-2 rounded overflow-x-auto">
                          {installMethod === 'windows' ? SERVICE_INSTALL_COMMANDS[service.id].windows : SERVICE_INSTALL_COMMANDS[service.id].docker}
                        </code>
                        <Button size="sm" variant="ghost" onClick={() => {
                    navigator.clipboard.writeText(installMethod === 'windows' ? SERVICE_INSTALL_COMMANDS[service.id].windows : SERVICE_INSTALL_COMMANDS[service.id].docker);
                    toast.success('Commande copiée');
                  }}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>}
                  </div>)}
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
                {logs.length === 0 ? <p className="text-muted-foreground text-center py-8">
                    Aucun log. Lancez un diagnostic pour commencer.
                  </p> : logs.map(log => <motion.div key={log.id} initial={{
                opacity: 0,
                x: -10
              }} animate={{
                opacity: 1,
                x: 0
              }} className={cn("flex gap-2 p-2 rounded", log.level === 'error' && "bg-red-500/10", log.level === 'warning' && "bg-yellow-500/10", log.level === 'success' && "bg-green-500/10")}>
                      {getLogIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{log.timestamp.toLocaleTimeString()}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.service}
                          </Badge>
                        </div>
                        <p className={cn(log.level === 'error' && "text-red-400", log.level === 'warning' && "text-yellow-400", log.level === 'success' && "text-green-400")}>
                          {log.message}
                        </p>
                        {log.details && <p className="text-xs text-muted-foreground mt-1">
                            → {log.details}
                          </p>}
                      </div>
                    </motion.div>)}
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
                    <li>Vérifiez que le service est démarré avec "start-ai-services.bat"</li>
                    <li>Vérifiez que le dossier d'installation existe</li>
                    <li>Vérifiez que le port n'est pas bloqué par un pare-feu</li>
                    <li>Consultez les logs du service pour plus de détails</li>
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
                    <li>Réinstallez le service avec le script d'installation complet</li>
                  </ul>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Problèmes de GPU
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>NVIDIA:</strong> Installez CUDA 12.1+ et les derniers drivers</li>
                    <li><strong>Intel Arc:</strong> Installez Intel oneAPI et les drivers Arc</li>
                    <li>Utilisez le mode CPU si pas de GPU compatible</li>
                  </ul>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" />
                    Réinstallation propre
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>1. Téléchargez et exécutez "uninstall-ai-suite.ps1"</li>
                    <li>2. Redémarrez l'ordinateur</li>
                    <li>3. Téléchargez et exécutez "install-ai-suite-complete.ps1"</li>
                    <li>4. Vérifiez les services avec le diagnostic</li>
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
    </div>;
}