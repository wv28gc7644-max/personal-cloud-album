import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Terminal,
  Search,
  Trash2,
  Download,
  RefreshCw,
  Pause,
  Play,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

const SERVICES = [
  { id: 'all', name: 'Tous' },
  { id: 'ollama', name: 'Ollama' },
  { id: 'comfyui', name: 'ComfyUI' },
  { id: 'whisper', name: 'Whisper' },
  { id: 'xtts', name: 'XTTS' },
  { id: 'musicgen', name: 'MusicGen' },
  { id: 'demucs', name: 'Demucs' },
  { id: 'clip', name: 'CLIP' },
  { id: 'esrgan', name: 'ESRGAN' },
  { id: 'server', name: 'Serveur' }
];

const LEVELS = [
  { id: 'all', name: 'Tous', icon: Filter },
  { id: 'info', name: 'Info', icon: Info },
  { id: 'warn', name: 'Avertissement', icon: AlertTriangle },
  { id: 'error', name: 'Erreur', icon: AlertCircle }
];

export function AIServiceLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterService, setFilterService] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async () => {
    if (isPaused) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/ai/logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      // Server might not be running, add a local log
      setLogs(prev => {
        if (prev.some(l => l.message.includes('Serveur non disponible'))) return prev;
        return [...prev, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          level: 'warn',
          service: 'server',
          message: 'Serveur local non disponible - Démarrez server.cjs'
        }];
      });
    }
  }, [isPaused]);

  useEffect(() => {
    fetchLogs();
    pollingRef.current = setInterval(fetchLogs, 3000);
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchLogs]);

  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter(log => {
    if (filterService !== 'all' && log.service !== filterService) return false;
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const clearLogs = async () => {
    try {
      await fetch('http://localhost:3001/api/ai/logs', { method: 'DELETE' });
      setLogs([]);
    } catch {
      setLogs([]);
    }
  };

  const exportLogs = () => {
    const content = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.service}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediavault-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      default: return <Info className="w-3 h-3 text-blue-500" />;
    }
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-500/10';
      case 'warn': return 'text-yellow-400 bg-yellow-500/10';
      default: return 'text-blue-400 bg-blue-500/10';
    }
  };

  const getServiceColor = (service: string) => {
    const colors: Record<string, string> = {
      ollama: 'bg-purple-500/20 text-purple-400',
      comfyui: 'bg-green-500/20 text-green-400',
      whisper: 'bg-sky-500/20 text-sky-400',
      xtts: 'bg-orange-500/20 text-orange-400',
      musicgen: 'bg-pink-500/20 text-pink-400',
      demucs: 'bg-indigo-500/20 text-indigo-400',
      clip: 'bg-teal-500/20 text-teal-400',
      esrgan: 'bg-amber-500/20 text-amber-400',
      server: 'bg-slate-500/20 text-slate-400'
    };
    return colors[service] || 'bg-muted text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Logs des services IA
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Reprendre' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchLogs}
              disabled={isLoading}
              title="Rafraîchir"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={exportLogs}
              title="Exporter"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearLogs}
              title="Effacer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans les logs..."
              className="pl-9"
            />
          </div>
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICES.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex items-center gap-2">
                    <l.icon className="w-3 h-3" />
                    {l.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1">
            <Info className="w-3 h-3" />
            {logs.filter(l => l.level === 'info').length}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-yellow-600">
            <AlertTriangle className="w-3 h-3" />
            {logs.filter(l => l.level === 'warn').length}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-red-600">
            <AlertCircle className="w-3 h-3" />
            {logs.filter(l => l.level === 'error').length}
          </Badge>
          {isPaused && (
            <Badge variant="outline" className="ml-auto">
              En pause
            </Badge>
          )}
        </div>

        {/* Logs */}
        <ScrollArea className="h-[400px] rounded-lg border bg-muted/20" ref={scrollRef}>
          <div className="p-2 font-mono text-xs space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                <div className="text-center">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun log à afficher</p>
                  <p className="text-xs mt-1">Les logs apparaîtront ici quand les services IA seront actifs</p>
                </div>
              </div>
            ) : (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded",
                    getLevelClass(log.level)
                  )}
                >
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                  {getLevelIcon(log.level)}
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px] px-1 py-0", getServiceColor(log.service))}
                  >
                    {log.service}
                  </Badge>
                  <span className="flex-1 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
