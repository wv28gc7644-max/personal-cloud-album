import { useState, useEffect } from 'react';

interface UpdateStatus {
  hasUpdate: boolean;
  commitsBehind: number;
}

export const useUpdateStatus = (): UpdateStatus => {
  const [status, setStatus] = useState<UpdateStatus>({ hasUpdate: false, commitsBehind: 0 });

  useEffect(() => {
    const checkUpdateStatus = () => {
      const localVersion = localStorage.getItem('mediavault-local-version');
      const latestVersion = localStorage.getItem('mediavault-latest-full-sha');
      const changelogData = localStorage.getItem('mediavault-changelog');
      
      // Update available if both exist and are different
      if (localVersion && latestVersion && localVersion !== latestVersion) {
        let commitsBehind = 0;
        try {
          if (changelogData) {
            const changelog = JSON.parse(changelogData);
            commitsBehind = Array.isArray(changelog) ? changelog.length : 0;
          }
        } catch (e) {
          commitsBehind = 0;
        }
        setStatus({ hasUpdate: true, commitsBehind });
      } else {
        setStatus({ hasUpdate: false, commitsBehind: 0 });
      }
    };

    // Check on mount
    checkUpdateStatus();

    // Listen for storage changes (when update check completes)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mediavault-latest-full-sha' || e.key === 'mediavault-local-version' || e.key === 'mediavault-changelog') {
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

  return status;
};
