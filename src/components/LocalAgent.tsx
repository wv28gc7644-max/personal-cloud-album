import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Play,
  Square,
  RefreshCw,
  Wifi,
  WifiOff,
  Cpu,
  HardDrive,
  FileText,
  Activity,
  Download,
  Wrench,
  Trash2,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Rocket,
  ExternalLink,
  Package,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AgentTerminal } from './AgentTerminal';
import { useLocalAgent } from '@/hooks/useLocalAgent';
import { cn } from '@/lib/utils';

interface TerminalLine {
  id: string;
  type: 'stdout' | 'stderr' | 'info' | 'success' | 'error' | 'command';
  text: string;
  timestamp: Date;
}

const INSTALLATION_STEPS = [
  { id: 'step-00', label: 'Préparation', description: 'Créer les dossiers nécessaires' },
  { id: 'step-01', label: 'Prérequis', description: 'Vérifier/installer les outils de base' },
  { id: 'step-02', label: 'Python 3.11', description: 'Installer Python 3.11' },
  { id: 'step-03', label: 'Git', description: 'Installer Git' },
  { id: 'step-04', label: 'Ollama', description: 'Installer Ollama (LLM local)' },
  { id: 'step-05', label: 'Suite IA', description: 'Installer tous les services IA' },
];

const MAINTENANCE_COMMANDS = [
  { id: 'diagnose', label: 'Diagnostic', icon: Activity, description: 'Analyser l\'état du système' },
  { id: 'start-services', label: 'Démarrer', icon: Play, description: 'Démarrer les services IA' },
  { id: 'stop-services', label: 'Arrêter', icon: Square, description: 'Arrêter les services IA' },
];

const SYSTEM_COMMANDS = [
  { id: 'ollama-version', label: 'Ollama' },
  { id: 'python-version', label: 'Python' },
  { id: 'git-version', label: 'Git' },
  { id: 'nvidia-smi', label: 'GPU' },
];

// Vérifier si on est en HTTPS (Lovable preview)
const isHTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:';

