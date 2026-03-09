import { memo, useEffect, useState, useCallback } from 'react';
import { Desktop } from '@/components/os/Desktop';
import { Dock } from '@/components/os/Dock';
import { MenuBar } from '@/components/os/MenuBar';
import { WindowManager } from '@/components/os/WindowManager';
import { Launchpad } from '@/components/os/Launchpad';
import { useOS } from '@/hooks/useOS';

export const CloudOS = memo(() => {
  const { settings } = useOS();
  const [isLaunchpadOpen, setIsLaunchpadOpen] = useState(false);

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

  const handleOpenLaunchpad = useCallback(() => {
    setIsLaunchpadOpen(true);
  }, []);

  const handleCloseLaunchpad = useCallback(() => {
    setIsLaunchpadOpen(false);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-foreground font-sans select-none">
      {/* Background & Desktop Icons */}
      <Desktop />
      
      {/* Top Menu Bar */}
      <MenuBar />
      
      {/* Draggable Windows */}
      <WindowManager />
      
      {/* Bottom Dock */}
      <Dock onOpenLaunchpad={handleOpenLaunchpad} />

      {/* Launchpad overlay */}
      <Launchpad isOpen={isLaunchpadOpen} onClose={handleCloseLaunchpad} />
    </div>
  );
});
CloudOS.displayName = 'CloudOS';
