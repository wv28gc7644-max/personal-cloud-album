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
  Video,
  Search,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ServiceStatus {
  name: string;
  id: string;
  icon: React.ElementType;
  port: number;
  status: 'unknown' | 'checking' | 'online' | 'offline';
  latency?: number;
  version?: string;
  error?: string;
}

const SERVICES: ServiceStatus[] = [
  { name: 'Ollama', id: 'ollama', icon: Cpu, port: 11434, status: 'unknown' },
  { name: 'ComfyUI', id: 'comfyui', icon: Image, port: 8188, status: 'unknown' },
  { name: 'Whisper', id: 'whisper', icon: Mic, port: 9000, status: 'unknown' },
  { name: 'XTTS', id: 'xtts', icon: Music, port: 8020, status: 'unknown' },
  { name: 'MusicGen', id: 'musicgen', icon: Music, port: 8030, status: 'unknown' },
  { name: 'Demucs', id: 'demucs', icon: Music, port: 8040, status: 'unknown' },
  { name: 'CLIP', id: 'clip', icon: Search, port: 8060, status: 'unknown' },
  { name: 'ESRGAN', id: 'esrgan', icon: Zap, port: 8070, status: 'unknown' },
];

export function AIServiceDiagnostics() {
  const [services, setServices] = useState<ServiceStatus[]>(SERVICES);
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState(0);

  const testService = useCallback(async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      let endpoint = '/health';
      if (service.id === 'ollama') endpoint = '/api/tags';
      if (service.id === 'comfyui') endpoint = '/system_stats';
      
      const response = await fetch(`http://localhost:${service.port}${endpoint}`, {
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
        
        return { ...service, status: 'online', latency, version, error: undefined };
      } else {
        return { ...service, status: 'offline', latency, error: `HTTP ${response.status}` };
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      let errorMsg = 'Connexion refusée';
      
      if (error.name === 'AbortError') {
        errorMsg = 'Timeout (5s)';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      return { ...service, status: 'offline', latency, error: errorMsg };
    }
  }, []);

  const testAllServices = useCallback(async () => {
    setIsTesting(true);
    setProgress(0);
    
    // Mark all as checking
    setServices(prev => prev.map(s => ({ ...s, status: 'checking' as const })));
    
    const results: ServiceStatus[] = [];
    
    for (let i = 0; i < services.length; i++) {
      const result = await testService(services[i]);
      results.push(result);
      setProgress(((i + 1) / services.length) * 100);
      setServices(prev => prev.map(s => s.id === result.id ? result : s));
    }
    
    const online = results.filter(s => s.status === 'online').length;
    const offline = results.filter(s => s.status === 'offline').length;
    
    if (online === results.length) {
      toast.success('Tous les services sont en ligne !');
    } else if (offline === results.length) {
      toast.error('Aucun service disponible');
    } else {
      toast.info(`${online}/${results.length} services en ligne`);
    }
    
    setIsTesting(false);
  }, [services, testService]);

  const testSingleService = useCallback(async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;
    
    setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'checking' as const } : s));
    const result = await testService(service);
    setServices(prev => prev.map(s => s.id === id ? result : s));
    
    if (result.status === 'online') {
      toast.success(`${service.name} est en ligne`);
    } else {
      toast.error(`${service.name} non disponible: ${result.error}`);
    }
  }, [services, testService]);

  const onlineCount = services.filter(s => s.status === 'online').length;
  const offlineCount = services.filter(s => s.status === 'offline').length;

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
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {onlineCount} en ligne
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <XCircle className="w-3 h-3 text-red-500" />
            {offlineCount} hors ligne
          </Badge>
          <Badge variant="outline" className="gap-1 ml-auto">
            <Server className="w-3 h-3" />
            {services.length} services
          </Badge>
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
                service.status === 'checking' && "bg-blue-500/5 border-blue-500/30",
                service.status === 'unknown' && "bg-muted/30 border-border"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                service.status === 'online' && "bg-green-500/20",
                service.status === 'offline' && "bg-red-500/20",
                service.status === 'checking' && "bg-blue-500/20",
                service.status === 'unknown' && "bg-muted"
              )}>
                <service.icon className={cn(
                  "w-5 h-5",
                  service.status === 'online' && "text-green-500",
                  service.status === 'offline' && "text-red-500",
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

        {/* Troubleshooting Tips */}
        {offlineCount > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
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
