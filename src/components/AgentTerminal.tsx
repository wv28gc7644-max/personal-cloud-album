import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Minimize2, Maximize2, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TerminalLine {
  id: string;
  type: 'stdout' | 'stderr' | 'info' | 'success' | 'error' | 'command';
  text: string;
  timestamp: Date;
}

interface AgentTerminalProps {
  lines: TerminalLine[];
  onClear?: () => void;
  title?: string;
  isRunning?: boolean;
  className?: string;
}

export function AgentTerminal({ 
  lines, 
  onClear, 
  title = 'Terminal', 
  isRunning = false,
  className 
}: AgentTerminalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'stderr':
      case 'error':
        return 'text-red-400';
      case 'success':
        return 'text-green-400';
      case 'info':
        return 'text-blue-400';
      case 'command':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  const exportLogs = () => {
    const content = lines.map(l => `[${l.timestamp.toISOString()}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700"
        >
          <Terminal className="w-4 h-4" />
          {title}
          {isRunning && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex flex-col",
        isMaximized ? "fixed inset-4 z-50" : "h-80",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-500" />
          <span className="text-sm font-mono text-zinc-300">{title}</span>
          {isRunning && (
            <span className="flex h-2 w-2 ml-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-white"
            onClick={exportLogs}
            title="Exporter les logs"
          >
            <Download className="w-3 h-3" />
          </Button>
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-white"
              onClick={onClear}
              title="Effacer"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-white"
            onClick={() => setIsMinimized(true)}
            title="Minimiser"
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-white"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restaurer" : "Maximiser"}
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
      >
        <AnimatePresence mode="popLayout">
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn("whitespace-pre-wrap break-all", getLineColor(line.type))}
            >
              {line.type === 'command' ? (
                <span>
                  <span className="text-green-500">❯</span> {line.text}
                </span>
              ) : (
                line.text
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isRunning && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="inline-block w-2 h-4 bg-green-500 ml-1"
          />
        )}
      </div>
    </motion.div>
  );
}
