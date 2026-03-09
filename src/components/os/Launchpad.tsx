import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { MacOSIcon, FinderIcon, LaunchpadIcon, TrashIcon } from './MacOSIcon';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface LaunchpadProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Launchpad = memo(({ isOpen, onClose }: LaunchpadProps) => {
  const { installedApps, openWindow } = useOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedApp, setDraggedApp] = useState<string | null>(null);

  const filteredApps = installedApps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAppClick = useCallback((appId: string) => {
    openWindow(appId);
    onClose();
  }, [openWindow, onClose]);

  const handleDragStart = useCallback((appId: string) => {
    setDraggedApp(appId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedApp(null);
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const renderAppIcon = (appId: string, iconName: string, size: number) => {
    if (appId === 'finder') {
      return <FinderIcon size={size} />;
    }
    if (appId === 'launchpad') {
      return <LaunchpadIcon size={size} />;
    }
    if (appId === 'trash') {
      return <TrashIcon isEmpty size={size} />;
    }
    return <MacOSIcon appId={appId} iconName={iconName} size={size} />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10000] flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackgroundClick}
          style={{
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
          }}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Search bar */}
          <motion.div 
            className="mt-16 mb-8"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-lg focus-visible:ring-white/30"
              />
            </div>
          </motion.div>

          {/* Apps grid */}
          <motion.div 
            className="flex-1 w-full max-w-5xl px-12 overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            <div className="grid grid-cols-7 gap-8 justify-items-center">
              {filteredApps.map((app, index) => (
                <motion.div
                  key={app.id}
                  className={cn(
                    'flex flex-col items-center gap-2 cursor-pointer select-none',
                    draggedApp === app.id && 'opacity-50'
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAppClick(app.id)}
                  draggable
                  onDragStart={() => handleDragStart(app.id)}
                  onDragEnd={handleDragEnd}
                >
                  {renderAppIcon(app.id, app.icon, 70)}
                  <span className="text-white text-sm font-medium text-center max-w-[80px] truncate">
                    {app.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Page dots (placeholder for multi-page) */}
          <motion.div 
            className="mb-8 flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-white/30" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
Launchpad.displayName = 'Launchpad';
