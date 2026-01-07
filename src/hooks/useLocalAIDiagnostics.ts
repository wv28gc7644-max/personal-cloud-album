import { useState, useCallback } from 'react';

export interface AIServiceStatus {
  id: string;
  name: string;
  url: string;
  port: number;
  status: 'online' | 'offline' | 'checking' | 'error' | 'not_installed';
  latency?: number;
  version?: string;
  error?: string;
  lastChecked?: Date;
  capabilities?: string[];
  installPath?: string;
  isInstalled?: boolean;
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
  gpuType: 'nvidia' | 'intel-arc' | 'amd' | 'unknown' | null;
  memory: string | null;
  diskSpace: string | null;
  installDir: string;
}

export interface InstallationStatus {
  isComplete: boolean;
  servicesInstalled: string[];
  servicesMissing: string[];
  installDir: string;
}

export const AI_SERVICES: Omit<AIServiceStatus, 'status' | 'latency' | 'error' | 'lastChecked' | 'isInstalled'>[] = [
  {
    id: 'ollama',
    name: 'Ollama (LLM)',
    url: 'http://localhost:11434',
    port: 11434,
    capabilities: ['Chat', 'Génération de texte', 'Embeddings'],
    installPath: '' // System-wide install
  },
  {
    id: 'comfyui',
    name: 'ComfyUI (Images)',
    url: 'http://localhost:8188',
    port: 8188,
    capabilities: ['Génération d\'images', 'Inpainting', 'ControlNet', 'AnimateDiff'],
    installPath: 'ComfyUI'
  },
  {
    id: 'whisper',
    name: 'Whisper (STT)',
    url: 'http://localhost:9000',
    port: 9000,
    capabilities: ['Transcription audio', 'Détection de langue'],
    installPath: 'whisper-api'
  },
  {
    id: 'xtts',
    name: 'XTTS (TTS)',
    url: 'http://localhost:8020',
    port: 8020,
    capabilities: ['Synthèse vocale', 'Clonage de voix'],
    installPath: 'xtts-api'
  },
  {
    id: 'musicgen',
    name: 'MusicGen',
    url: 'http://localhost:8030',
    port: 8030,
    capabilities: ['Génération musicale'],
    installPath: 'musicgen-api'
  },
  {
    id: 'demucs',
    name: 'Demucs',
    url: 'http://localhost:8040',
    port: 8040,
    capabilities: ['Séparation de stems audio'],
    installPath: 'demucs-api'
  },
  {
    id: 'clip',
    name: 'CLIP (Analyse)',
    url: 'http://localhost:8060',
    port: 8060,
    capabilities: ['Analyse d\'images', 'Recherche sémantique'],
    installPath: 'clip-api'
  },
  {
    id: 'esrgan',
    name: 'ESRGAN (Upscale)',
    url: 'http://localhost:8070',
    port: 8070,
    capabilities: ['Upscaling d\'images', 'Super-résolution'],
    installPath: 'esrgan-api'
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
    AI_SERVICES.map(s => ({ ...s, status: 'offline' as const, isInstalled: undefined }))
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
    setLogs(prev => [log, ...prev].slice(0, 500));
    return log;
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', 'System', 'Logs effacés');
  }, [addLog]);

  const detectGPUType = (gpuString: string | null): SystemInfo['gpuType'] => {
    if (!gpuString) return null;
    const lower = gpuString.toLowerCase();
    if (lower.includes('nvidia') || lower.includes('geforce') || lower.includes('rtx') || lower.includes('gtx')) {
      return 'nvidia';
    }
    if (lower.includes('intel') && (lower.includes('arc') || lower.includes('a770') || lower.includes('a750') || lower.includes('a380'))) {
      return 'intel-arc';
    }
    if (lower.includes('amd') || lower.includes('radeon')) {
      return 'amd';
    }
    return 'unknown';
  };

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
          lastChecked: new Date(),
          isInstalled: true
        };
      } else {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        addLog('error', service.name, `Erreur de réponse`, errorMsg);
        
        return {
          ...service,
          status: 'error',
          latency,
          error: errorMsg,
          lastChecked: new Date(),
          isInstalled: true
        };
      }
    } catch (err) {
      const latency = Date.now() - startTime;
      let errorMsg: string;
      let status: AIServiceStatus['status'] = 'offline';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMsg = 'Timeout après 5 secondes - Service peut être en cours de chargement';
        } else if (err.message.includes('Failed to fetch')) {
          // Could be CORS or not running
          errorMsg = 'Service non démarré ou bloqué par CORS';
        } else {
          errorMsg = err.message;
        }
      } else {
        errorMsg = 'Erreur inconnue';
      }
      
      addLog('error', service.name, `Service hors ligne`, errorMsg);
      
      return {
        ...service,
        status,
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
      gpuType: null,
      memory: null,
      diskSpace: null,
      installDir: '%USERPROFILE%\\MediaVault-AI'
    };
    
    // Try to get GPU info
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          sysInfo.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          sysInfo.gpuType = detectGPUType(sysInfo.gpu);
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
    
    const gpuInfo = sysInfo.gpu ? `GPU: ${sysInfo.gpu}` : undefined;
    const gpuTypeMsg = sysInfo.gpuType === 'intel-arc' 
      ? '(Intel Arc détecté - Support OpenVINO/OneAPI disponible)'
      : sysInfo.gpuType === 'nvidia' 
        ? '(NVIDIA détecté - Support CUDA disponible)'
        : undefined;
    
    addLog('info', 'System', `OS: ${sysInfo.os}`, [gpuInfo, gpuTypeMsg].filter(Boolean).join(' | '));
    
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
    
    // Provide recommendations
    if (offline > 0) {
      const offlineServices = updatedServices.filter(s => s.status === 'offline').map(s => s.name).join(', ');
      addLog('warning', 'System', `Services hors ligne: ${offlineServices}`, 
        'Vérifiez que les services sont installés et démarrés avec start-ai-services.bat');
    }
    
    if (sysInfo.gpuType === 'intel-arc') {
      addLog('info', 'System', 'Intel Arc GPU détecté', 
        'Utilisez le script d\'installation avec support Intel OneAPI pour de meilleures performances');
    }
    
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
Type GPU: ${systemInfo.gpuType || 'Non détecté'}
Mémoire: ${systemInfo.memory || 'Non disponible'}
Navigateur: ${systemInfo.browser}
Dossier d'installation: ${systemInfo.installDir}
` : '';
    
    const servicesText = `
