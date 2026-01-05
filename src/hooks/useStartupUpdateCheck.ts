import { useEffect } from 'react';
import { toast } from 'sonner';

interface CommitInfo {
  sha: string;
  message: string;
  date: string;
}

export const useStartupUpdateCheck = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      // Check if auto-check is disabled
      const autoCheckDisabled = localStorage.getItem('mediavault-disable-auto-update-check') === 'true';
      if (autoCheckDisabled) return;
      
      // Only check once per session
      const sessionChecked = sessionStorage.getItem('mediavault-update-checked');
      if (sessionChecked) return;
      
      sessionStorage.setItem('mediavault-update-checked', 'true');
      
      const repoUrl = localStorage.getItem('mediavault-github-repo');
      if (!repoUrl) return; // No repo configured, skip check
      
      const branch = localStorage.getItem('mediavault-github-branch') || 'main';
      const token = localStorage.getItem('mediavault-github-token');
      
      try {
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
        if (!match) return;
        
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
        
        // Fallback to master if main fails
        if (!response.ok && response.status === 404 && branch === 'main') {
          response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits/master`,
            { headers }
          );
          if (response.ok) {
            localStorage.setItem('mediavault-github-branch', 'master');
          }
        }
        
        if (!response.ok) return; // Silently fail on startup
        
        const data = await response.json();
        const localVersion = localStorage.getItem('mediavault-local-version');
        
        // Update available if versions don't match
        if (localVersion && localVersion !== data.sha) {
          const commitInfo: CommitInfo = {
            sha: data.sha.substring(0, 7),
            message: data.commit.message.split('\n')[0].substring(0, 50),
            date: new Date(data.commit.author.date).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long'
            })
          };
          
          // Store for later use
          localStorage.setItem('mediavault-latest-full-sha', data.sha);
          
          toast.info('Mise à jour disponible', {
            description: `${commitInfo.sha} • ${commitInfo.message}...`,
            duration: 8000,
            action: {
              label: 'Voir',
              onClick: () => {
                // Dispatch custom event to open admin panel on update tab
                window.dispatchEvent(new CustomEvent('open-admin-updates'));
              }
            }
          });
        }
      } catch (error) {
        // Silently fail on startup - don't bother user with errors
        console.debug('Update check failed:', error);
      }
    };
    
    // Delay check to not block initial render
    const timer = setTimeout(checkForUpdates, 2000);
    return () => clearTimeout(timer);
  }, []);
};
