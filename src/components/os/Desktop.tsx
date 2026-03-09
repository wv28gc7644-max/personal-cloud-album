import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { MacOSIcon, FinderIcon, LaunchpadIcon, TrashIcon } from './MacOSIcon';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

const DesktopIconItem = memo(({ 
  iconData 
}: { 
  iconData: { id: string; appId: string; x: number; y: number } 
}) => {
  const { getApp, openWindow, updateDesktopIconPosition, removeDesktopIcon, addToDock } = useOS();
  const app = getApp(iconData.appId);

  if (!app) return null;

  const handleDoubleClick = () => {
    openWindow(iconData.appId);
  };

  const handleRemoveFromDesktop = () => {
    removeDesktopIcon(iconData.id);
  };

  const handleAddToDock = () => {
    addToDock(iconData.appId);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-desktop-icon', JSON.stringify(iconData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const renderIcon = () => {
    if (iconData.appId === 'finder') return <FinderIcon size={56} />;
    if (iconData.appId === 'launchpad') return <LaunchpadIcon size={56} />;
    if (iconData.appId === 'trash') return <TrashIcon isEmpty size={56} />;
    return <MacOSIcon appId={iconData.appId} iconName={app.icon} size={56} />;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          className={cn(
            'absolute flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer',
            'hover:bg-white/10 transition-colors select-none',
            'w-20'
          )}
          style={{ left: iconData.x, top: iconData.y }}
          onDoubleClick={handleDoubleClick}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          drag
          dragMomentum={false}
          onDragEnd={(_, info) => {
            updateDesktopIconPosition(
              iconData.id,
              Math.max(0, iconData.x + info.offset.x),
              Math.max(28, iconData.y + info.offset.y)
            );
          }}
        >
          {renderIcon()}
          <span className="text-white text-xs text-center font-medium drop-shadow-lg line-clamp-2">
            {app.name}
          </span>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleDoubleClick}>
          Ouvrir
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddToDock}>
          Ajouter au Dock
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleRemoveFromDesktop} className="text-destructive">
          Retirer du Bureau
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
DesktopIconItem.displayName = 'DesktopIconItem';

export const Desktop = memo(() => {
  const { settings, addDesktopIcon } = useOS();

  // Handle dropping dock icons onto the desktop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dockAppId = e.dataTransfer.getData('application/x-dock-app');
    if (dockAppId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addDesktopIcon({
        id: `desktop-${dockAppId}-${Date.now()}`,
        appId: dockAppId,
        x: Math.max(0, x - 40),
        y: Math.max(28, y - 40),
      });
    }
  }, [addDesktopIcon]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div
      className="fixed inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${settings.wallpaper})`,
        paddingTop: 28, // menubar
        paddingBottom: 80, // dock space
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Desktop icons */}
      {settings.showDesktopIcons && settings.desktopIcons.map(icon => (
        <DesktopIconItem key={icon.id} iconData={icon} />
      ))}
    </div>
  );
});
Desktop.displayName = 'Desktop';
