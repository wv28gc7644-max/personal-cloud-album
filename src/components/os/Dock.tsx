import { memo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { useTrash } from '@/hooks/useTrash';
import { MacOSIcon, TrashIcon } from './MacOSIcon';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface DockIconProps {
  appId: string;
  index: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  onOpenLaunchpad?: () => void;
}

const DockIcon = memo(({ 
  appId, 
  index,
  hoveredIndex,
  onHover,
  onOpenLaunchpad,
}: DockIconProps) => {
  const { getApp, openWindow, windows, settings, removeFromDock, addDesktopIcon } = useOS();
  const { isEmpty } = useTrash();
  const app = getApp(appId);

  if (!app) return null;

  const getMagnification = () => {
    if (!settings.dockMagnification || hoveredIndex === null) return 1;
    const distance = Math.abs(hoveredIndex - index);
    if (distance === 0) return 1.5;
    if (distance === 1) return 1.3;
    if (distance === 2) return 1.1;
    return 1;
  };

  const scale = getMagnification();
  const hasOpenWindow = windows.some(w => w.appId === appId && !w.isMinimized);
  const hasMinimizedWindow = windows.some(w => w.appId === appId && w.isMinimized);

  const handleClick = () => {
    if (appId === 'launchpad') {
      onOpenLaunchpad?.();
    } else {
      openWindow(appId);
    }
  };

  const handleAddToDesktop = () => {
    addDesktopIcon({
      id: `desktop-${appId}-${Date.now()}`,
      appId,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    });
  };

  const iconSize = settings.dockSize === 'small' ? 40 : settings.dockSize === 'large' ? 58 : 48;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.button
          className="relative flex flex-col items-center justify-end group"
          onClick={handleClick}
          onMouseEnter={() => onHover(index)}
          onMouseLeave={() => onHover(null)}
          animate={{ scale }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ originY: 1 }}
        >
          {/* Reflection effect */}
          <div className="relative">
            <MacOSIcon appId={appId} size={iconSize} />
            {/* Subtle glass reflection on bottom */}
            <div 
              className="absolute -bottom-1 left-1 right-1 h-[30%] opacity-20 pointer-events-none"
              style={{
                background: `linear-gradient(180deg, transparent, rgba(255,255,255,0.3))`,
                filter: 'blur(2px)',
                borderRadius: '0 0 22% 22%',
              }}
            />
          </div>

          {/* Active indicator dot */}
          {(hasOpenWindow || hasMinimizedWindow) && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'mt-[3px] w-[4px] h-[4px] rounded-full',
                hasOpenWindow ? 'bg-white/80' : 'bg-white/40'
              )}
            />
          )}
          {!hasOpenWindow && !hasMinimizedWindow && <div className="mt-[3px] h-[4px]" />}

          {/* Tooltip */}
          <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div 
              className="text-white text-[12px] px-3 py-1 rounded-[4px] whitespace-nowrap font-normal"
              style={{
                background: 'rgba(30,30,35,0.85)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.1)',
              }}
            >
              {app.name}
            </div>
          </div>
        </motion.button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52" style={{
        background: 'rgba(40,40,47,0.85)',
        backdropFilter: 'blur(50px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.12)',
      }}>
        <ContextMenuItem onClick={handleClick}>
          Ouvrir
        </ContextMenuItem>
        {hasOpenWindow && (
          <ContextMenuItem onClick={() => openWindow(appId)}>
            Nouvelle fenêtre
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddToDesktop}>
          Ajouter au Bureau
        </ContextMenuItem>
        {!app.isSystemApp && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => { const { removeFromDock } = useOS.getState(); removeFromDock(appId); }} className="text-destructive">
              Retirer du Dock
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});
DockIcon.displayName = 'DockIcon';

const DockSeparator = memo(() => (
  <div className="w-[1px] h-8 bg-white/15 mx-[2px]" />
));
DockSeparator.displayName = 'DockSeparator';

interface DockProps {
  onOpenLaunchpad: () => void;
}

export const Dock = memo(({ onOpenLaunchpad }: DockProps) => {
  const { settings, openWindow } = useOS();
  const { isEmpty } = useTrash();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const handleHover = useCallback((index: number | null) => {
    setHoveredIndex(index);
  }, []);

  const iconSize = settings.dockSize === 'small' ? 40 : settings.dockSize === 'large' ? 58 : 48;
  const regularApps = settings.dockApps.filter(id => id !== 'launchpad' && id !== 'trash');

  return (
    <div className={cn(
      'fixed z-[9999]',
      settings.dockPosition === 'bottom' && 'bottom-[3px] left-1/2 -translate-x-1/2',
      settings.dockPosition === 'left' && 'left-[3px] top-1/2 -translate-y-1/2',
      settings.dockPosition === 'right' && 'right-[3px] top-1/2 -translate-y-1/2'
    )}>
      <motion.div
        ref={dockRef}
        className={cn(
          'flex items-end rounded-[18px] px-[6px] py-[4px] gap-[2px]',
          settings.dockPosition !== 'bottom' && 'flex-col'
        )}
        style={{
          background: 'rgba(40,40,47,0.35)',
          backdropFilter: 'blur(50px) saturate(200%)',
          WebkitBackdropFilter: 'blur(50px) saturate(200%)',
          border: '0.5px solid rgba(255,255,255,0.15)',
          boxShadow: '0 12px 60px rgba(0,0,0,0.4), inset 0 0.5px 0 rgba(255,255,255,0.08)',
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Launchpad icon */}
        <DockIcon
          appId="launchpad"
          index={-2}
          hoveredIndex={hoveredIndex}
          onHover={handleHover}
          onOpenLaunchpad={onOpenLaunchpad}
        />
        
        <DockSeparator />

        {/* Regular apps */}
        {regularApps.map((appId, index) => (
          <DockIcon
            key={appId}
            appId={appId}
            index={index}
            hoveredIndex={hoveredIndex}
            onHover={handleHover}
            onOpenLaunchpad={onOpenLaunchpad}
          />
        ))}

        <DockSeparator />

        {/* Trash icon */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <motion.button
              className="relative flex flex-col items-center justify-end group"
              onClick={() => openWindow('trash')}
              onMouseEnter={() => handleHover(regularApps.length + 1)}
              onMouseLeave={() => handleHover(null)}
              animate={{ scale: settings.dockMagnification && hoveredIndex === regularApps.length + 1 ? 1.5 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{ originY: 1 }}
            >
              <TrashIcon isEmpty={isEmpty()} size={iconSize} />
              <div className="mt-[3px] h-[4px]" />
              <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div 
                  className="text-white text-[12px] px-3 py-1 rounded-[4px] whitespace-nowrap font-normal"
                  style={{
                    background: 'rgba(30,30,35,0.85)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.1)',
                  }}
                >
                  Corbeille
                </div>
              </div>
            </motion.button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48" style={{
            background: 'rgba(40,40,47,0.85)',
            backdropFilter: 'blur(50px) saturate(180%)',
            border: '0.5px solid rgba(255,255,255,0.12)',
          }}>
            <ContextMenuItem onClick={() => openWindow('trash')}>
              Ouvrir la Corbeille
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => useTrash.getState().emptyTrash()}
              disabled={isEmpty()}
              className="text-destructive"
            >
              Vider la Corbeille
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </motion.div>
    </div>
  );
});
Dock.displayName = 'Dock';
