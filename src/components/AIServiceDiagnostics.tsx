import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Clock,
  Cpu,
  Server,
  Mic,
  Music,
  Image,
  Search,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AI_SERVICE_CONFIGS, getPortModeLabel, getHealthEndpoint } from '@/config/aiServicePorts';

interface ServiceStatus {
  name: string;
  id: string;
  icon: React.ElementType;
  port: number;
  detectedPort?: number; // The port that actually responded
  portMode?: string | null; // 'Windows', 'Docker', or null
  status: 'unknown' | 'checking' | 'online' | 'offline' | 'blocked';
  latency?: number;
  version?: string;
  error?: string;
}

// Icon mapping for services
const SERVICE_ICONS: Record<string, React.ElementType> = {
  ollama: Cpu,
  comfyui: Image,
  whisper: Mic,
  xtts: Music,
  musicgen: Music,
  demucs: Music,
  clip: Search,
  esrgan: Zap
};

// Build initial services from config (use first port as default)
const SERVICES: ServiceStatus[] = AI_SERVICE_CONFIGS.map(config => ({
  name: config.name.split(' ')[0], // Short name
  id: config.id,
  icon: SERVICE_ICONS[config.id] || Server,
  port: config.ports[0],
  status: 'unknown' as const
}));

// Detect if we're in HTTPS context (mixed content will be blocked)
const isMixedContentBlocked = () => {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
};

// Get local server URL
const getServerUrl = (): string => {
  try {
    const settings = localStorage.getItem('mediavault-admin-settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.serverUrl || 'http://localhost:3001';
    }
  } catch {
    // ignore
  }
  return 'http://localhost:3001';
};

