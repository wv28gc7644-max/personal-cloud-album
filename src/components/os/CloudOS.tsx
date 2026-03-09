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

  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.appearance === 'dark') {
      root.classList.add('dark');
    } else if (settings.appearance === 'light') {
      root.classList.remove('dark');
    } else {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [settings.appearance]);

  // Add SF Pro-like font
  useEffect(() => {
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
    document.body.style.fontSmoothing = 'antialiased';
    (document.body.style as any).WebkitFontSmoothing = 'antialiased';
    (document.body.style as any).MozOsxFontSmoothing = 'grayscale';
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-foreground select-none" style={{ cursor: 'default' }}>
      <Desktop />
      <MenuBar />
      <WindowManager />
      <Dock onOpenLaunchpad={() => setIsLaunchpadOpen(true)} />
      <Launchpad isOpen={isLaunchpadOpen} onClose={() => setIsLaunchpadOpen(false)} />
    </div>
  );
});
CloudOS.displayName = 'CloudOS';
