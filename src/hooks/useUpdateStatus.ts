import { useState, useEffect } from 'react';

export const useUpdateStatus = () => {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const checkUpdateStatus = () => {
      const localVersion = localStorage.getItem('mediavault-local-version');
      const latestVersion = localStorage.getItem('mediavault-latest-full-sha');
      
      // Update available if both exist and are different
      if (localVersion && latestVersion && localVersion !== latestVersion) {
        setHasUpdate(true);
      } else {
        setHasUpdate(false);
      }
    };

    // Check on mount
    checkUpdateStatus();

    // Listen for storage changes (when update check completes)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mediavault-latest-full-sha' || e.key === 'mediavault-local-version') {
        checkUpdateStatus();
      }
    };

    // Also listen for custom event when update is marked as installed
    const handleUpdateEvent = () => {
      checkUpdateStatus();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('mediavault-update-status-changed', handleUpdateEvent);
    
    // Poll every 5 seconds to catch same-tab changes
    const interval = setInterval(checkUpdateStatus, 5000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('mediavault-update-status-changed', handleUpdateEvent);
      clearInterval(interval);
    };
  }, []);

  return hasUpdate;
};