export default function LocalAgent() {
  const {
    isConnected,
    isLoading,
    error,
    executeCommand,
    streamCommand,
    availableCommands,
    logFiles,
    fetchLogFiles,
    readLogFile,
    processes,
    fetchProcesses,
    systemInfo,
    fetchSystemInfo,
    testConnection
  } = useLocalAgent();

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<string | null>(null);
  const [selectedLogContent, setSelectedLogContent] = useState<string | null>(null);
  const [selectedLogName, setSelectedLogName] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [setupOpen, setSetupOpen] = useState(true);
  const [autoInstallProgress, setAutoInstallProgress] = useState(0);

  // Connexion initiale
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  // Rafraîchir les données quand connecté
  useEffect(() => {
    if (isConnected) {
      fetchLogFiles();
      fetchProcesses();
      fetchSystemInfo();
      
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(() => {
        fetchProcesses();
        fetchLogFiles();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchLogFiles, fetchProcesses, fetchSystemInfo]);

  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    setTerminalLines(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      text,
      timestamp: new Date()
    }]);
  }, []);

  const clearTerminal = useCallback(() => {
    setTerminalLines([]);
  }, []);

  const runCommand = useCallback(async (commandId: string, useStream = true) => {
    if (isRunning) return;
    
    setIsRunning(true);
    setCurrentCommand(commandId);
    addLine('command', commandId);

    // Gérer auto-install avec progression
    if (commandId === 'auto-install') {
      setAutoInstallProgress(0);
    }

    if (useStream) {
      let stepCount = 0;
      const cleanup = streamCommand(commandId, (line) => {
        if (line.type === 'stdout' && line.text) {
          addLine('stdout', line.text);
        } else if (line.type === 'stderr' && line.text) {
          addLine('stderr', line.text);
        } else if (line.type === 'info' && line.text) {
          addLine('info', line.text);
          // Détecter les étapes pour la progression
          if (line.text.includes('Étape')) {
            stepCount++;
            setAutoInstallProgress(Math.round((stepCount / 7) * 100));
          }
        } else if (line.type === 'success' && line.text) {
          addLine('success', line.text);
        } else if (line.type === 'exit') {
          if (line.code === 0) {
            addLine('success', `✓ Commande terminée (code: ${line.code})`);
            setCompletedSteps(prev => new Set([...prev, commandId]));
            if (commandId === 'auto-install') {
              setAutoInstallProgress(100);
            }
          } else {
            addLine('error', `✗ Erreur (code: ${line.code})`);
          }
          setIsRunning(false);
          setCurrentCommand(null);
          fetchLogFiles();
        } else if (line.type === 'error') {
          addLine('error', line.message || line.text || 'Erreur inconnue');
          setIsRunning(false);
          setCurrentCommand(null);
        }
      });
      
      // Cleanup sera appelé quand le stream se termine
    } else {
      const result = await executeCommand(commandId);
      if (result) {
        if (result.stdout) {
          result.stdout.split('\n').forEach(line => {
            if (line.trim()) addLine('stdout', line);
          });
        }
        if (result.stderr) {
          result.stderr.split('\n').forEach(line => {
            if (line.trim()) addLine('stderr', line);
          });
        }
        if (result.success) {
          addLine('success', `✓ Succès (code: ${result.exitCode})`);
          setCompletedSteps(prev => new Set([...prev, commandId]));
        } else {
          addLine('error', `✗ Échec (code: ${result.exitCode})`);
        }
      }
      setIsRunning(false);
      setCurrentCommand(null);
    }
  }, [isRunning, streamCommand, executeCommand, addLine, fetchLogFiles]);

  // Fonctions de téléchargement
  const downloadServerFile = () => {
    import('@/assets/serverTemplate').then(({ serverTemplate }) => {
      const blob = new Blob([serverTemplate], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'server.cjs';
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const downloadStartScript = () => {
    // Script batch compatible Windows (ASCII uniquement, pas d'Unicode)
    const scriptContent = [
      '@echo off',
      'title MediaVault - Serveur Local',
      'echo.',
      'echo ============================================',
      'echo           MediaVault - Demarrage',
      'echo ============================================',
      'echo.',
      '',
      'REM Verifier Node.js',
      'where node >nul 2>nul',
      'if errorlevel 1 (',
      '    echo [ERREUR] Node.js non installe!',
      '    echo.',
      '    echo Telechargez Node.js: https://nodejs.org/',
      '    echo.',
      '    pause',
      '    exit /b 1',
      ')',
      '',
      'echo [OK] Node.js detecte',
      'echo.',
      'echo Demarrage du serveur...',
      'echo.',
      '',
      'REM Ouvrir le navigateur',
      'start "" "http://localhost:3001"',
      '',
      'REM Lancer le serveur',
      'node server.cjs',
      '',
      'pause',
      ''
    ].join('\r\n');
    
    const blob = new Blob([scriptContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Lancer MediaVault.bat';
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadLogFile = async (filename: string) => {
    const content = await readLogFile(filename);
    if (content) {
      setSelectedLogContent(content);
      setSelectedLogName(filename);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Terminal className="w-7 h-7" />
            Agent Local
          </h1>
          <p className="text-muted-foreground">
            Contrôle à distance de l'installation et des services IA
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Badge variant="outline" className="gap-2 text-green-500 border-green-500/30">
              <Wifi className="w-3 h-3" />
              Connecté
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-2 text-red-500 border-red-500/30">
              <WifiOff className="w-3 h-3" />
              Déconnecté
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={testConnection}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Reconnecter
          </Button>
        </div>
      </div>

      {/* Avertissement HTTPS */}
      {isHTTPS && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-500">Connexion bloquée (HTTPS)</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vous accédez à MediaVault via HTTPS, ce qui bloque la connexion à votre serveur local (HTTP).
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open('http://localhost:3001', '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir en local
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Section Téléchargement & Configuration (si non connecté) */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
              <Card className="border-dashed border-2">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <div>
                          <CardTitle className="text-base">Télécharger & Démarrer le serveur</CardTitle>
                          <CardDescription>Configurez votre serveur local en 3 étapes</CardDescription>
                        </div>
                      </div>
                      <ChevronDown className={cn("w-5 h-5 transition-transform", setupOpen && "rotate-180")} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Boutons de téléchargement */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button variant="outline" className="gap-2 h-auto py-3" onClick={downloadServerFile}>
                        <Download className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium">server.cjs</div>
                          <div className="text-xs text-muted-foreground">Fichier serveur</div>
                        </div>
                      </Button>
                      <Button variant="outline" className="gap-2 h-auto py-3" onClick={downloadStartScript}>
                        <Download className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium">Lancer MediaVault.bat</div>
                          <div className="text-xs text-muted-foreground">Script de démarrage</div>
                        </div>
                      </Button>
                    </div>

                    {/* Mini-guide */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-medium">Guide rapide :</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                          <span>Téléchargez les 2 fichiers ci-dessus</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                          <span>Placez-les dans <code className="bg-muted px-1 rounded">C:\MediaVault\</code></span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                          <span>Double-cliquez sur <code className="bg-muted px-1 rounded">Lancer MediaVault.bat</code></span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Prérequis : <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Node.js</a> doit être installé.
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton Installation 1-Clic (si connecté) */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-green-500" />
                    Installation Automatique (1 Clic)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Installe Python, Git, Ollama et tous les services IA automatiquement
                  </p>
                  {currentCommand === 'auto-install' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Progression</span>
                        <span>{autoInstallProgress}%</span>
                      </div>
                      <Progress value={autoInstallProgress} className="h-2" />
                    </div>
                  )}
                </div>
                <Button 
                  size="lg"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => runCommand('auto-install')}
                  disabled={isRunning || completedSteps.has('auto-install')}
                >
                  {currentCommand === 'auto-install' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Installation...
                    </>
                  ) : completedSteps.has('auto-install') ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Installé
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      Installer Tout
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {error && !isHTTPS && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="font-medium text-red-500">Erreur de connexion</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Assurez-vous que le serveur local est démarré: <code className="bg-muted px-1 rounded">node server.cjs</code>
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Panneau gauche: Installation & Maintenance */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Tabs defaultValue="install" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="install">Installation</TabsTrigger>
              <TabsTrigger value="maintain">Maintenance</TabsTrigger>
              <TabsTrigger value="system">Système</TabsTrigger>
            </TabsList>
            
            <TabsContent value="install" className="flex-1 mt-4">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Étapes d'installation</CardTitle>
                  <CardDescription>Exécutez chaque étape dans l'ordre</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {INSTALLATION_STEPS.map((step, index) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3 h-auto py-3",
                            currentCommand === step.id && "bg-primary/10",
                            completedSteps.has(step.id) && "bg-green-500/10"
                          )}
                          onClick={() => runCommand(step.id)}
                          disabled={!isConnected || isRunning}
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                            {completedSteps.has(step.id) ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : currentCommand === step.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{step.label}</div>
                            <div className="text-xs text-muted-foreground">{step.description}</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintain" className="flex-1 mt-4">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Maintenance</CardTitle>
                  <CardDescription>Gérer les services IA</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {MAINTENANCE_COMMANDS.map((cmd) => (
                    <Button
                      key={cmd.id}
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => runCommand(cmd.id)}
                      disabled={!isConnected || isRunning}
                    >
                      <cmd.icon className="w-5 h-5" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{cmd.label}</div>
                        <div className="text-xs text-muted-foreground">{cmd.description}</div>
                      </div>
                      {currentCommand === cmd.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    </Button>
                  ))}
                  
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => runCommand('uninstall')}
                      disabled={!isConnected || isRunning}
                    >
                      <Trash2 className="w-4 h-4" />
                      Désinstaller la suite IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="flex-1 mt-4">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Informations système</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* GPU */}
                  {systemInfo?.gpu && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">GPU</span>
                      </div>
                      <p className="text-sm">{systemInfo.gpu.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {systemInfo.gpu.memoryFree} libre / {systemInfo.gpu.memoryTotal}
                      </p>
                      {systemInfo.gpu.temperature && (
                        <p className="text-xs text-muted-foreground">{systemInfo.gpu.temperature}°C</p>
                      )}
                    </div>
                  )}

                  {/* Disques */}
                  {systemInfo?.disks && systemInfo.disks.length > 0 && (
                    <div className="space-y-2">
                      {systemInfo.disks.filter(d => d.totalSize > 0).slice(0, 3).map((disk) => (
                        <div key={disk.drive} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <HardDrive className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm">{disk.drive}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatBytes(disk.freeSpace)} libre
                            </span>
                          </div>
                          <Progress 
                            value={((disk.totalSize - disk.freeSpace) / disk.totalSize) * 100} 
                            className="h-1.5"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vérifications rapides */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Vérifications</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SYSTEM_COMMANDS.map((cmd) => (
                        <Button
                          key={cmd.id}
                          variant="outline"
                          size="sm"
                          onClick={() => runCommand(cmd.id, false)}
                          disabled={!isConnected || isRunning}
                        >
                          {cmd.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Processus */}
                  {processes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Processus actifs</p>
                      <div className="space-y-1">
                        {processes.map((proc) => (
                          <div 
                            key={`${proc.name}-${proc.pid}`}
                            className="flex items-center justify-between text-xs p-2 rounded bg-muted/30"
                          >
                            <span className="font-mono">{proc.name}</span>
                            <span className="text-muted-foreground">{proc.memory}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Panneau droit: Terminal + Logs */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Terminal */}
          <AgentTerminal
            lines={terminalLines}
            onClear={clearTerminal}
            title={currentCommand ? `Exécution: ${currentCommand}` : 'Terminal'}
            isRunning={isRunning}
            className="flex-1 min-h-[300px]"
          />

          {/* Logs */}
          <Card className="flex-1 min-h-[200px] flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Fichiers Logs
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchLogFiles}>
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex gap-4 min-h-0">
              {/* Liste des fichiers */}
              <ScrollArea className="w-48 flex-shrink-0">
                <div className="space-y-1 pr-2">
                  {logFiles.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => loadLogFile(file.name)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors",
                        selectedLogName === file.name && "bg-muted"
                      )}
                    >
                      <div className="font-mono truncate">{file.name}</div>
                      <div className="text-muted-foreground">
                        {formatBytes(file.size)}
                      </div>
                    </button>
                  ))}
                  {logFiles.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">Aucun fichier log</p>
                  )}
                </div>
              </ScrollArea>

              {/* Contenu du log */}
              <div className="flex-1 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                {selectedLogContent ? (
                  <ScrollArea className="h-full">
                    <pre className="p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap">
                      {selectedLogContent}
                    </pre>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Sélectionnez un fichier log
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
