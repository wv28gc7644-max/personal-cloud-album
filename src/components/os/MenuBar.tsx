import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, Battery, Volume2, Search, BatteryCharging, Bluetooth } from 'lucide-react';
import { useOS } from '@/hooks/useOS';
import { cn } from '@/lib/utils';
import finderIcon from '@/assets/icons/finder.png';

// Apple logo SVG inline
const AppleLogo = () => (
  <svg viewBox="0 0 170 170" className="w-[14px] h-[14px] fill-current">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.2-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.28 2.13-9.54 3.24-12.8 3.35-4.93.21-9.84-1.96-14.75-6.52-3.13-2.73-7.04-7.41-11.74-14.04-5.03-7.08-9.17-15.29-12.41-24.65-3.47-10.2-5.21-20.07-5.21-29.59 0-10.95 2.36-20.4 7.09-28.3 3.72-6.33 8.66-11.33 14.86-14.99 6.19-3.67 12.89-5.54 20.11-5.66 3.92 0 9.06 1.21 15.43 3.59 6.35 2.39 10.43 3.6 12.22 3.6 1.34 0 5.87-1.42 13.57-4.24 7.28-2.62 13.43-3.7 18.47-3.27 13.65 1.1 23.91 6.49 30.72 16.22-12.21 7.4-18.25 17.77-18.12 31.07.12 10.36 3.87 18.99 11.23 25.84 3.34 3.17 7.07 5.62 11.22 7.36-.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.12-2.96 15.7-8.87 22.7-7.15 8.38-15.79 13.22-25.17 12.46a25.3 25.3 0 01-.19-3.08c0-7.79 3.39-16.12 9.41-22.93 3.01-3.44 6.83-6.31 11.48-8.59 4.63-2.26 9.02-3.5 13.15-3.76.13 1.08.19 2.15.19 3.2z"/>
  </svg>
);

export const MenuBar = memo(() => {
  const { windows, activeWindowId, getApp } = useOS();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSpotlight, setShowSpotlight] = useState(false);

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

  // Battery level simulation
  const batteryLevel = 87;

  return (
    <>
      <motion.div
        className={cn(
          'fixed top-0 left-0 right-0 h-[25px] z-[10000]',
          'flex items-center justify-between px-3',
          'text-[13px] font-normal tracking-[-0.01em]',
          'text-white/90'
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(60,60,67,0.45) 0%, rgba(40,40,47,0.55) 100%)',
          backdropFilter: 'blur(50px) saturate(180%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%)',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}
        initial={{ y: -25 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Left section - Apple menu + App name + menus */}
        <div className="flex items-center h-full">
          <button className="hover:bg-white/10 px-[10px] h-full flex items-center transition-colors rounded-[3px]">
            <AppleLogo />
          </button>
          
          <span className="font-semibold px-[10px] h-full flex items-center">
            {activeApp?.name || 'Finder'}
          </span>

          <nav className="flex items-center h-full text-white/80">
            {['Fichier', 'Édition', 'Présentation', 'Aller', 'Fenêtre', 'Aide'].map(item => (
              <button 
                key={item}
                className="hover:bg-white/10 px-[8px] h-full flex items-center transition-colors text-[13px] rounded-[3px]"
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        {/* Right section - Status icons */}
        <div className="flex items-center h-full gap-[2px]">
          <button className="hover:bg-white/10 px-[6px] h-full flex items-center transition-colors rounded-[3px]">
            <Bluetooth className="w-[14px] h-[14px]" />
          </button>
          <button className="hover:bg-white/10 px-[6px] h-full flex items-center transition-colors rounded-[3px]">
            <Volume2 className="w-[15px] h-[15px]" />
          </button>
          <button className="hover:bg-white/10 px-[6px] h-full flex items-center transition-colors rounded-[3px]">
            <Wifi className="w-[15px] h-[15px]" />
          </button>
          <button className="hover:bg-white/10 px-[6px] h-full flex items-center gap-1 transition-colors rounded-[3px]">
            <Battery className="w-[18px] h-[11px]" />
            <span className="text-[11px]">{batteryLevel}%</span>
          </button>
          <button 
            className="hover:bg-white/10 px-[6px] h-full flex items-center transition-colors rounded-[3px]"
            onClick={() => setShowSpotlight(true)}
          >
            <Search className="w-[14px] h-[14px]" />
          </button>
          
          <div className="flex items-center gap-[6px] px-[8px] h-full hover:bg-white/10 transition-colors rounded-[3px] cursor-default">
            <span className="text-[13px]">{formatDate(currentTime)}</span>
            <span className="text-[13px]">{formatTime(currentTime)}</span>
          </div>
        </div>
      </motion.div>

      {/* Spotlight Search */}
      <AnimatePresence>
        {showSpotlight && (
          <motion.div
            className="fixed inset-0 z-[20000] flex items-start justify-center pt-[20vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSpotlight(false)}
          >
            <motion.div
              className="w-[680px] rounded-xl overflow-hidden"
              style={{
                background: 'rgba(30,30,35,0.75)',
                backdropFilter: 'blur(60px) saturate(200%)',
                WebkitBackdropFilter: 'blur(60px) saturate(200%)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <Search className="w-5 h-5 text-white/50" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Recherche Spotlight"
                  className="flex-1 bg-transparent text-lg text-white placeholder:text-white/40 outline-none"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
MenuBar.displayName = 'MenuBar';
