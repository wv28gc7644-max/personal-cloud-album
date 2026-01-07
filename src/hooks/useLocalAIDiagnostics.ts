import { useState, useCallback } from 'react';

export interface AIServiceStatus {
  id: string;
  name: string;
  url: string;
  port: number;
  status: 'online' | 'offline' | 'checking' | 'error';
  latency?: number;
  version?: string;
  error?: string;
  lastChecked?: Date;
  capabilities?: string[];
}

export interface DiagnosticLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  service: string;
  message: string;
  details?: string;
}

export interface SystemInfo {
  os: string;
  browser: string;
  gpu: string | null;
  memory: string | null;
  diskSpace: string | null;
}

export const AI_SERVICES: Omit<AIServiceStatus, 'status' | 'latency' | 'error' | 'lastChecked'>[] = [
  {
    id: 'ollama',
    name: 'Ollama (LLM)',
    url: 'http://localhost:11434',
    port: 11434,
    capabilities: ['Chat', 'Génération de texte', 'Embeddings']
  },
  {
    id: 'comfyui',
    name: 'ComfyUI (Images)',
    url: 'http://localhost:8188',
    port: 8188,
    capabilities: ['Génération d\'images', 'Inpainting', 'ControlNet', 'AnimateDiff']
  },
  {
    id: 'whisper',
    name: 'Whisper (STT)',
    url: 'http://localhost:9000',
    port: 9000,
    capabilities: ['Transcription audio', 'Détection de langue']
  },
  {
    id: 'xtts',
    name: 'XTTS (TTS)',
    url: 'http://localhost:8020',
    port: 8020,
    capabilities: ['Synthèse vocale', 'Clonage de voix']
  },
  {
    id: 'musicgen',
    name: 'MusicGen',
    url: 'http://localhost:8030',
    port: 8030,
    capabilities: ['Génération musicale']
  },
  {
    id: 'demucs',
    name: 'Demucs',
    url: 'http://localhost:8040',
    port: 8040,
    capabilities: ['Séparation de stems audio']
  },
  {
    id: 'clip',
    name: 'CLIP (Analyse)',
    url: 'http://localhost:8060',
    port: 8060,
    capabilities: ['Analyse d\'images', 'Recherche sémantique']
  },
  {
    id: 'esrgan',
    name: 'ESRGAN (Upscale)',
    url: 'http://localhost:8070',
    port: 8070,
    capabilities: ['Upscaling d\'images', 'Super-résolution']
  }
];

const HEALTH_ENDPOINTS: Record<string, string> = {
  ollama: '/api/tags',
  comfyui: '/system_stats',
  whisper: '/health',
  xtts: '/health',
  musicgen: '/health',
  demucs: '/health',
  clip: '/health',
  esrgan: '/health'
};

