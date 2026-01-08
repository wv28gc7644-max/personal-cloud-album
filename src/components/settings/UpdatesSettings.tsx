import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  GitBranch, 
  History,
  RotateCcw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUpdateHistory, UpdateHistoryItem } from '@/hooks/useUpdateHistory';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function UpdatesSettings() {
  const [repoUrl, setRepoUrl] = useState(() => 
    localStorage.getItem('mediavault-github-repo') || ''
  );
  const [branch, setBranch] = useState(() => 
    localStorage.getItem('mediavault-github-branch') || 'main'
  );
  const [token, setToken] = useState(() => 
    localStorage.getItem('mediavault-github-token') || ''
  );
  const [updateCheckState, setUpdateCheckState] = useState<'idle' | 'checking' | 'available' | 'up-to-date' | 'error'>('idle');
  const [latestCommitInfo, setLatestCommitInfo] = useState<{ sha: string; message: string; date: string } | null>(null);
  const [changelog, setChangelog] = useState<Array<{ sha: string; message: string; date: string; author: string }>>([]);
  const [lastCheckDate, setLastCheckDate] = useState<string | null>(() => 
    localStorage.getItem('mediavault-last-update-check')
  );
  const [restoreTarget, setRestoreTarget] = useState<UpdateHistoryItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const { history: updateHistory, clearHistory: clearUpdateHistory } = useUpdateHistory();

  const currentVersion = localStorage.getItem('mediavault-local-version') || '';

  const saveRepoUrl = () => {
    localStorage.setItem('mediavault-github-repo', repoUrl);
    localStorage.setItem('mediavault-github-branch', branch);
    if (token) {
      localStorage.setItem('mediavault-github-token', token);
    }
    toast.success('Configuration GitHub sauvegardée');
  };

  const checkForUpdates = async () => {
    setUpdateCheckState('checking');
    setLatestCommitInfo(null);
    
    if (!repoUrl) {
      toast.error("URL du repository non configurée");
      setUpdateCheckState('error');
      return;
    }

    try {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        toast.error("URL GitHub invalide");
        setUpdateCheckState('error');
        return;
      }

      const [, owner, repo] = match;
      const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }
      
      let response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, { headers });
      
      if (!response.ok && response.status === 404 && branch === 'main') {
        response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/master`, { headers });
        if (response.ok) {
          localStorage.setItem('mediavault-github-branch', 'master');
          setBranch('master');
        }
      }
      
      if (!response.ok) {
        toast.error("Erreur de connexion à GitHub");
        setUpdateCheckState('error');
        return;
      }

      const data = await response.json();
      
      const commitInfo = {
        sha: data.sha.substring(0, 7),
        message: data.commit.message.split('\n')[0].substring(0, 60),
        date: new Date(data.commit.author.date).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      
      localStorage.setItem('mediavault-latest-full-sha', data.sha);
      setLatestCommitInfo(commitInfo);
      
      const checkDate = new Date().toISOString();
      localStorage.setItem('mediavault-last-update-check', checkDate);
      setLastCheckDate(checkDate);
      
      const localVersion = localStorage.getItem('mediavault-local-version');
      
      if (localVersion === data.sha) {
        setUpdateCheckState('up-to-date');
        setChangelog([]);
        toast.success("Vous êtes à jour !");
      } else {
        setUpdateCheckState('available');
        toast.info("Mise à jour disponible !");
        
        // Fetch changelog
        if (localVersion) {
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
              
              setChangelog(filteredCommits);
              localStorage.setItem('mediavault-changelog', JSON.stringify(filteredCommits));
            }
          } catch (changelogErr) {
            console.debug('Failed to fetch changelog:', changelogErr);
            setChangelog([]);
          }
        }
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      toast.error("Erreur de connexion");
      setUpdateCheckState('error');
    }
  };

  const markAsUpdated = () => {
    const fullSha = localStorage.getItem('mediavault-latest-full-sha');
    if (fullSha) {
      localStorage.setItem('mediavault-local-version', fullSha);
      setUpdateCheckState('up-to-date');
      setChangelog([]);
      localStorage.removeItem('mediavault-changelog');
      toast.success("Version marquée comme installée");
      window.dispatchEvent(new CustomEvent('mediavault-update-status-changed'));
    }
  };

  const getServerUrl = useCallback(() => {
    return localStorage.getItem('mediavault-server-url') || 'http://localhost:3001';
  }, []);

  const handleRestoreVersion = async (item: UpdateHistoryItem) => {
    setIsRestoring(true);
    const fullVersion = localStorage.getItem(`mediavault-version-sha-${item.fromVersion}`) || item.fromVersion;
    
    try {
      const response = await fetch(`${getServerUrl()}/api/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: fullVersion }),
      });
      
      if (response.ok) {
        toast.success('Restauration lancée');
        setTimeout(() => window.location.reload(), 10000);
      } else {
        toast.error('Erreur de restauration');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setIsRestoring(false);
      setRestoreTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Configuration GitHub */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Configuration GitHub
          </CardTitle>
          <CardDescription>Connectez votre repository pour les mises à jour</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">URL du repository</Label>
            <Input
              id="repo-url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branche</Label>
              <Input
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token (optionnel)</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
              />
            </div>
          </div>
          
          <Button onClick={saveRepoUrl} variant="secondary">
            Sauvegarder la configuration
          </Button>
        </CardContent>
      </Card>

      {/* Vérification des mises à jour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Mises à jour
          </CardTitle>
          <CardDescription>
            {currentVersion ? `Version actuelle: ${currentVersion.substring(0, 7)}` : 'Version non définie'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={checkForUpdates} 
              disabled={updateCheckState === 'checking'}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", updateCheckState === 'checking' && "animate-spin")} />
              Vérifier les mises à jour
            </Button>
            
            {updateCheckState === 'available' && (
              <Button onClick={markAsUpdated} variant="outline" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Marquer comme à jour
              </Button>
            )}
          </div>

          {/* Status */}
          {updateCheckState !== 'idle' && (
            <div className={cn(
              "p-3 rounded-lg border",
              updateCheckState === 'up-to-date' && "bg-green-500/10 border-green-500/30",
              updateCheckState === 'available' && "bg-yellow-500/10 border-yellow-500/30",
              updateCheckState === 'error' && "bg-destructive/10 border-destructive/30"
            )}>
              <div className="flex items-center gap-2">
                {updateCheckState === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
                {updateCheckState === 'up-to-date' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {updateCheckState === 'available' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                {updateCheckState === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
                
                <span className="font-medium">
                  {updateCheckState === 'checking' && 'Vérification en cours...'}
                  {updateCheckState === 'up-to-date' && 'Vous êtes à jour !'}
                  {updateCheckState === 'available' && 'Mise à jour disponible'}
                  {updateCheckState === 'error' && 'Erreur de vérification'}
                </span>
              </div>
              
              {latestCommitInfo && updateCheckState === 'available' && (
                <p className="text-sm text-muted-foreground mt-2">
                  {latestCommitInfo.sha}: {latestCommitInfo.message}
                </p>
              )}
            </div>
          )}

          {/* Changelog */}
          {changelog.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Changelog ({changelog.length} commits)</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {changelog.map((commit) => (
                  <div key={commit.sha} className="text-sm p-2 bg-muted/30 rounded flex items-start gap-2">
                    <code className="text-xs text-primary">{commit.sha}</code>
                    <span className="flex-1 text-muted-foreground">{commit.message}</span>
                    <span className="text-xs text-muted-foreground">{commit.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastCheckDate && (
            <p className="text-xs text-muted-foreground">
              Dernière vérification: {new Date(lastCheckDate).toLocaleString('fr-FR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historique des mises à jour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des mises à jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {updateHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucune mise à jour enregistrée</p>
          ) : (
            <div className="space-y-2">
              {updateHistory.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div>
                    <p className="text-sm font-medium">
                      {item.fromVersion?.substring(0, 7)} → {item.toVersion?.substring(0, 7)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => setRestoreTarget(item)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restaurer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restaurer cette version ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cela va restaurer la version {item.fromVersion?.substring(0, 7)}. 
                          L'application redémarrera automatiquement.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleRestoreVersion(item)}
                          disabled={isRestoring}
                        >
                          {isRestoring ? 'Restauration...' : 'Restaurer'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              
              {updateHistory.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearUpdateHistory}
                  className="w-full mt-2"
                >
                  Effacer l'historique
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
