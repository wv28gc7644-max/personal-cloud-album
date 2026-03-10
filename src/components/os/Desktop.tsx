import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { MacOSIcon } from './MacOSIcon';
import { IconEditor } from './IconEditor';
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
  const [showIconEditor, setShowIconEditor] = useState(false);
  const app = getApp(iconData.appId);

  if (!app) return null;

  const handleDoubleClick = () => {
    openWindow(iconData.appId);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            className={cn(
              'absolute flex flex-col items-center gap-[3px] p-[6px] rounded-lg cursor-pointer',
              'hover:bg-white/10 transition-colors select-none',
              'w-[76px]'
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
                Math.max(25, iconData.y + info.offset.y)
              );
            }}
          >
            <MacOSIcon appId={iconData.appId} size={56} />
            <span className="text-white text-[11px] text-center font-normal leading-tight line-clamp-2"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 0px 6px rgba(0,0,0,0.3)' }}
            >
              {app.name}
            </span>
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52" style={{
          background: 'rgba(40,40,47,0.85)',
          backdropFilter: 'blur(50px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.12)',
        }}>
          <ContextMenuItem onClick={handleDoubleClick}>Ouvrir</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setShowIconEditor(true)}>Changer l'icône…</ContextMenuItem>
          <ContextMenuItem onClick={() => addToDock(iconData.appId)}>Garder dans le Dock</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => removeDesktopIcon(iconData.id)} className="text-destructive">
            Retirer du Bureau
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <IconEditor
        appId={iconData.appId}
        appName={app.name}
        isOpen={showIconEditor}
        onClose={() => setShowIconEditor(false)}
      />
    </>
  );
});
DesktopIconItem.displayName = 'DesktopIconItem';

export const Desktop = memo(() => {
  const { settings, addDesktopIcon } = useOS();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dockAppId = e.dataTransfer.getData('application/x-dock-app');
    if (dockAppId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      addDesktopIcon({
        id: `desktop-${dockAppId}-${Date.now()}`,
        appId: dockAppId,
        x: Math.max(0, e.clientX - rect.left - 40),
        y: Math.max(25, e.clientY - rect.top - 40),
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
        paddingTop: 25,
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {settings.showDesktopIcons && settings.desktopIcons.map(icon => (
        <DesktopIconItem key={icon.id} iconData={icon} />
      ))}
    </div>
  );
});
Desktop.displayName = 'Desktop';