export function useLocalAIDiagnostics() {
  const [services, setServices] = useState<AIServiceStatus[]>(() =>
    AI_SERVICES.map(s => ({ ...s, status: 'offline' as const }))
  );
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  const addLog = useCallback((
    level: DiagnosticLog['level'],
    service: string,
    message: string,
    details?: string
  ) => {
    const log: DiagnosticLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
      level,
      service,
      message,
      details
    };
    setLogs(prev => [log, ...prev].slice(0, 500)); // Keep last 500 logs
    return log;
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', 'System', 'Logs effacés');
  }, [addLog]);

  const checkService = useCallback(async (service: AIServiceStatus): Promise<AIServiceStatus> => {
    const startTime = Date.now();
    const healthEndpoint = HEALTH_ENDPOINTS[service.id] || '/health';
    
    try {
      addLog('info', service.name, `Vérification de ${service.url}${healthEndpoint}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${service.url}${healthEndpoint}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        let version: string | undefined;
        try {
          const data = await response.json();
          version = data.version || data.commit || undefined;
        } catch {
          // Ignore JSON parse errors
        }
        
        addLog('success', service.name, `Service en ligne (${latency}ms)`, version ? `Version: ${version}` : undefined);
        
        return {
          ...service,
          status: 'online',
          latency,
          version,
          error: undefined,
          lastChecked: new Date()
        };
      } else {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        addLog('error', service.name, `Erreur de réponse`, errorMsg);
        
        return {
          ...service,
          status: 'error',
          latency,
          error: errorMsg,
          lastChecked: new Date()
        };
      }
    } catch (err) {
      const latency = Date.now() - startTime;
      let errorMsg: string;
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMsg = 'Timeout après 5 secondes';
        } else if (err.message.includes('Failed to fetch')) {
          errorMsg = 'Service non accessible (non démarré ou bloqué par CORS)';
        } else {
          errorMsg = err.message;
        }
      } else {
        errorMsg = 'Erreur inconnue';
      }
      
      addLog('error', service.name, `Service hors ligne`, errorMsg);
      
      return {
        ...service,
        status: 'offline',
        latency,
        error: errorMsg,
        lastChecked: new Date()
      };
    }
  }, [addLog]);

  const runFullDiagnostics = useCallback(async () => {
    setIsRunningDiagnostics(true);
    addLog('info', 'System', '═══ DÉBUT DU DIAGNOSTIC COMPLET ═══');
    
    // Collect system info
    const sysInfo: SystemInfo = {
      os: navigator.platform,
      browser: navigator.userAgent,
      gpu: null,
      memory: null,
      diskSpace: null
    };
    
    // Try to get GPU info
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          sysInfo.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch {
      // Ignore
    }
    
    // Try to get memory info
    if ('deviceMemory' in navigator) {
      sysInfo.memory = `${(navigator as any).deviceMemory} GB`;
    }
    
    setSystemInfo(sysInfo);
    addLog('info', 'System', `OS: ${sysInfo.os}`, sysInfo.gpu ? `GPU: ${sysInfo.gpu}` : undefined);
    
    // Check all services in parallel
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        setServices(prev => 
          prev.map(s => s.id === service.id ? { ...s, status: 'checking' } : s)
        );
        return checkService(service);
      })
    );
    
    setServices(updatedServices);
    
    // Summary
    const online = updatedServices.filter(s => s.status === 'online').length;
    const offline = updatedServices.filter(s => s.status === 'offline').length;
    const errors = updatedServices.filter(s => s.status === 'error').length;
    
    addLog(
      online === updatedServices.length ? 'success' : online > 0 ? 'warning' : 'error',
      'System',
      `═══ DIAGNOSTIC TERMINÉ ═══`,
      `${online}/${updatedServices.length} services en ligne | ${offline} hors ligne | ${errors} erreurs`
    );
    
    setIsRunningDiagnostics(false);
    return updatedServices;
  }, [services, checkService, addLog]);

  const checkSingleService = useCallback(async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    setServices(prev => 
      prev.map(s => s.id === serviceId ? { ...s, status: 'checking' } : s)
    );
    
    const updated = await checkService(service);
    setServices(prev => 
      prev.map(s => s.id === serviceId ? updated : s)
    );
    
    return updated;
  }, [services, checkService]);

  const exportLogs = useCallback(() => {
    const logText = logs.map(log => {
      const time = log.timestamp.toISOString();
      const level = log.level.toUpperCase().padEnd(7);
      const service = log.service.padEnd(20);
      const details = log.details ? `\n    → ${log.details}` : '';
      return `[${time}] ${level} | ${service} | ${log.message}${details}`;
    }).join('\n');
    
    const systemInfoText = systemInfo ? `
═══════════════════════════════════════════════════════
INFORMATIONS SYSTÈME
═══════════════════════════════════════════════════════
OS: ${systemInfo.os}
GPU: ${systemInfo.gpu || 'Non détecté'}
Mémoire: ${systemInfo.memory || 'Non disponible'}
Navigateur: ${systemInfo.browser}
` : '';
    
    const servicesText = `
═══════════════════════════════════════════════════════
ÉTAT DES SERVICES
═══════════════════════════════════════════════════════
${services.map(s => {
  const status = s.status === 'online' ? '✓ EN LIGNE' : s.status === 'offline' ? '✗ HORS LIGNE' : '⚠ ERREUR';
  const latency = s.latency ? `(${s.latency}ms)` : '';
  const error = s.error ? `\n    Erreur: ${s.error}` : '';
  return `${status.padEnd(12)} | ${s.name.padEnd(25)} | ${s.url} ${latency}${error}`;
}).join('\n')}
`;
    
    const fullReport = `
═══════════════════════════════════════════════════════
RAPPORT DIAGNOSTIC MEDIAVAULT IA
Date: ${new Date().toISOString()}
═══════════════════════════════════════════════════════
${systemInfoText}
${servicesText}

═══════════════════════════════════════════════════════
LOGS DÉTAILLÉS
═══════════════════════════════════════════════════════
${logText}
`;
    
    return fullReport;
  }, [logs, services, systemInfo]);

  const downloadLogs = useCallback(() => {
    const report = exportLogs();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediavault-ai-diagnostic-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportLogs]);

  const copyLogsToClipboard = useCallback(async () => {
    const report = exportLogs();
    try {
      await navigator.clipboard.writeText(report);
      addLog('success', 'System', 'Logs copiés dans le presse-papiers');
      return true;
    } catch {
      addLog('error', 'System', 'Impossible de copier les logs');
      return false;
    }
  }, [exportLogs, addLog]);

  return {
    services,
    logs,
    systemInfo,
    isRunningDiagnostics,
    runFullDiagnostics,
    checkSingleService,
    addLog,
    clearLogs,
    exportLogs,
    downloadLogs,
    copyLogsToClipboard
  };
}
