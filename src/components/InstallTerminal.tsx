import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Terminal, 
  RefreshCw, 
  Pause, 
  Play, 
  Trash2, 
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FolderOpen
} from 'lucide-react';

interface InstallTerminalProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface LogLine {
  text: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'default';
}

export const InstallTerminal = ({ 
  autoRefresh = true, 
  refreshInterval = 2000 
}: InstallTerminalProps) => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logFile, setLogFile] = useState<string | null>(null);
  const [totalLines, setTotalLines] = useState(0);
  const [status, setStatus] = useState<string>('idle');
  const [serverConnected, setServerConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const parseLogLine = (line: string): LogLine => {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('[ok]') || lowerLine.includes('ok') || lowerLine.includes('terminee') || lowerLine.includes('success')) {
      return { text: line, type: 'success' };
    }
    if (lowerLine.includes('[x]') || lowerLine.includes('error') || lowerLine.includes('erreur') || lowerLine.includes('failed')) {
      return { text: line, type: 'error' };
    }
    if (lowerLine.includes('warn') || lowerLine.includes('attention') || lowerLine.includes('skip')) {
      return { text: line, type: 'warning' };
    }
    if (lowerLine.includes('installation') || lowerLine.includes('===') || lowerLine.includes('gpu')) {
      return { text: line, type: 'info' };
    }
    return { text: line, type: 'default' };
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/ai/install-logs?lines=100');
      if (response.ok) {
        const data = await response.json();
        setServerConnected(true);
        setStatus(data.status);
        setLogFile(data.file);
        setTotalLines(data.totalLines || 0);
        
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs.map(parseLogLine));
        }
      } else {
        setServerConnected(false);
      }
    } catch {
      setServerConnected(false);
      setStatus('server_offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(fetchLogs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isPaused, refreshInterval]);

  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const getLineClass = (type: LogLine['type']) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-cyan-400 font-semibold';
      default: return 'text-gray-300';
    }
  };

  const getStatusBadge = () => {
    if (!serverConnected) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Serveur hors ligne</Badge>;
    }
    switch (status) {
      case 'ok':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" /> En cours</Badge>;
      case 'no_logs':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" /> Pas de logs</Badge>;
      case 'no_dir':
        return <Badge variant="outline" className="gap-1"><AlertCircle className="w-3 h-3" /> Dossier absent</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Attente</Badge>;
    }
  };

  const exportLogs = () => {
    const content = logs.map(l => l.text).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `install-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openLogsFolder = () => {
    // Tentative d'ouverture via le serveur local (ne fonctionne que si le serveur a cette route)
    fetch('http://localhost:3001/api/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `${process.env.USERPROFILE || 'C:\\Users'}\\MediaVault-AI\\logs` })
    }).catch(() => {
      // Fallback: copier le chemin
      navigator.clipboard.writeText('C:\\Users\\' + (logFile ? logFile.split('\\')[0] : '') + '\\MediaVault-AI\\logs');
    });
  };

  return (
    <Card className="bg-gray-950 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <Terminal className="w-5 h-5 text-green-500" />
            Terminal d'installation
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>
        
        {logFile && (
          <p className="text-xs text-muted-foreground font-mono">
            📄 {logFile} ({totalLines} lignes)
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-800">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsPaused(!isPaused)}
            className="text-gray-400 hover:text-white"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={fetchLogs}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={exportLogs}
            className="text-gray-400 hover:text-white"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setLogs([])}
            className="text-gray-400 hover:text-white"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="flex-1" />
          <Button 
            size="sm" 
            variant="outline" 
            onClick={openLogsFolder}
            className="text-xs gap-1"
          >
            <FolderOpen className="w-3 h-3" />
            Ouvrir dossier
          </Button>
        </div>

        {/* Terminal Output */}
        <ScrollArea 
          className="h-[300px] rounded-md bg-black p-4 font-mono text-sm"
          ref={scrollRef}
        >
          {!serverConnected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
              <XCircle className="w-8 h-8" />
              <p>Serveur local non connecté</p>
              <p className="text-xs">Lancez server.cjs pour voir les logs</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
              <Terminal className="w-8 h-8" />
              <p>En attente des logs d'installation...</p>
              <p className="text-xs">Lancez install-ai-suite-auto.bat</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log, i) => (
                <div key={i} className={`${getLineClass(log.type)} leading-relaxed`}>
                  <span className="text-gray-600 mr-2 select-none">{String(i + 1).padStart(3, '0')}</span>
                  {log.text}
                </div>
              ))}
              {!isPaused && (
                <div className="text-green-500 animate-pulse">▊</div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer Status */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
          <span>
            {isPaused ? '⏸ Pause' : `🔄 Rafraîchissement: ${refreshInterval / 1000}s`}
          </span>
          <span>
            {logs.length} lignes affichées
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstallTerminal;
