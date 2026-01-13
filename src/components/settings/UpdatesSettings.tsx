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
  AlertCircle,
  Terminal
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

const isHttpsContext = typeof window !== 'undefined' && window.location.protocol === 'https:';

function downloadTextFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

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

  const getServerUrl = useCallback(() => {
    return localStorage.getItem('mediavault-server-url') || 'http://localhost:3001';
  }, []);

  const downloadServerCjs = useCallback(() => {
    import('../../../server.cjs?raw').then(({ default: serverCjs }) => {
      downloadTextFile('server.cjs', serverCjs, 'application/javascript');
      toast.success('server.cjs téléchargé', {
        description: 'Placez-le dans le même dossier que vos .bat (ex: C:\\MediaVault\\)'
      });
    });
  }, []);

  const downloadStartBat = useCallback(() => {
    const bat = [
      '@echo off',
      'title MediaVault - Demarrage',
      'color 0A',
      '',
      'echo.',
      'echo  ============================================',
      'echo           MediaVault - Demarrage',
      'echo  ============================================',
      'echo.',
      '',
      ':: Verifier Node.js',
      'echo [1/3] Verification de Node.js...',
      'where node >nul 2>nul',
      'if %errorlevel% neq 0 (',
      '    echo [ERREUR] Node.js n\'est pas installe!',
      '    echo Telecharger depuis: https://nodejs.org/',
      '    pause',
      '    exit /b 1',
      ')',
      'echo       OK',
      '',
      ':: Aller au dossier du script',
      'echo [2/3] Navigation vers le dossier...',
      'cd /d "%~dp0"',
      'echo       Dossier: %CD%',
      '',
      ':: Lancer le serveur + ouvrir le navigateur',
      'echo [3/3] Demarrage du serveur...',
      'start "" "http://localhost:3001"',
      'node server.cjs',
      '',
      'pause'
    ].join('\r\n');

    downloadTextFile('Lancer MediaVault.bat', bat, 'application/x-bat');
    toast.success('Lancer MediaVault.bat téléchargé');
  }, []);

  const downloadUpdateBat = useCallback(() => {
    const bat = [
      '@echo off',
      'title MediaVault - Mise a jour',
      'color 0A',
      '',
      'echo ============================================',
      'echo        MediaVault - Mise a jour',
      'echo ============================================',
      'echo.',
      'echo Ce script doit etre dans le MEME DOSSIER que server.cjs',
      'echo.',
      '',
      ':: Aller au dossier du script (dossier du serveur local)',
      'cd /d "%~dp0"',
      '',
      ':: Securite: verifier git',
      'where git >nul 2>nul',
      'if %errorlevel% neq 0 (',
      '  echo [ERREUR] Git n\'est pas installe. Installez Git puis relancez.',
      '  echo https://git-scm.com/downloads',
      '  pause',
      '  exit /b 1',
      ')',
      '',
      ':: Mettre a jour le code',
      'echo [1/3] Mise a jour du code (git pull)...',
      'git pull',
      'if %errorlevel% neq 0 (',
      '  echo [ERREUR] git pull a echoue.',
      '  pause',
      '  exit /b 1',
      ')',
      '',
      ':: (Optionnel) installer deps si le projet contient package-lock',
      'if exist package.json (',
      '  echo [2/3] Installation des dependances...',
      '  where npm >nul 2>nul',
      '  if %errorlevel% neq 0 (',
      '    echo [ERREUR] npm introuvable (Node.js). Installez Node.js LTS.',
      '    pause',
      '    exit /b 1',
      '  )',
      '  npm ci',
      ') else (',
      '  echo [2/3] package.json non trouve: ok (mode serveur seul).',
      ')',
      '',
      'echo [3/3] Terminee. Redemarrez MediaVault si necessaire.',
      'echo.',
      'pause'
    ].join('\r\n');

    // IMPORTANT: le serveur local cherche EXACTEMENT ce nom
    downloadTextFile('Mettre a jour MediaVault.bat', bat, 'application/x-bat');
    toast.success('Script de mise à jour téléchargé', { description: 'Placez-le à côté de server.cjs' });
  }, []);

  const checkForUpdates = async () => {
    setUpdateCheckState('checking');
    setLatestCommitInfo(null);

    if (!repoUrl) {
      toast.error('URL du repository non configurée');
      setUpdateCheckState('error');
      return;
    }

    try {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        toast.error('URL GitHub invalide');
        setUpdateCheckState('error');
        return;
      }

      const [, owner, repo] = match;
      const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
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
        toast.error('Erreur de connexion à GitHub');
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
        toast.success('Vous êtes à jour !');
      } else {
        setUpdateCheckState('available');
        toast.info('Mise à jour disponible !');

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
      toast.error('Erreur de connexion');
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
      toast.success('Version marquée comme installée');
      window.dispatchEvent(new CustomEvent('mediavault-update-status-changed'));
    }
  };

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
      {/* IMPORTANT: si on est en preview HTTPS, on ne peut pas piloter le serveur local en HTTP */}
      {isHttpsContext && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Preview (HTTPS) : serveur local non pilotable
            </CardTitle>
            <CardDescription>
              Depuis la preview, le navigateur bloque les appels vers <code>http://localhost</code>. Pour démarrer / mettre à jour, ouvrez MediaVault en local.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2" onClick={() => window.open('http://localhost:3001', '_blank')}>
                <ExternalLink className="w-4 h-4" />
                Ouvrir http://localhost:3001
              </Button>
              <Button type="button" variant="secondary" className="gap-2" onClick={downloadStartBat}>
                <Download className="w-4 h-4" />
                Télécharger Lancer MediaVault.bat
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Si <code>http://localhost:3001</code> ne répond pas, c’est que le serveur n’est pas lancé sur votre PC.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Démarrage + scripts (toujours visibles) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Démarrer / Mettre à jour (scripts)
          </CardTitle>
          <CardDescription>
            Tout ce qu’il faut pour lancer le serveur local et avoir le bon script de mise à jour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={downloadServerCjs}>
              <Download className="w-4 h-4" />
              server.cjs
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={downloadStartBat}>
              <Download className="w-4 h-4" />
              Lancer MediaVault.bat
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={downloadUpdateBat}>
              <Download className="w-4 h-4" />
              Mettre a jour MediaVault.bat
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">Où mettre les fichiers :</p>
            <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
              <li>Créez <code>C:\\MediaVault\\</code></li>
              <li>Mettez dedans : <code>server.cjs</code>, <code>Lancer MediaVault.bat</code>, <code>Mettre a jour MediaVault.bat</code></li>
              <li>Double-cliquez <code>Lancer MediaVault.bat</code> → ça ouvre <code>http://localhost:3001</code></li>
              <li>Pour mettre à jour : double-cliquez <code>Mettre a jour MediaVault.bat</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>

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
              <RefreshCw className={cn('w-4 h-4', updateCheckState === 'checking' && 'animate-spin')} />
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
              'p-3 rounded-lg border',
              updateCheckState === 'up-to-date' && 'bg-green-500/10 border-green-500/30',
              updateCheckState === 'available' && 'bg-yellow-500/10 border-yellow-500/30',
              updateCheckState === 'error' && 'bg-destructive/10 border-destructive/30'
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