═══════════════════════════════════════════════════════
ÉTAT DES SERVICES
═══════════════════════════════════════════════════════
${services.map(s => {
  const status = s.status === 'online' ? '✓ EN LIGNE' : 
                 s.status === 'offline' ? '✗ HORS LIGNE' : 
                 s.status === 'not_installed' ? '⊘ NON INSTALLÉ' : '⚠ ERREUR';
  const latency = s.latency ? `(${s.latency}ms)` : '';
  const error = s.error ? `\n    Erreur: ${s.error}` : '';
  const path = s.installPath ? `\n    Chemin: ${systemInfo?.installDir || '%USERPROFILE%\\MediaVault-AI'}\\${s.installPath}` : '';
  return `${status.padEnd(15)} | ${s.name.padEnd(25)} | ${s.url} ${latency}${error}${path}`;
}).join('\n')}
`;

    const recommendationsText = `
═══════════════════════════════════════════════════════
RECOMMANDATIONS
═══════════════════════════════════════════════════════
${services.filter(s => s.status === 'offline').length > 0 ? `
• ${services.filter(s => s.status === 'offline').length} services hors ligne - Exécutez start-ai-services.bat
` : ''}${systemInfo?.gpuType === 'intel-arc' ? `
• Intel Arc GPU détecté - Utilisez le script d'installation avec support Intel OneAPI
` : ''}${systemInfo?.gpuType === 'nvidia' ? `
• NVIDIA GPU détecté - Vérifiez que CUDA 12.1+ est installé
` : ''}
• Pour installer les services manquants, téléchargez install-ai-suite-complete.ps1
• Pour un support technique, partagez ce rapport complet
`;
    
    const fullReport = `
═══════════════════════════════════════════════════════
RAPPORT DIAGNOSTIC MEDIAVAULT IA
Date: ${new Date().toISOString()}
═══════════════════════════════════════════════════════
${systemInfoText}
${servicesText}
${recommendationsText}

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
