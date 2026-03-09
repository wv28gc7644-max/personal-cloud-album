import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { MacOSIcon } from './MacOSIcon';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface LaunchpadProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Launchpad = memo(({ isOpen, onClose }: LaunchpadProps) => {
  const { installedApps, openWindow } = useOS();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = installedApps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    app.id !== 'launchpad' && app.id !== 'trash'
  );

  const handleAppClick = useCallback((appId: string) => {
    openWindow(appId);
    onClose();
    setSearchQuery('');
  }, [openWindow, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10000] flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => { if (e.target === e.currentTarget) { onClose(); setSearchQuery(''); } }}
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
          }}
        >
          {/* Search bar */}
          <motion.div 
            className="mt-[60px] mb-[40px]"
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-white/40" />
              <input
                autoFocus
                type="text"
                placeholder="Rechercher"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-[240px] pl-8 pr-3 py-[6px] rounded-lg text-[13px] text-white',
                  'placeholder:text-white/40 outline-none',
                )}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '0.5px solid rgba(255,255,255,0.15)',
                }}
              />
            </div>
          </motion.div>

          {/* Apps grid */}
          <motion.div 
            className="flex-1 w-full max-w-[900px] px-16 overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08 }}
          >
            <div className="grid grid-cols-7 gap-y-8 gap-x-6 justify-items-center">
              {filteredApps.map((app, index) => (
                <motion.button
                  key={app.id}
                  className="flex flex-col items-center gap-[6px] select-none group"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.015 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAppClick(app.id)}
                >
                  <MacOSIcon appId={app.id} size={72} />
                  <span className="text-white text-[12px] font-normal text-center max-w-[80px] truncate">
                    {app.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Page indicator dots */}
          <motion.div 
            className="mb-6 flex gap-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-[6px] h-[6px] rounded-full bg-white/80" />
            <div className="w-[6px] h-[6px] rounded-full bg-white/25" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
Launchpad.displayName = 'Launchpad';
