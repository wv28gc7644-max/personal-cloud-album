import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

const DesktopIconItem = memo(({ 
  iconData 
}: { 
  iconData: { id: string; appId: string; x: number; y: number } 
}) => {
  const { getApp, openWindow, updateDesktopIconPosition } = useOS();
  const app = getApp(iconData.appId);

  if (!app) return null;

  const IconComponent = (LucideIcons as any)[app.icon] || LucideIcons.HelpCircle;

  const handleDoubleClick = () => {
    openWindow(iconData.appId);
  };

  return (
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
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
        <IconComponent className="w-8 h-8 text-white" />
      </div>
      <span className="text-white text-xs text-center font-medium drop-shadow-lg line-clamp-2">
        {app.name}
      </span>
    </motion.div>
  );
});
DesktopIconItem.displayName = 'DesktopIconItem';

export const Desktop = memo(() => {
  const { settings } = useOS();

  return (
    <div
      className="fixed inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${settings.wallpaper})`,
        paddingTop: 28, // menubar
        paddingBottom: 80, // dock space
      }}
    >
      {/* Desktop icons */}
      {settings.showDesktopIcons && settings.desktopIcons.map(icon => (
        <DesktopIconItem key={icon.id} iconData={icon} />
      ))}
    </div>
  );
});
Desktop.displayName = 'Desktop';
