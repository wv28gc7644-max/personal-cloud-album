import { memo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { useTrash } from '@/hooks/useTrash';
import { MacOSIcon, FinderIcon, LaunchpadIcon, TrashIcon } from './MacOSIcon';
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
    if (appId === 'launchpad') {
      onOpenLaunchpad?.();
    } else {
      openWindow(appId);
    }
  };

  const handleRemoveFromDock = () => {
    removeFromDock(appId);
  };

  const handleAddToDesktop = () => {
    const newIcon = {
      id: `desktop-${appId}-${Date.now()}`,
      appId,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };
    addDesktopIcon(newIcon);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-dock-app', appId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const iconSize = settings.dockSize === 'small' ? 40 : settings.dockSize === 'large' ? 60 : 50;

  // Render the appropriate icon
  const renderIcon = () => {
    if (appId === 'finder') {
      return <FinderIcon size={iconSize} />;
    }
    if (appId === 'launchpad') {
      return <LaunchpadIcon size={iconSize} />;
    }
    if (appId === 'trash') {
      return <TrashIcon isEmpty={isEmpty()} size={iconSize} />;
    }
    return <MacOSIcon appId={appId} iconName={app.icon} size={iconSize} />;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.button
          className="relative flex flex-col items-center justify-end p-1 group"
          onClick={handleClick}
          onMouseEnter={() => onHover(index)}
          onMouseLeave={() => onHover(null)}
          animate={{ scale }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ originY: 1 }}
          onDragStart={(e: any) => handleDragStart(e)}
        >
          {/* App icon */}
          {renderIcon()}

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
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
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
            <ContextMenuItem onClick={handleRemoveFromDock} className="text-destructive">
              Retirer du Dock
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});
DockIcon.displayName = 'DockIcon';

// Separator component
const DockSeparator = memo(() => (
  <div className="w-px h-8 bg-white/20 mx-1" />
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('application/x-dock-app');
    if (appId) {
      // Reordering logic could go here
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const dockPadding = settings.dockSize === 'small' ? 'p-1' : settings.dockSize === 'large' ? 'p-3' : 'p-2';
  const dockGap = settings.dockSize === 'small' ? 'gap-1' : settings.dockSize === 'large' ? 'gap-3' : 'gap-2';
  const iconSize = settings.dockSize === 'small' ? 40 : settings.dockSize === 'large' ? 60 : 50;

  // Regular apps (without launchpad and trash)
  const regularApps = settings.dockApps.filter(id => id !== 'launchpad' && id !== 'trash');

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
        onDrop={handleDrop}
        onDragOver={handleDragOver}
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
              className="relative flex flex-col items-center justify-end p-1 group"
              onClick={() => openWindow('trash')}
              onMouseEnter={() => handleHover(regularApps.length + 1)}
              onMouseLeave={() => handleHover(null)}
              animate={{ scale: settings.dockMagnification && hoveredIndex === regularApps.length + 1 ? 1.5 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{ originY: 1 }}
            >
              <TrashIcon isEmpty={isEmpty()} size={iconSize} />
              <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-[rgba(30,30,35,0.95)] text-white text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg backdrop-blur-md">
                  Corbeille
                </div>
              </div>
            </motion.button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={() => openWindow('trash')}>
              Ouvrir la Corbeille
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => {
                const { emptyTrash } = useTrash.getState();
                emptyTrash();
              }}
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