export function AIServiceDiagnostics() {
  const [services, setServices] = useState<ServiceStatus[]>(SERVICES);
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useProxy, setUseProxy] = useState(false);

  // Try to check via local server proxy first
  const checkViaProxy = useCallback(async (): Promise<Record<string, { ok: boolean; latencyMs?: number; error?: string; port?: number; url?: string }> | null> => {
    const serverUrl = getServerUrl();
    try {
      const response = await fetch(`${serverUrl}/api/ai/status`, { 
        signal: AbortSignal.timeout(8000) 
      });
      if (response.ok) {
        setUseProxy(true);
        return await response.json();
      }
    } catch {
      // Server not available
    }
    setUseProxy(false);
    return null;
  }, []);

  // Try multiple ports for a service until one responds
  const testServiceMultiPort = useCallback(async (service: ServiceStatus): Promise<ServiceStatus> => {
    const config = AI_SERVICE_CONFIGS.find(c => c.id === service.id);
    const candidatePorts = config?.ports || [service.port];
    const endpoint = getHealthEndpoint(service.id);
    const willBeBlocked = isMixedContentBlocked();

    for (const port of candidatePorts) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Shorter timeout per port
        
        const response = await fetch(`http://localhost:${port}${endpoint}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          let version = undefined;
          try {
            const data = await response.json();
            if (service.id === 'ollama' && data.models) {
              version = `${data.models.length} modèles`;
            }
            if (data.version) version = data.version;
          } catch {}
          
          const portMode = getPortModeLabel(service.id, port);
          return { 
            ...service, 
            status: 'online', 
            latency, 
            version, 
            error: undefined,
            port, // Update to the working port
            detectedPort: port,
            portMode
          };
        }
      } catch (error: any) {
        // If blocked by mixed content, mark and stop trying
        if (willBeBlocked && (error.message?.includes('Failed to fetch') || error.name === 'TypeError')) {
          return { 
            ...service, 
            status: 'blocked', 
            latency: Date.now() - startTime, 
            error: 'Bloqué (HTTPS)' 
          };
        }
        // Otherwise continue to next port
      }
    }

    // All ports failed
    return { 
      ...service, 
      status: 'offline', 
      error: `Aucun port actif (${candidatePorts.join('/')})` 
    };
  }, []);

  const testAllServices = useCallback(async () => {
    setIsTesting(true);
    setProgress(0);
    
    // Mark all as checking
    setServices(prev => prev.map(s => ({ ...s, status: 'checking' as const })));
    
    // Try proxy first (reliable)
    const proxyResults = await checkViaProxy();
    
    let results: ServiceStatus[];
    
    if (proxyResults) {
      // Use proxy results (includes detected port info)
      results = SERVICES.map(service => {
        const result = proxyResults[service.id];
        if (result) {
          const detectedPort = result.port || service.port;
          const portMode = getPortModeLabel(service.id, detectedPort);
          return {
            ...service,
            status: result.ok ? 'online' as const : 'offline' as const,
            latency: result.latencyMs,
            error: result.error,
            port: detectedPort,
            detectedPort: result.ok ? detectedPort : undefined,
            portMode: result.ok ? portMode : undefined
          };
        }
        return { ...service, status: 'offline' as const };
      });
      setServices(results);
      setProgress(100);
    } else {
      // Fallback to direct multi-port checks
      results = [];
      for (let i = 0; i < SERVICES.length; i++) {
        const result = await testServiceMultiPort(SERVICES[i]);
        results.push(result);
        setProgress(((i + 1) / SERVICES.length) * 100);
        setServices(prev => prev.map(s => s.id === result.id ? result : s));
      }
    }
    
    const online = results.filter(s => s.status === 'online').length;
    const offline = results.filter(s => s.status === 'offline').length;
    const blocked = results.filter(s => s.status === 'blocked').length;
    
    if (online === results.length) {
      toast.success('Tous les services sont en ligne !');
    } else if (blocked > 0) {
      toast.warning(`${blocked} services non vérifiables (ouvrez localhost:3001)`);
    } else if (offline === results.length) {
      toast.error('Aucun service disponible');
    } else {
      toast.info(`${online}/${results.length} services en ligne`);
    }
    
    setIsTesting(false);
  }, [testServiceMultiPort, checkViaProxy]);

  const testSingleService = useCallback(async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;
    
    setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'checking' as const } : s));
    const result = await testServiceMultiPort(service);
    setServices(prev => prev.map(s => s.id === id ? result : s));
    
    if (result.status === 'online') {
      const portInfo = result.portMode ? ` (${result.portMode})` : '';
      toast.success(`${service.name} en ligne sur :${result.port}${portInfo}`);
    } else if (result.status === 'blocked') {
      toast.warning(`${service.name}: vérification bloquée (HTTPS)`);
    } else {
      toast.error(`${service.name} non disponible: ${result.error}`);
    }
  }, [services, testServiceMultiPort]);

  const onlineCount = services.filter(s => s.status === 'online').length;
  const offlineCount = services.filter(s => s.status === 'offline').length;
  const blockedCount = services.filter(s => s.status === 'blocked').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Diagnostic des services IA
            </CardTitle>
            <CardDescription>
              Vérifiez la connectivité de tous vos services IA locaux
            </CardDescription>
          </div>
          <Button
            onClick={testAllServices}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Tester tous
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        {isTesting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Test en cours...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Summary */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {onlineCount} en ligne
          </Badge>
          {offlineCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="w-3 h-3 text-red-500" />
              {offlineCount} hors ligne
            </Badge>
          )}
          {blockedCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              {blockedCount} bloqués
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 ml-auto">
            <Server className="w-3 h-3" />
            {services.length} services
          </Badge>
          {useProxy && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle className="w-3 h-3" />
              via serveur local
            </Badge>
          )}
        </div>

        {/* Services Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                service.status === 'online' && "bg-green-500/5 border-green-500/30",
                service.status === 'offline' && "bg-red-500/5 border-red-500/30",
                service.status === 'blocked' && "bg-amber-500/5 border-amber-500/30",
                service.status === 'checking' && "bg-blue-500/5 border-blue-500/30",
                service.status === 'unknown' && "bg-muted/30 border-border"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                service.status === 'online' && "bg-green-500/20",
                service.status === 'offline' && "bg-red-500/20",
                service.status === 'blocked' && "bg-amber-500/20",
                service.status === 'checking' && "bg-blue-500/20",
                service.status === 'unknown' && "bg-muted"
              )}>
                <service.icon className={cn(
                  "w-5 h-5",
                  service.status === 'online' && "text-green-500",
                  service.status === 'offline' && "text-red-500",
                  service.status === 'blocked' && "text-amber-500",
                  service.status === 'checking' && "text-blue-500 animate-pulse",
                  service.status === 'unknown' && "text-muted-foreground"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{service.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1">
                    :{service.port}
                  </Badge>
                  {service.portMode && (
                    <Badge variant="secondary" className="text-[10px] px-1">
                      {service.portMode}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {service.status === 'checking' && 'Vérification...'}
                  {service.status === 'online' && (
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-green-600">
                        <Clock className="w-3 h-3" />
                        {service.latency}ms
                      </span>
                      {service.version && (
                        <span className="text-muted-foreground">{service.version}</span>
                      )}
                    </span>
                  )}
                  {service.status === 'offline' && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      {service.error}
                    </span>
                  )}
                  {service.status === 'blocked' && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-3 h-3" />
                      Bloqué (HTTPS → localhost)
                    </span>
                  )}
                  {service.status === 'unknown' && 'Non testé'}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => testSingleService(service.id)}
                disabled={service.status === 'checking'}
              >
                {service.status === 'checking' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Blocked services warning */}
        {blockedCount > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Diagnostic limité (contexte HTTPS)
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Les vérifications directes vers localhost sont bloquées par votre navigateur (mixed content).
            </p>
            <p className="text-sm font-medium">
              Pour un diagnostic fiable, lancez <code className="bg-muted px-1 rounded">node server.cjs</code> puis ouvrez{' '}
              <a href="http://localhost:3001" className="text-primary underline">http://localhost:3001</a>
            </p>
          </div>
        )}

        {/* Troubleshooting Tips */}
        {offlineCount > 0 && blockedCount === 0 && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Conseils de dépannage
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Vérifiez que les services sont démarrés (lancez start-ai-services.bat)</li>
              <li>• Assurez-vous qu'aucun pare-feu ne bloque les ports</li>
              <li>• Certains services nécessitent un GPU NVIDIA avec CUDA</li>
              <li>• Consultez README-LOCAL-AI.md pour l'installation</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
