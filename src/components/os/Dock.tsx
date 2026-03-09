import { memo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

const DockIcon = memo(({ 
  appId, 
  index,
  hoveredIndex,
  onHover 
}: { 
  appId: string;
  index: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}) => {
  const { getApp, openWindow, windows, settings } = useOS();
  const app = getApp(appId);

  if (!app) return null;

  // Get dynamic icon component
  const IconComponent = (LucideIcons as any)[app.icon] || LucideIcons.HelpCircle;
  
  // Calculate magnification
  const getMagnification = () => {
    if (!settings.dockMagnification || hoveredIndex === null) return 1;
    const distance = Math.abs(hoveredIndex - index);
    if (distance === 0) return 1.5;
    if (distance === 1) return 1.3;
    if (distance === 2) return 1.15;
    return 1;
  };

  const scale = getMagnification();
  const hasOpenWindow = windows.some(w => w.appId === appId && !w.isMinimized);
  const hasMinimizedWindow = windows.some(w => w.appId === appId && w.isMinimized);

  const handleClick = () => {
    openWindow(appId);
  };

  const iconSize = settings.dockSize === 'small' ? 40 : settings.dockSize === 'large' ? 60 : 50;

  return (
    <motion.button
      className="relative flex flex-col items-center justify-end p-1 group"
      onClick={handleClick}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      animate={{ scale }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ originY: 1 }}
    >
      {/* App icon */}
      <div
        className={cn(
          'rounded-xl flex items-center justify-center',
          'bg-gradient-to-br from-white/20 to-white/5',
          'backdrop-blur-sm border border-white/10',
          'shadow-lg shadow-black/20',
          'transition-shadow duration-200',
          'group-hover:shadow-xl group-hover:shadow-black/30'
        )}
        style={{ width: iconSize, height: iconSize }}
      >
        <IconComponent 
          className="text-white" 
          style={{ width: iconSize * 0.5, height: iconSize * 0.5 }} 
        />
      </div>

      {/* Active indicator dot */}
      {(hasOpenWindow || hasMinimizedWindow) && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'absolute -bottom-1 w-1 h-1 rounded-full',
            hasOpenWindow ? 'bg-white' : 'bg-white/50'
          )}
        />
      )}

      {/* Tooltip */}
      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-[rgba(30,30,35,0.95)] text-white text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg backdrop-blur-md">
          {app.name}
        </div>
      </div>
    </motion.button>
  );
});
DockIcon.displayName = 'DockIcon';

export const Dock = memo(() => {
  const { settings } = useOS();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const handleHover = useCallback((index: number | null) => {
    setHoveredIndex(index);
  }, []);

  const dockPadding = settings.dockSize === 'small' ? 'p-1' : settings.dockSize === 'large' ? 'p-3' : 'p-2';
  const dockGap = settings.dockSize === 'small' ? 'gap-1' : settings.dockSize === 'large' ? 'gap-3' : 'gap-2';

  return (
    <div className={cn(
      'fixed z-[9999]',
      settings.dockPosition === 'bottom' && 'bottom-2 left-1/2 -translate-x-1/2',
      settings.dockPosition === 'left' && 'left-2 top-1/2 -translate-y-1/2',
      settings.dockPosition === 'right' && 'right-2 top-1/2 -translate-y-1/2'
    )}>
      <motion.div
        ref={dockRef}
        className={cn(
          'flex items-end rounded-2xl',
          'bg-[rgba(30,30,35,0.6)] backdrop-blur-2xl',
          'border border-white/10',
          'shadow-[0_10px_50px_rgba(0,0,0,0.5)]',
          dockPadding,
          dockGap,
          settings.dockPosition !== 'bottom' && 'flex-col'
        )}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
      >
        {settings.dockApps.map((appId, index) => (
          <DockIcon
            key={appId}
            appId={appId}
            index={index}
            hoveredIndex={hoveredIndex}
            onHover={handleHover}
          />
        ))}
      </motion.div>
    </div>
  );
});
Dock.displayName = 'Dock';
