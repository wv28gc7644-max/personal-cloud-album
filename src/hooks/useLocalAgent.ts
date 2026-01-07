import { useState, useCallback, useRef } from 'react';

interface CommandResult {
  command: string;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  timestamp: string;
}

interface LogFile {
  name: string;
  size: number;
  modified: string;
}

interface ProcessInfo {
  name: string;
  pid: number;
  memory: string;
}

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  cwd: string;
  mediaFolder: string;
  aiDir: string;
  gpu?: {
    name: string;
    memoryTotal: string;
    memoryFree: string;
    temperature: string;
  };
  disks?: {
    drive: string;
    freeSpace: number;
    totalSize: number;
  }[];
}

interface StreamLine {
  type: 'stdout' | 'stderr' | 'exit' | 'error' | 'info' | 'success';
  text?: string;
  code?: number;
  message?: string;
}

interface UseLocalAgentReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Commandes
  executeCommand: (command: string) => Promise<CommandResult | null>;
  streamCommand: (command: string, onLine: (line: StreamLine) => void) => () => void;
  availableCommands: string[];
  
  // Logs
  logFiles: LogFile[];
  fetchLogFiles: () => Promise<void>;
  readLogFile: (filename: string) => Promise<string | null>;
  
  // Système
  processes: ProcessInfo[];
  fetchProcesses: () => Promise<void>;
  systemInfo: SystemInfo | null;
  fetchSystemInfo: () => Promise<void>;
  
  // Connexion
  testConnection: () => Promise<boolean>;
}

export function useLocalAgent(): UseLocalAgentReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCommands, setAvailableCommands] = useState<string[]>([]);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const getServerUrl = useCallback(() => {
    return localStorage.getItem('localServerUrl') || 'http://localhost:3001';
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const url = getServerUrl();
      const response = await fetch(`${url}/api/agent/commands`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableCommands(data.commands || []);
        setIsConnected(true);
        setError(null);
        return true;
      }
      
      setIsConnected(false);
      return false;
    } catch (e) {
      setIsConnected(false);
      setError('Serveur local non accessible');
      return false;
    }
  }, [getServerUrl]);

  const executeCommand = useCallback(async (command: string): Promise<CommandResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = getServerUrl();
      const response = await fetch(`${url}/api/agent/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Erreur d\'exécution');
        return null;
      }
      
      return result as CommandResult;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getServerUrl]);

  const streamCommand = useCallback((command: string, onLine: (line: StreamLine) => void): () => void => {
    const url = getServerUrl();
    const eventSource = new EventSource(`${url}/api/agent/stream?command=${encodeURIComponent(command)}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StreamLine;
        onLine(data);
        
        if (data.type === 'exit' || data.type === 'error') {
          eventSource.close();
        }
      } catch (e) {
        console.error('Erreur parsing SSE:', e);
      }
    };
    
    eventSource.onerror = () => {
      onLine({ type: 'error', message: 'Connexion perdue' });
      eventSource.close();
    };
    
    // Retourner fonction de cleanup
    return () => eventSource.close();
  }, [getServerUrl]);

  const fetchLogFiles = useCallback(async (): Promise<void> => {
    try {
      const url = getServerUrl();
      const response = await fetch(`${url}/api/agent/logs-list`);
      
      if (response.ok) {
        const data = await response.json();
        setLogFiles(data.files || []);
      }
    } catch (e) {
      console.error('Erreur fetch logs:', e);
    }
  }, [getServerUrl]);

  const readLogFile = useCallback(async (filename: string): Promise<string | null> => {
    try {
      const url = getServerUrl();
      const response = await fetch(`${url}/api/agent/read-file?path=${encodeURIComponent(filename)}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.content;
      }
      
      return null;
    } catch (e) {
      console.error('Erreur lecture log:', e);
      return null;
    }
  }, [getServerUrl]);

  const fetchProcesses = useCallback(async (): Promise<void> => {
    try {
      const url = getServerUrl();
      const response = await fetch(`${url}/api/agent/processes`);
      
      if (response.ok) {
        const data = await response.json();
        setProcesses(data.processes || []);
      }
    } catch (e) {
      console.error('Erreur fetch processes:', e);
    }
  }, [getServerUrl]);

  const fetchSystemInfo = useCallback(async (): Promise<void> => {
    try {
      const url = getServerUrl();
      const response = await fetch(`${url}/api/agent/system-info`);
      
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      }
    } catch (e) {
      console.error('Erreur fetch system info:', e);
    }
  }, [getServerUrl]);

  return {
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
  };
}
