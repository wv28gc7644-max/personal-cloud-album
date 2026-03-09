import { memo, useEffect } from 'react';
import { useOS } from '@/hooks/useOS';
import { OSWindowFrame } from '@/components/os/OSWindowFrame';
import { SystemPreferences } from '@/components/os/SystemPreferences';
import { AppStore } from '@/components/os/AppStore';
import Index from '@/pages/Index';

// Wraps the main MediaVault app to make it look like an OS app
const MediaVaultWrapper = memo(() => {
  return (
    <div className="w-full h-full relative" style={{ isolation: 'isolate' }}>
      <Index />
    </div>
  );
});
MediaVaultWrapper.displayName = 'MediaVaultWrapper';

const PlaceholderApp = memo(({ name }: { name: string }) => (
  <div className="w-full h-full flex items-center justify-center bg-background text-muted-foreground">
    <div className="text-center space-y-2">
      <h2 className="text-xl font-semibold">{name}</h2>
      <p className="text-sm">Cette application est en cours de développement.</p>
    </div>
  </div>
));
PlaceholderApp.displayName = 'PlaceholderApp';

export const WindowManager = memo(() => {
  const { windows } = useOS();

  // Sort windows by zIndex to render them in the correct order
  const sortedWindows = [...windows].sort((a, b) => a.zIndex - b.zIndex);

  const renderAppContent = (appId: string, componentName?: string) => {
    switch (componentName || appId) {
      case 'SystemPreferences':
      case 'settings':
        return <SystemPreferences />;
      case 'AppStore':
      case 'appstore':
        return <AppStore />;
      case 'MediaVault':
      case 'mediavault':
        return <MediaVaultWrapper />;
      default:
        // Use the window title or app id for the placeholder
        const win = windows.find(w => w.appId === appId);
        return <PlaceholderApp name={win?.title || appId} />;
    }
  };

  return (
    <>
      {sortedWindows.map(win => (
        <OSWindowFrame key={win.id} window={win}>
          {renderAppContent(win.appId)}
        </OSWindowFrame>
      ))}
    </>
  );
});
WindowManager.displayName = 'WindowManager';
