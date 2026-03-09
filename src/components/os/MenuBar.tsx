import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Battery, Volume2, Search, Apple } from 'lucide-react';
import { useOS } from '@/hooks/useOS';
import { cn } from '@/lib/utils';

export const MenuBar = memo(() => {
  const { windows, activeWindowId, getApp } = useOS();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeWindow = windows.find(w => w.id === activeWindowId);
  const activeApp = activeWindow ? getApp(activeWindow.appId) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <motion.div
      className={cn(
        'fixed top-0 left-0 right-0 h-7 z-[10000]',
        'bg-[rgba(30,30,35,0.7)] backdrop-blur-2xl',
        'border-b border-white/5',
        'flex items-center justify-between px-4',
        'text-white/90 text-[13px] font-medium'
      )}
      initial={{ y: -28 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Left section - Apple menu + App name */}
      <div className="flex items-center gap-4">
        <button className="hover:bg-white/10 px-2 py-0.5 rounded transition-colors">
          <Apple className="w-4 h-4 fill-current" />
        </button>
        
        <span className="font-semibold">
          {activeApp?.name || 'Finder'}
        </span>

        <nav className="flex items-center gap-3 text-white/80">
          <button className="hover:text-white transition-colors">Fichier</button>
          <button className="hover:text-white transition-colors">Édition</button>
          <button className="hover:text-white transition-colors">Affichage</button>
          <button className="hover:text-white transition-colors">Fenêtre</button>
          <button className="hover:text-white transition-colors">Aide</button>
        </nav>
      </div>

      {/* Right section - Status icons */}
      <div className="flex items-center gap-3">
        <button className="hover:bg-white/10 p-1 rounded transition-colors">
          <Volume2 className="w-4 h-4" />
        </button>
        <button className="hover:bg-white/10 p-1 rounded transition-colors">
          <Wifi className="w-4 h-4" />
        </button>
        <button className="hover:bg-white/10 p-1 rounded transition-colors">
          <Battery className="w-4 h-4" />
        </button>
        <button className="hover:bg-white/10 p-1 rounded transition-colors">
          <Search className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-2 ml-2">
          <span>{formatDate(currentTime)}</span>
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </motion.div>
  );
});
MenuBar.displayName = 'MenuBar';
