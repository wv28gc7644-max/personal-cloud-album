import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Download, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  GitBranch,
  Clock,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  commitsBehind: number;
  changelog: string[];
  lastCheck: Date;
}

interface InAppUpdateProps {
  trigger?: React.ReactNode;
}

export function InAppUpdate({ trigger }: InAppUpdateProps) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serverUrl = localStorage.getItem('mediavault_server_url') || 'http://localhost:3001';

  const checkForUpdates = async () => {
    setChecking(true);
    setError(null);

    try {
      const repoUrl = localStorage.getItem('mediavault_github_repo') || '';
      const branch = localStorage.getItem('mediavault_github_branch') || 'main';

      if (!repoUrl) {
        setError('Aucun dépôt GitHub configuré. Allez dans Paramètres > Mises à jour.');
        return;
      }

      // Get current version from server
      const serverResponse = await fetch(`${serverUrl}/api/version`);
      const serverData = serverResponse.ok ? await serverResponse.json() : { version: 'Inconnue', commit: '' };

      // Get latest from GitHub
      const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        setError('URL du dépôt invalide');
        return;
      }

      const [, owner, repo] = repoMatch;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo.replace('.git', '')}/commits/${branch}`;
      
      const token = localStorage.getItem('mediavault_github_token') || '';
      const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
      if (token) headers.Authorization = `token ${token}`;

      const githubResponse = await fetch(apiUrl, { headers });
      if (!githubResponse.ok) {
        setError('Impossible de vérifier les mises à jour GitHub');
        return;
      }

      const latestCommit = await githubResponse.json();

      // Get commits list for changelog
      const commitsUrl = `https://api.github.com/repos/${owner}/${repo.replace('.git', '')}/commits?sha=${branch}&per_page=10`;
      const commitsResponse = await fetch(commitsUrl, { headers });
      const commits = commitsResponse.ok ? await commitsResponse.json() : [];

      const changelog = commits
        .slice(0, 5)
        .map((c: any) => c.commit.message.split('\n')[0]);

      const hasUpdate = serverData.commit !== latestCommit.sha;

      setUpdateInfo({
        hasUpdate,
        currentVersion: serverData.commit?.substring(0, 7) || 'Inconnue',
        latestVersion: latestCommit.sha.substring(0, 7),
        commitsBehind: hasUpdate ? commits.findIndex((c: any) => c.sha === serverData.commit) + 1 || commits.length : 0,
        changelog,
        lastCheck: new Date()
      });

    } catch (err) {
      setError('Erreur lors de la vérification des mises à jour');
    } finally {
      setChecking(false);
    }
  };

  const startUpdate = async () => {
    setUpdating(true);
    setProgress(0);

    try {
      // Call server update endpoint
      const response = await fetch(`${serverUrl}/api/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: localStorage.getItem('mediavault_github_repo'),
          branch: localStorage.getItem('mediavault_github_branch') || 'main'
        })
      });

      if (!response.ok) {
        throw new Error('Mise à jour échouée');
      }

      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${serverUrl}/api/update/status`);
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            if (status.complete) {
              clearInterval(interval);
              clearInterval(pollInterval);
              setProgress(100);
              toast.success('Mise à jour terminée ! Rechargement...');
              setTimeout(() => window.location.reload(), 2000);
            }
          }
        } catch {}
      }, 2000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(interval);
        clearInterval(pollInterval);
        if (progress < 100) {
          setError('La mise à jour prend trop de temps. Vérifiez la console du serveur.');
        }
      }, 300000);

    } catch (err) {
      setError('Erreur lors de la mise à jour');
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (open && !updateInfo) {
      checkForUpdates();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
          <Download className="w-4 h-4" />
          Mises à jour
        </Button>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 text-primary ${checking ? 'animate-spin' : ''}`} />
            Mises à jour
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Update info */}
          {updateInfo && !error && (
            <div className="space-y-4">
              {/* Version comparison */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Installée</p>
                  <p className="font-mono font-bold">{updateInfo.currentVersion}</p>
                </div>
                <GitBranch className="w-5 h-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Disponible</p>
                  <p className="font-mono font-bold text-primary">{updateInfo.latestVersion}</p>
                </div>
              </div>

              {/* Update status */}
              {updateInfo.hasUpdate ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-primary/10 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-5 h-5 text-primary" />
                    <span className="font-medium text-primary">
                      {updateInfo.commitsBehind} commit{updateInfo.commitsBehind > 1 ? 's' : ''} en retard
                    </span>
                  </div>
                  
                  {/* Changelog */}
                  {updateInfo.changelog.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Derniers changements
                      </p>
                      <ul className="text-sm space-y-1">
                        {updateInfo.changelog.map((msg, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span className="text-muted-foreground truncate">{msg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Vous êtes à jour !</span>
                </div>
              )}

              {/* Last check */}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Dernière vérification : {updateInfo.lastCheck.toLocaleTimeString('fr-FR')}
              </p>
            </div>
          )}

          {/* Update progress */}
          {updating && (
            <div className="space-y-3">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                {progress < 100 ? 'Mise à jour en cours...' : 'Redémarrage...'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={checkForUpdates}
            disabled={checking || updating}
            className="flex-1 gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            Vérifier
          </Button>
          {updateInfo?.hasUpdate && (
            <Button
              onClick={startUpdate}
              disabled={updating}
              className="flex-1 gap-2"
            >
              <Download className="w-4 h-4" />
              Installer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
