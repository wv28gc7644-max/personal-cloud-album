import { memo, useEffect } from 'react';
import { Desktop } from '@/components/os/Desktop';
import { Dock } from '@/components/os/Dock';
import { MenuBar } from '@/components/os/MenuBar';
import { WindowManager } from '@/components/os/WindowManager';
import { useOS } from '@/hooks/useOS';

export const CloudOS = memo(() => {
  const { settings, openWindow, installedApps } = useOS();

  // Apply OS theme settings
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Handle appearance (light/dark/auto)
    if (settings.appearance === 'dark') {
      root.classList.add('dark');
    } else if (settings.appearance === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [settings.appearance]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-foreground font-sans select-none">
      {/* Background & Desktop Icons */}
      <Desktop />
      
      {/* Top Menu Bar */}
      <MenuBar />
      
      {/* Draggable Windows */}
      <WindowManager />
      
      {/* Bottom Dock */}
      <Dock />
    </div>
  );
});
CloudOS.displayName = 'CloudOS';
