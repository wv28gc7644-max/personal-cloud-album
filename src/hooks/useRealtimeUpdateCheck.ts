import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { playNotificationSound, getNotificationSoundPref } from '@/components/UpdateProgressModal';

interface CommitInfo {
  sha: string;
  message: string;
  date: string;
}

interface RealtimeUpdateCheckOptions {
  enabled: boolean;
  intervalSeconds: number;
  onUpdateDetected?: (info: CommitInfo, commitsBehind: number) => void;
}

export const useRealtimeUpdateCheck = ({
  enabled,
  intervalSeconds,
  onUpdateDetected,
}: RealtimeUpdateCheckOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = useCallback(async (silent = true): Promise<boolean> => {
    const repoUrl = localStorage.getItem('mediavault-github-repo');
    if (!repoUrl) return false;

    const branch = localStorage.getItem('mediavault-github-branch') || 'main';
    const token = localStorage.getItem('mediavault-github-token');
    const localVersion = localStorage.getItem('mediavault-local-version');
    
    if (!localVersion) return false;

    try {
      setIsChecking(true);
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) return false;

      const [, owner, repo] = match;

      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json'
      };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      let response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
        { headers }
      );

      // Fallback to master
      if (!response.ok && response.status === 404 && branch === 'main') {
        response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/commits/master`,
          { headers }
        );
        if (response.ok) {
          localStorage.setItem('mediavault-github-branch', 'master');
        }
      }

      if (!response.ok) return false;

      const data = await response.json();
      setLastCheck(new Date());

      // Check if update is available
      const existingLatest = localStorage.getItem('mediavault-latest-full-sha');
      const isNewUpdate = localVersion !== data.sha && existingLatest !== data.sha;
      
      if (isNewUpdate) {
        // Store the new version
        localStorage.setItem('mediavault-latest-full-sha', data.sha);
        
        // Fetch changelog
        let commitsBehind = 0;
        try {
          const commitsResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?sha=${data.sha}&per_page=30`,
            { headers }
          );
          
          if (commitsResponse.ok) {
            const commitsData = await commitsResponse.json();
            const filteredCommits: Array<{ sha: string; message: string; date: string; author: string }> = [];
            
            for (const commit of commitsData) {
              if (commit.sha === localVersion) break;
              filteredCommits.push({
                sha: commit.sha.substring(0, 7),
                message: commit.commit.message.split('\n')[0],
                date: new Date(commit.commit.author.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short'
                }),
                author: commit.commit.author.name
              });
            }
            
            commitsBehind = filteredCommits.length;
            localStorage.setItem('mediavault-changelog', JSON.stringify(filteredCommits));
          }
        } catch (e) {
          console.debug('Failed to fetch changelog:', e);
        }

        const commitInfo: CommitInfo = {
          sha: data.sha.substring(0, 7),
          message: data.commit.message.split('\n')[0].substring(0, 50),
          date: new Date(data.commit.author.date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long'
          })
        };

        // Play notification sound
        const soundPref = getNotificationSoundPref();
        playNotificationSound(soundPref);

        // Show system notification if enabled
        const showSystemNotif = localStorage.getItem('mediavault-show-system-notifications') !== 'false';
        if (showSystemNotif && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Mise à jour MediaVault disponible', {
              body: `${commitInfo.sha} • ${commitInfo.message}...`,
              icon: '/favicon.ico',
              tag: 'mediavault-update-available',
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }

        // Show toast
        toast.info('🎉 Nouvelle mise à jour disponible !', {
          description: `${commitInfo.sha} • ${commitInfo.message}...`,
          duration: 10000,
          action: {
            label: 'Voir',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('open-admin-updates'));
            }
          }
        });

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('mediavault-update-status-changed'));

        // Callback
        onUpdateDetected?.(commitInfo, commitsBehind);

        return true;
      }

      return false;
    } catch (error) {
      console.debug('Realtime update check failed:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [onUpdateDetected]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check after a short delay
    const initialTimeout = setTimeout(() => {
      checkForUpdates(true);
    }, 5000);

    // Set up interval
    intervalRef.current = setInterval(() => {
      checkForUpdates(true);
    }, intervalSeconds * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalSeconds, checkForUpdates]);

  return {
    lastCheck,
    isChecking,
    checkNow: () => checkForUpdates(false),
  };
};
