import { useState, useEffect, useCallback } from 'react';
import { useMediaStore } from '@/hooks/useMediaStore';
import { useLocalServer } from '@/hooks/useLocalServer';
import { useAutoSync } from '@/hooks/useAutoSync';
import { Tag, TagColor } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagBadge } from './TagBadge';
import { UpdateProgressModal, NotificationSoundType, playNotificationSound } from './UpdateProgressModal';
import { 
  Tags, 
  Palette, 
  Settings, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Save,
  Server,
  Grid3X3,
  LayoutList,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Clock,
  Download,
  Package,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  GitBranch,
  Bell,
  Volume2,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TAG_COLORS: TagColor[] = ['yellow', 'blue', 'green', 'purple', 'orange', 'pink', 'gray'];

interface AdminSettings {
  gridColumns: number;
  cardStyle: 'twitter' | 'grid' | 'compact';
  theme: 'dark' | 'light' | 'system';
  autoPlay: boolean;
  showMetadata: boolean;
  localServerUrl: string;
}

export const AdminPanel = () => {
  const { tags, addTag, removeTag, playlists, removePlaylist } = useMediaStore();
  const { isConnected, isLoading, error, testConnection, loadFilesFromServer, filesCount } = useLocalServer();
  const { 
    isAutoSyncEnabled, 
    intervalSeconds, 
    lastSyncTime, 
    newFilesCount: autoSyncFilesCount,
    deletedFilesCount: autoSyncDeletedCount,
    isSyncing,
    enableAutoSync, 
    setIntervalSeconds,
    syncNow
  } = useAutoSync();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<TagColor>('blue');
  const [updateCheckState, setUpdateCheckState] = useState<'idle' | 'checking' | 'available' | 'up-to-date' | 'error'>('idle');
  const [latestCommitInfo, setLatestCommitInfo] = useState<{ sha: string; message: string; date: string } | null>(null);
  const [changelog, setChangelog] = useState<Array<{ sha: string; message: string; date: string; author: string }>>([]);
  const [lastCheckDate, setLastCheckDate] = useState<string | null>(() => 
    localStorage.getItem('mediavault-last-update-check')
  );
  const [activeTab, setActiveTab] = useState('tags');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notificationSound, setNotificationSound] = useState<NotificationSoundType>(() => 
    (localStorage.getItem('mediavault-notification-sound') as NotificationSoundType) || 'chime'
  );
  const [showSystemNotifications, setShowSystemNotifications] = useState(() => 
    localStorage.getItem('mediavault-show-system-notifications') !== 'false'
  );

  // Listen for open-admin-updates event from startup update check
  useEffect(() => {
    const handleOpenUpdates = () => {
      setActiveTab('update');
    };
    
    window.addEventListener('open-admin-updates', handleOpenUpdates);
    return () => window.removeEventListener('open-admin-updates', handleOpenUpdates);
  }, []);
  
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem('mediavault-admin-settings');
    return saved ? JSON.parse(saved) : {
      gridColumns: 3,
      cardStyle: 'twitter',
      theme: 'dark',
      autoPlay: false,
      showMetadata: true,
      localServerUrl: 'http://localhost:3001'
    };
  });

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      toast.error('Le nom du tag est requis');
      return;
    }

    const newTag: Tag = {
      id: crypto.randomUUID(),
      name: newTagName.trim(),
      color: newTagColor
    };

    addTag(newTag);
    setNewTagName('');
    toast.success(`Tag "${newTag.name}" créé`);
  };

  const handleDeleteTag = (tag: Tag) => {
    removeTag(tag.id);
    toast.success(`Tag "${tag.name}" supprimé`);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('mediavault-admin-settings', JSON.stringify(settings));
    toast.success('Paramètres sauvegardés');
  };

  const updateSetting = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getServerUrl = useCallback(() => {
    return settings.localServerUrl || 'http://localhost:3001';
  }, [settings.localServerUrl]);

  const triggerUpdateScript = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${getServerUrl()}/api/update`, {
        method: 'POST',
      });
      return response.ok;
    } catch (err) {
      return false;
    }
  }, [getServerUrl]);

  const handleNotificationSoundChange = (value: NotificationSoundType) => {
    setNotificationSound(value);
    localStorage.setItem('mediavault-notification-sound', value);
  };

  const handleSystemNotificationsChange = (checked: boolean) => {
    setShowSystemNotifications(checked);
    localStorage.setItem('mediavault-show-system-notifications', checked.toString());
  };

  // Get version info
  const currentVersion = localStorage.getItem('mediavault-local-version') || '';
  const newVersion = localStorage.getItem('mediavault-latest-full-sha') || '';
  const hasUpdate = currentVersion && newVersion && currentVersion !== newVersion;

  const checkForUpdates = async () => {
    setUpdateCheckState('checking');
    setLatestCommitInfo(null);
    
    // Get the GitHub repo URL from localStorage or prompt user
    const repoUrl = localStorage.getItem('mediavault-github-repo');
    const branch = localStorage.getItem('mediavault-github-branch') || 'main';
    
    if (!repoUrl) {
      toast.error("URL du repository non configurée", {
        description: "Entrez l'URL de votre repository GitHub ci-dessous"
      });
      setUpdateCheckState('error');
      return;
    }

    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        toast.error("URL GitHub invalide", {
          description: "Format attendu: https://github.com/user/repo"
        });
        setUpdateCheckState('error');
        return;
      }

      const [, owner, repo] = match;
      const token = localStorage.getItem('mediavault-github-token');
      
      // Prepare headers with optional auth token for private repos
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json'
      };
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }
      
      // Try the configured branch first, then fallback to master if main fails
      let response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, { headers });
      
      // If main fails, try master
      if (!response.ok && response.status === 404 && branch === 'main') {
        response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/master`, { headers });
        if (response.ok) {
          localStorage.setItem('mediavault-github-branch', 'master');
        }
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Repository introuvable", {
            description: token 
              ? "Vérifiez l'URL, la branche, et que le token a accès au repo" 
              : "Repo privé ? Ajoutez un Personal Access Token ci-dessous"
          });
        } else if (response.status === 401) {
          toast.error("Token invalide", {
            description: "Vérifiez que votre Personal Access Token est correct"
          });
        } else if (response.status === 403) {
          toast.error("Accès refusé", {
            description: token 
              ? "Le token n'a pas les permissions nécessaires (besoin de 'repo')"
              : "Limite d'API atteinte ou repo privé. Ajoutez un token"
          });
        } else {
          toast.error("Erreur GitHub", {
            description: `Statut: ${response.status}`
          });
        }
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
      
      // Store full SHA for later comparison
      localStorage.setItem('mediavault-latest-full-sha', data.sha);
      setLatestCommitInfo(commitInfo);
      
      // Store last check date
      const checkDate = new Date().toISOString();
      localStorage.setItem('mediavault-last-update-check', checkDate);
      setLastCheckDate(checkDate);
      
      // Check against local version (stored in localStorage)
      const localVersion = localStorage.getItem('mediavault-local-version');
      
      if (localVersion === data.sha) {
        setUpdateCheckState('up-to-date');
        setChangelog([]);
        toast.success("Vous êtes à jour !", {
          description: `Version: ${commitInfo.sha}`
        });
      } else {
        setUpdateCheckState('available');
        toast.info("Mise à jour disponible !", {
          description: commitInfo.message
        });
        
        // Fetch changelog (commits between local version and latest)
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
                // Stop when we reach the local version
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
              // Store changelog in localStorage for useUpdateStatus
              localStorage.setItem('mediavault-changelog', JSON.stringify(filteredCommits));
            }
          } catch (changelogErr) {
            console.debug('Failed to fetch changelog:', changelogErr);
            setChangelog([]);
            localStorage.removeItem('mediavault-changelog');
          }
        } else {
          setChangelog([]);
        }
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      toast.error("Erreur de connexion", {
        description: "Impossible de contacter GitHub"
      });
      setUpdateCheckState('error');
    }
  };

  const saveRepoUrl = (url: string) => {
    localStorage.setItem('mediavault-github-repo', url);
    toast.success("URL sauvegardée");
  };

  const markAsUpdated = () => {
    const fullSha = localStorage.getItem('mediavault-latest-full-sha');
    if (fullSha) {
      localStorage.setItem('mediavault-local-version', fullSha);
      setUpdateCheckState('up-to-date');
      setChangelog([]);
      localStorage.removeItem('mediavault-changelog');
      toast.success("Version marquée comme installée");
      // Notify sidebar to update its badge
      window.dispatchEvent(new CustomEvent('mediavault-update-status-changed'));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-1">Gérez les tags, playlists, et paramètres de votre MediaVault</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-muted/50">
            <TabsTrigger value="tags" className="gap-2">
              <Tags className="w-4 h-4" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="playlists" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Playlists
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Apparence
            </TabsTrigger>
            <TabsTrigger value="server" className="gap-2">
              <Server className="w-4 h-4" />
              Serveur
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Package className="w-4 h-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="update" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Mise à jour
            </TabsTrigger>
          </TabsList>

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Créer un tag</CardTitle>
                <CardDescription>Ajoutez des tags pour organiser vos médias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="tagName">Nom du tag</Label>
                    <Input
                      id="tagName"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Ex: Vacances 2024"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                  </div>
                  <div>
                    <Label>Couleur</Label>
                    <div className="flex gap-1 mt-2">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewTagColor(color)}
                          className={cn(
                            "w-6 h-6 rounded-full transition-all",
                            `bg-tag-${color}`,
                            newTagColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddTag} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags existants ({tags.length})</CardTitle>
                <CardDescription>Cliquez sur un tag pour le supprimer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <div key={tag.id} className="group relative">
                      <TagBadge tag={tag} />
                      <button
                        onClick={() => handleDeleteTag(tag)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Playlists Tab */}
          <TabsContent value="playlists" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Playlists ({playlists.length})</CardTitle>
                <CardDescription>Gérez vos collections de médias</CardDescription>
              </CardHeader>
              <CardContent>
                {playlists.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune playlist créée
                  </p>
                ) : (
                  <div className="space-y-2">
                    {playlists.map((playlist) => (
                      <div 
                        key={playlist.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{playlist.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {playlist.items.length} élément(s)
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon-sm"
                          onClick={() => {
                            removePlaylist(playlist.id);
                            toast.success(`Playlist "${playlist.name}" supprimée`);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Style d'affichage</CardTitle>
                <CardDescription>Personnalisez l'apparence de votre galerie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Style des cartes</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'twitter', label: 'Twitter', icon: LayoutList },
                      { value: 'grid', label: 'Grille', icon: Grid3X3 },
                      { value: 'compact', label: 'Compact', icon: Grid3X3 }
                    ].map((style) => (
                      <button
                        key={style.value}
                        onClick={() => updateSetting('cardStyle', style.value as AdminSettings['cardStyle'])}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                          settings.cardStyle === style.value 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <style.icon className="w-6 h-6" />
                        <span className="text-sm font-medium">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Colonnes de la grille: {settings.gridColumns}</Label>
                  <Slider
                    value={[settings.gridColumns]}
                    onValueChange={([value]) => updateSetting('gridColumns', value)}
                    min={1}
                    max={6}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Thème</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'dark', label: 'Sombre', icon: Moon },
                      { value: 'light', label: 'Clair', icon: Sun },
                      { value: 'system', label: 'Système', icon: Monitor }
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => updateSetting('theme', theme.value as AdminSettings['theme'])}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2",
                          settings.theme === theme.value 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <theme.icon className="w-4 h-4" />
                        <span className="text-sm">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lecture automatique</Label>
                    <p className="text-sm text-muted-foreground">Lire les vidéos automatiquement au survol</p>
                  </div>
                  <Switch
                    checked={settings.autoPlay}
                    onCheckedChange={(checked) => updateSetting('autoPlay', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Afficher les métadonnées</Label>
                    <p className="text-sm text-muted-foreground">Taille, date, type de fichier</p>
                  </div>
                  <Switch
                    checked={settings.showMetadata}
                    onCheckedChange={(checked) => updateSetting('showMetadata', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveSettings} className="w-full gap-2">
              <Save className="w-4 h-4" />
              Sauvegarder les paramètres
            </Button>
          </TabsContent>

          {/* Server Tab */}
          <TabsContent value="server" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Serveur local
                  {isConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>Connectez votre disque dur Windows pour charger automatiquement vos fichiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connection Status */}
                <div className={cn(
                  "p-4 rounded-lg border",
                  isConnected 
                    ? "bg-green-500/10 border-green-500/30" 
                    : "bg-muted/50 border-border"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {isConnected ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Serveur connecté
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                            Serveur non connecté
                          </>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isConnected 
                          ? `${filesCount} fichier(s) chargé(s)` 
                          : 'Lancez le serveur local et cliquez sur "Tester la connexion"'
                        }
                      </p>
                      {error && (
                        <p className="text-sm text-destructive mt-2">{error}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={testConnection}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span className="ml-2">Tester</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Load Files Button */}
                <Button 
                  onClick={loadFilesFromServer} 
                  disabled={isLoading}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Chargement en cours...
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-5 h-5" />
                      Charger les fichiers depuis le serveur
                    </>
                  )}
                </Button>

                {/* Auto-Sync Settings */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Synchronisation automatique
                    </CardTitle>
                    <CardDescription>
                      Détecte automatiquement les nouveaux fichiers sans cliquer
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Activer l'auto-sync</Label>
                        <p className="text-xs text-muted-foreground">
                          Vérifie périodiquement les nouveaux fichiers
                        </p>
                      </div>
                      <Switch
                        checked={isAutoSyncEnabled}
                        onCheckedChange={enableAutoSync}
                      />
                    </div>
                    
                    {isAutoSyncEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Intervalle: {intervalSeconds}s
                          </Label>
                          <Select 
                            value={intervalSeconds.toString()} 
                            onValueChange={(v) => setIntervalSeconds(parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">Toutes les 30 secondes</SelectItem>
                              <SelectItem value="60">Toutes les minutes</SelectItem>
                              <SelectItem value="120">Toutes les 2 minutes</SelectItem>
                              <SelectItem value="300">Toutes les 5 minutes</SelectItem>
                              <SelectItem value="600">Toutes les 10 minutes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Statut:</span>
                            <span className="flex items-center gap-1">
                              {isSyncing ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                  Synchronisation...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  Actif
                                </>
                              )}
                            </span>
                          </div>
                          {lastSyncTime && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Dernière sync:</span>
                              <span>{lastSyncTime.toLocaleTimeString()}</span>
                            </div>
                          )}
                          {autoSyncFilesCount > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Ajoutés:</span>
                              <span className="text-green-500 font-medium">+{autoSyncFilesCount}</span>
                            </div>
                          )}
                          {autoSyncDeletedCount > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Supprimés:</span>
                              <span className="text-red-500 font-medium">-{autoSyncDeletedCount}</span>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={syncNow}
                          disabled={isSyncing}
                          className="w-full"
                        >
                          {isSyncing ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Synchroniser maintenant
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Server URL Config */}
                <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
                  <Label htmlFor="serverUrl">URL du serveur local</Label>
                  <Input
                    id="serverUrl"
                    value={settings.localServerUrl}
                    onChange={(e) => updateSetting('localServerUrl', e.target.value)}
                    placeholder="http://localhost:3001"
                  />
                  <p className="text-xs text-muted-foreground">
                    Modifiez l'URL si vous utilisez un port différent
                  </p>
                </div>

                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-amber-400 mb-2">📁 Instructions pour démarrer le serveur</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Installez <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Node.js</a> sur votre PC Windows</li>
                      <li>Créez un dossier pour votre serveur (ex: <code className="bg-muted px-1 rounded">C:\MediaServer</code>)</li>
                      <li>Copiez le script ci-dessous dans un fichier <code className="bg-muted px-1 rounded">server.cjs</code></li>
                      <li>Modifiez <code className="bg-muted px-1 rounded">MEDIA_FOLDER</code> avec le chemin de vos médias</li>
                      <li>Ouvrez un terminal et exécutez: <code className="bg-muted px-1 rounded">node server.cjs</code></li>
                      <li>Revenez ici et cliquez sur "Charger les fichiers"</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Script serveur (server.cjs)
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(serverScript);
                          toast.success('Script copié dans le presse-papier');
                        }}
                      >
                        Copier
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-black/50 p-4 rounded-lg overflow-x-auto max-h-80">
{serverScript}
                    </pre>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveSettings} className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  Sauvegarder la configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 mt-6">
            
            {/* Introduction */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="w-6 h-6 text-primary" />
                  🏠 Self-Hosting Complet — Guide Débutant
                </CardTitle>
                <CardDescription className="text-base">
                  Suivez ces étapes pour héberger MediaVault 100% sur votre PC. 
                  <strong className="text-foreground"> Plus besoin de payer Lovable chaque mois</strong> — utilisez-le uniquement pour modifier votre site.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-2xl mb-1">💻</div>
                    <div className="text-sm font-medium text-blue-400">LOVABLE</div>
                    <div className="text-xs text-muted-foreground">Modifier le site</div>
                  </div>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="text-2xl mb-1">📦</div>
                    <div className="text-sm font-medium text-purple-400">GITHUB</div>
                    <div className="text-xs text-muted-foreground">Stocker le code</div>
                  </div>
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="text-2xl mb-1">🖥️</div>
                    <div className="text-sm font-medium text-green-400">VOTRE PC</div>
                    <div className="text-xs text-muted-foreground">Exécuter le site</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 1: LOVABLE - Connecter GitHub */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-blue-500/30">
              <CardHeader className="bg-blue-500/10 border-b border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">1</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">LOVABLE</span>
                      Connecter GitHub à Lovable
                    </CardTitle>
                    <CardDescription>Permet de récupérer le code sur votre PC</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 1.1 */}
                <div className="pl-4 border-l-2 border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">1.1</span>
                    <span className="font-medium">Dans Lovable, cliquez sur votre nom de projet (en haut à gauche)</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <div className="text-muted-foreground">Vous verrez un menu déroulant avec plusieurs options</div>
                  </div>
                </div>

                {/* Sous-étape 1.2 */}
                <div className="pl-4 border-l-2 border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">1.2</span>
                    <span className="font-medium">Cliquez sur "Settings" (Paramètres)</span>
                  </div>
                </div>

                {/* Sous-étape 1.3 */}
                <div className="pl-4 border-l-2 border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">1.3</span>
                    <span className="font-medium">Dans le menu de gauche, cliquez sur "GitHub"</span>
                  </div>
                </div>

                {/* Sous-étape 1.4 */}
                <div className="pl-4 border-l-2 border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">1.4</span>
                    <span className="font-medium">Cliquez sur le bouton "Connect to GitHub"</span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-sm">
                    <span className="text-amber-400 font-medium">⚠️ Si vous n'avez pas de compte GitHub :</span>
                    <p className="text-muted-foreground mt-1">Une fenêtre s'ouvrira. Cliquez sur "Create an account" (Créer un compte) sur GitHub.</p>
                  </div>
                </div>

                {/* Sous-étape 1.5 */}
                <div className="pl-4 border-l-2 border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">1.5</span>
                    <span className="font-medium">Autorisez Lovable à accéder à votre GitHub</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Cliquez sur "Authorize lovable-dev" dans la fenêtre GitHub</div>
                </div>

                {/* Sous-étape 1.6 */}
                <div className="pl-4 border-l-2 border-blue-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">1.6</span>
                    <span className="font-medium">Cliquez sur "Create Repository"</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Lovable va créer un dépôt (repository) sur votre GitHub avec tout le code du site</div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm"><strong>Résultat :</strong> Votre code est maintenant sur GitHub !</span>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 2: GITHUB - Télécharger le code */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-purple-500/30">
              <CardHeader className="bg-purple-500/10 border-b border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">2</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">GITHUB</span>
                      Télécharger le code sur votre PC
                    </CardTitle>
                    <CardDescription>Récupérez les fichiers du site</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 2.1 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">2.1</span>
                    <span className="font-medium">Allez sur GitHub.com et connectez-vous</span>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('https://github.com', '_blank')}>
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir GitHub.com
                  </Button>
                </div>

                {/* Sous-étape 2.2 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">2.2</span>
                    <span className="font-medium">Cliquez sur votre photo de profil (en haut à droite)</span>
                  </div>
                </div>

                {/* Sous-étape 2.3 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">2.3</span>
                    <span className="font-medium">Cliquez sur "Your repositories" (Vos dépôts)</span>
                  </div>
                </div>

                {/* Sous-étape 2.4 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">2.4</span>
                    <span className="font-medium">Cliquez sur le nom de votre projet MediaVault</span>
                  </div>
                  <div className="text-sm text-muted-foreground">C'est le dépôt créé par Lovable à l'étape précédente</div>
                </div>

                {/* Sous-étape 2.5 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">2.5</span>
                    <span className="font-medium">Cliquez sur le bouton vert "Code"</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">Un menu apparaît avec plusieurs options</div>
                  </div>
                </div>

                {/* Sous-étape 2.6 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">2.6</span>
                    <span className="font-medium">Cliquez sur "Download ZIP"</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Le téléchargement commence automatiquement</div>
                </div>

                {/* Sous-étape 2.7 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">2.7</span>
                    <span className="font-medium">Décompressez le fichier ZIP</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                    <p className="text-muted-foreground">• Faites un clic droit sur le fichier téléchargé</p>
                    <p className="text-muted-foreground">• Cliquez sur "Extraire tout..." ou "Extract All..."</p>
                    <p className="text-muted-foreground">• Choisissez <code className="bg-black/30 px-1 rounded">C:\MediaVault</code> comme destination</p>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm"><strong>Résultat :</strong> Vous avez maintenant le code dans <code className="bg-black/30 px-1 rounded">C:\MediaVault</code></span>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 3: PC - Installer Node.js */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-green-500/30">
              <CardHeader className="bg-green-500/10 border-b border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">3</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">VOTRE PC</span>
                      Installer Node.js
                    </CardTitle>
                    <CardDescription>Le moteur qui fait tourner le serveur</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 3.1 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">3.1</span>
                    <span className="font-medium">Téléchargez Node.js</span>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('https://nodejs.org/en/download/', '_blank')}>
                    <Download className="w-4 h-4" />
                    Ouvrir nodejs.org (téléchargement)
                  </Button>
                </div>

                {/* Sous-étape 3.2 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">3.2</span>
                    <span className="font-medium">Cliquez sur "Windows Installer" (version LTS recommandée)</span>
                  </div>
                  <div className="text-sm text-muted-foreground">LTS = version stable, recommandée pour la majorité des utilisateurs</div>
                </div>

                {/* Sous-étape 3.3 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">3.3</span>
                    <span className="font-medium">Installez Node.js</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                    <p className="text-muted-foreground">• Double-cliquez sur le fichier téléchargé</p>
                    <p className="text-muted-foreground">• Cliquez "Next" (Suivant) à chaque étape</p>
                    <p className="text-muted-foreground">• Cochez "Automatically install necessary tools" si proposé</p>
                    <p className="text-muted-foreground">• Cliquez "Install" puis "Finish"</p>
                  </div>
                </div>

                {/* Sous-étape 3.4 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">3.4</span>
                    <span className="font-medium">Vérifiez l'installation</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                    <p className="text-muted-foreground">• Appuyez sur <kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Windows + R</kbd></p>
                    <p className="text-muted-foreground">• Tapez <code className="bg-black/30 px-1 rounded">cmd</code> et appuyez Entrée</p>
                    <p className="text-muted-foreground">• Tapez <code className="bg-black/30 px-1 rounded">node --version</code> et appuyez Entrée</p>
                    <p className="text-muted-foreground">• Vous devriez voir quelque chose comme <code className="bg-black/30 px-1 rounded">v20.x.x</code></p>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm"><strong>Résultat :</strong> Node.js est installé et prêt !</span>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 4: PC - Compiler le site */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-green-500/30">
              <CardHeader className="bg-green-500/10 border-b border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">4</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">VOTRE PC</span>
                      Compiler le site
                    </CardTitle>
                    <CardDescription>Transformer le code en site web utilisable</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 4.1 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">4.1</span>
                    <span className="font-medium">Ouvrez l'Invite de commandes</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                    <p className="text-muted-foreground">• Appuyez sur <kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Windows + R</kbd></p>
                    <p className="text-muted-foreground">• Tapez <code className="bg-black/30 px-1 rounded">cmd</code> et appuyez Entrée</p>
                  </div>
                </div>

                {/* Sous-étape 4.2 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">4.2</span>
                    <span className="font-medium">Allez dans le dossier du projet</span>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg font-mono text-sm">
                    <span className="text-green-400">cd C:\MediaVault</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Copiez-collez cette commande et appuyez Entrée</div>
                </div>

                {/* Sous-étape 4.3 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">4.3</span>
                    <span className="font-medium">Installez les dépendances</span>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg font-mono text-sm">
                    <span className="text-green-400">npm install</span>
                  </div>
                  <div className="text-xs text-muted-foreground">⏱️ Attendez que ça finisse (peut prendre 1-2 minutes)</div>
                </div>

                {/* Sous-étape 4.4 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">4.4</span>
                    <span className="font-medium">Compilez le site</span>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg font-mono text-sm">
                    <span className="text-green-400">npm run build</span>
                  </div>
                  <div className="text-xs text-muted-foreground">⏱️ Attendez le message "build completed" (30 secondes environ)</div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm"><strong>Résultat :</strong> Un dossier <code className="bg-black/30 px-1 rounded">dist</code> est apparu dans votre projet !</span>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 5: PC - Créer le script serveur */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-green-500/30">
              <CardHeader className="bg-green-500/10 border-b border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">5</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">VOTRE PC</span>
                      Créer le fichier server.js
                    </CardTitle>
                    <CardDescription>Le cœur de votre serveur local</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 5.1 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">5.1</span>
                    <span className="font-medium">Ouvrez le Bloc-notes</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                    <p className="text-muted-foreground">• Appuyez sur <kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Windows</kbd></p>
                    <p className="text-muted-foreground">• Tapez <code className="bg-black/30 px-1 rounded">bloc-notes</code> ou <code className="bg-black/30 px-1 rounded">notepad</code></p>
                    <p className="text-muted-foreground">• Cliquez sur l'application Bloc-notes</p>
                  </div>
                </div>

                {/* Sous-étape 5.2 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">5.2</span>
                    <span className="font-medium">Copiez le script ci-dessous</span>
                  </div>
                  <Card className="border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          📄 server.cjs — Script complet
                        </span>
                        <Button 
                          variant="default" 
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            navigator.clipboard.writeText(selfHostingScript);
                            toast.success('Script copié dans le presse-papier !');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                          Copier le script
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-black/50 p-4 rounded-lg overflow-x-auto max-h-48 whitespace-pre-wrap">
{selfHostingScript}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                {/* Sous-étape 5.3 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">5.3</span>
                    <span className="font-medium">Collez le script dans le Bloc-notes</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Appuyez sur <kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Ctrl + V</kbd></div>
                </div>

                {/* Sous-étape 5.4 - IMPORTANT */}
                <div className="pl-4 border-l-2 border-amber-500/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">5.4 ⚠️</span>
                    <span className="font-medium text-amber-400">IMPORTANT : Modifiez les chemins !</span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg text-sm space-y-3">
                    <p className="text-muted-foreground">Trouvez ces 3 lignes au début du script et modifiez-les :</p>
                    <div className="bg-black/50 p-3 rounded font-mono text-xs space-y-1">
                      <p><span className="text-amber-400">const MEDIA_FOLDER = '</span><span className="text-green-400">C:/MediaVault/media</span><span className="text-amber-400">';</span></p>
                      <p><span className="text-amber-400">const DIST_FOLDER = '</span><span className="text-green-400">C:/MediaVault/dist</span><span className="text-amber-400">';</span></p>
                      <p><span className="text-amber-400">const DATA_FILE = '</span><span className="text-green-400">C:/MediaVault/data.json</span><span className="text-amber-400">';</span></p>
                    </div>
                    <p className="text-muted-foreground">
                      <strong>MEDIA_FOLDER</strong> = où sont vos photos/vidéos<br/>
                      <strong>DIST_FOLDER</strong> = le dossier "dist" créé à l'étape 4<br/>
                      <strong>DATA_FILE</strong> = où sauvegarder vos tags/playlists
                    </p>
                    <p className="text-amber-400 font-medium">⚠️ Utilisez des / (pas des \) même sur Windows !</p>
                  </div>
                </div>

                {/* Sous-étape 5.5 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">5.5</span>
                    <span className="font-medium">Enregistrez le fichier</span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                    <p className="text-muted-foreground">• Appuyez sur <kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Ctrl + S</kbd></p>
                    <p className="text-muted-foreground">• Naviguez vers <code className="bg-black/30 px-1 rounded">C:\MediaVault</code></p>
                    <p className="text-muted-foreground">• Nom du fichier : <code className="bg-black/30 px-1 rounded font-bold text-amber-400">server.cjs</code> <span className="text-destructive font-bold">(⚠️ pas .js !)</span></p>
                    <p className="text-muted-foreground">• Type : <code className="bg-black/30 px-1 rounded">Tous les fichiers (*.*)</code></p>
                    <p className="text-muted-foreground">• Cliquez "Enregistrer"</p>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm"><strong>Résultat :</strong> Le fichier server.cjs est prêt !</span>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 6: PC - Organiser les dossiers */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-green-500/30">
              <CardHeader className="bg-green-500/10 border-b border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">6</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">VOTRE PC</span>
                      Organiser vos dossiers
                    </CardTitle>
                    <CardDescription>Créez un dossier pour vos médias</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
                  <div className="text-foreground font-semibold mb-2">📁 Structure finale de C:\MediaVault\ :</div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>├── 📄 server.cjs <span className="text-primary">(le script que vous venez de créer)</span></div>
                    <div>├── 📁 dist\ <span className="text-primary">(créé automatiquement par npm run build)</span></div>
                    <div>│   ├── index.html</div>
                    <div>│   ├── assets\</div>
                    <div>│   └── ...</div>
                    <div>├── 📁 media\ <span className="text-amber-400 font-semibold">← Créez ce dossier et mettez vos photos/vidéos dedans</span></div>
                    <div>│   ├── photo1.jpg</div>
                    <div>│   ├── video1.mp4</div>
                    <div>│   └── ...</div>
                    <div>└── 📄 data.json <span className="text-primary">(créé automatiquement au premier lancement)</span></div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-sm">
                  <span className="text-amber-400 font-medium">💡 Astuce :</span>
                  <span className="text-muted-foreground"> Créez le dossier <code className="bg-black/30 px-1 rounded">media</code> maintenant et copiez-y quelques photos pour tester.</span>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 7: Lancer le serveur */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 to-green-500/5">
              <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">7</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">VOTRE PC</span>
                      🚀 Lancer votre site !
                    </CardTitle>
                    <CardDescription>Le moment de vérité</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 7.1 */}
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">7.1</span>
                    <span className="font-medium">Ouvrez l'Invite de commandes</span>
                  </div>
                  <div className="text-sm text-muted-foreground"><kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Windows + R</kbd> → tapez <code className="bg-black/30 px-1 rounded">cmd</code> → Entrée</div>
                </div>

                {/* Sous-étape 7.2 */}
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">7.2</span>
                    <span className="font-medium">Allez dans le dossier MediaVault</span>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg font-mono text-sm">
                    <span className="text-emerald-400">cd C:\MediaVault</span>
                  </div>
                </div>

                {/* Sous-étape 7.3 */}
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">7.3</span>
                    <span className="font-medium">Lancez le serveur</span>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg font-mono text-sm">
                    <span className="text-emerald-400">node server.cjs</span>
                  </div>
                </div>

                {/* Sous-étape 7.4 */}
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">7.4</span>
                    <span className="font-medium">Ouvrez votre navigateur</span>
                  </div>
                  <div className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-lg text-center">
                    <p className="text-lg font-bold text-emerald-400">http://localhost:3001</p>
                    <p className="text-sm text-muted-foreground mt-1">Copiez cette adresse dans votre navigateur</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-6 h-6 text-green-500" />
                    <span className="text-lg font-bold text-green-400">🎉 Félicitations !</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Votre site MediaVault fonctionne maintenant <strong className="text-foreground">100% sur votre PC</strong> !
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vos photos, vidéos et métadonnées (tags, playlists) sont stockées localement.
                    Vous n'avez plus besoin de Lovable sauf pour modifier le site.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* BONUS: Fichier .bat pour lancer en un clic */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <CardHeader className="bg-amber-500/10 border-b border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg">⚡</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      🚀 Fichier .bat - Lancer en UN CLIC
                    </CardTitle>
                    <CardDescription>Plus besoin de taper des commandes ! Double-cliquez simplement sur ce fichier.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Instructions */}
                <div className="space-y-3">
                  <div className="pl-4 border-l-2 border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">1</span>
                      <span className="font-medium">Créez un nouveau fichier</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Dans le dossier <code className="bg-black/30 px-1 rounded">C:\MediaVault</code>, faites clic droit → <strong className="text-foreground">Nouveau</strong> → <strong className="text-foreground">Document texte</strong>
                    </div>
                  </div>

                  <div className="pl-4 border-l-2 border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">2</span>
                      <span className="font-medium">Renommez-le</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Renommez le fichier en <code className="bg-black/30 px-1 rounded font-bold text-amber-400">Lancer MediaVault.bat</code>
                    </div>
                    <div className="bg-amber-500/20 border border-amber-500/30 p-2 rounded text-xs text-amber-300">
                      ⚠️ Si Windows demande de confirmer le changement d'extension, cliquez <strong>Oui</strong>
                    </div>
                  </div>

                  <div className="pl-4 border-l-2 border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">3</span>
                      <span className="font-medium">Copiez ce contenu dans le fichier</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Clic droit sur le fichier .bat → <strong className="text-foreground">Modifier</strong> (ou Ouvrir avec Bloc-notes) → Collez le code ci-dessous → Enregistrez
                    </div>
                  </div>
                </div>

                {/* Script .bat */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-400">📄 Contenu du fichier .bat :</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        navigator.clipboard.writeText(batScript);
                        toast.success('Script .bat copié !');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                      Copier
                    </Button>
                  </div>
                  <pre className="bg-black/70 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-amber-500/30">
                    <code className="text-amber-300 whitespace-pre">{batScript}</code>
                  </pre>
                </div>

                {/* Étape 4 */}
                <div className="pl-4 border-l-2 border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">4</span>
                    <span className="font-medium">Double-cliquez sur le fichier pour lancer !</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Une fenêtre noire s'ouvrira et votre navigateur s'ouvrira automatiquement sur <code className="bg-black/30 px-1 rounded">http://localhost:3001</code>
                  </div>
                </div>

                {/* Résultat */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-green-400">C'est tout !</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Désormais, pour lancer votre MediaVault, il vous suffit de <strong className="text-foreground">double-cliquer</strong> sur <code className="bg-black/30 px-1 rounded">Lancer MediaVault.bat</code>
                  </p>
                </div>

                {/* Bonus: Démarrage automatique */}
                <div className="border-t border-amber-500/20 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-medium text-amber-400">💡 Bonus : Lancement au démarrage de Windows</span>
                  </div>
                  <div className="text-sm space-y-2 text-muted-foreground">
                    <p>1. Appuyez sur <kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Windows + R</kbd></p>
                    <p>2. Tapez <code className="bg-black/30 px-1 rounded">shell:startup</code> et appuyez Entrée</p>
                    <p>3. Copiez votre fichier <code className="bg-black/30 px-1 rounded">Lancer MediaVault.bat</code> dans ce dossier</p>
                    <p className="text-xs italic pt-2">→ Le serveur démarrera automatiquement à chaque démarrage de Windows !</p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* Update Tab */}
          <TabsContent value="update" className="space-y-4 mt-6">
            
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Status Card - Version actuelle et bouton de mise à jour */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className={cn(
              "border-2",
              hasUpdate 
                ? "border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10" 
                : currentVersion
                  ? "border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10"
                  : "border-muted"
            )}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center",
                      hasUpdate 
                        ? "bg-amber-500/20 text-amber-500" 
                        : currentVersion
                          ? "bg-green-500/20 text-green-500"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {hasUpdate ? (
                        <Download className="w-7 h-7" />
                      ) : (
                        <CheckCircle className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {hasUpdate ? "Mise à jour disponible" : currentVersion ? "Vous êtes à jour" : "Vérifiez votre version"}
                        </h3>
                        {hasUpdate && changelog.length > 0 && (
                          <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
                            +{changelog.length} commit{changelog.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {currentVersion && (
                          <span className="flex items-center gap-1">
                            <span>Version:</span>
                            <code className="bg-black/20 px-1.5 py-0.5 rounded text-foreground font-mono text-xs">
                              {currentVersion.substring(0, 7)}
                            </code>
                          </span>
                        )}
                        {hasUpdate && newVersion && (
                          <>
                            <span>→</span>
                            <code className="bg-primary/20 px-1.5 py-0.5 rounded text-primary font-mono text-xs">
                              {newVersion.substring(0, 7)}
                            </code>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={checkForUpdates}
                      disabled={updateCheckState === 'checking'}
                      className="gap-2"
                    >
                      {updateCheckState === 'checking' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Vérifier
                    </Button>
                    {hasUpdate && (
                      <Button 
                        onClick={() => setShowUpdateModal(true)}
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Mettre à jour
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Paramètres de notifications */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Paramètres de notifications
                </CardTitle>
                <CardDescription>Personnalisez les notifications de mise à jour</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Son de notification */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Son de notification</Label>
                      <p className="text-xs text-muted-foreground">Son joué à la fin d'une mise à jour</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={notificationSound} onValueChange={(v) => handleNotificationSoundChange(v as NotificationSoundType)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chime">Carillon</SelectItem>
                        <SelectItem value="bell">Cloche</SelectItem>
                        <SelectItem value="success">Fanfare</SelectItem>
                        <SelectItem value="ping">Ping</SelectItem>
                        <SelectItem value="none">Aucun</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => playNotificationSound(notificationSound)}
                      disabled={notificationSound === 'none'}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Notifications système */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="system-notif" className="text-sm font-medium cursor-pointer">Notifications système</Label>
                      <p className="text-xs text-muted-foreground">Afficher une notification Windows/Mac après mise à jour</p>
                    </div>
                  </div>
                  <Switch
                    id="system-notif"
                    checked={showSystemNotifications}
                    onCheckedChange={handleSystemNotificationsChange}
                  />
                </div>

                {/* Vérification automatique */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="auto-update-check-2" className="text-sm font-medium cursor-pointer">
                        Vérification automatique au démarrage
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Affiche une notification si une mise à jour est disponible
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="auto-update-check-2"
                    defaultChecked={localStorage.getItem('mediavault-disable-auto-update-check') !== 'true'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        localStorage.removeItem('mediavault-disable-auto-update-check');
                      } else {
                        localStorage.setItem('mediavault-disable-auto-update-check', 'true');
                      }
                      toast.success(checked ? "Vérification automatique activée" : "Vérification automatique désactivée");
                    }}
                  />
                </div>

                {lastCheckDate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Dernière vérification : {new Date(lastCheckDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Vérifier les mises à jour */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
              <CardHeader className="bg-blue-500/10 border-b border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      🔍 Vérifier les mises à jour
                    </CardTitle>
                    <CardDescription>Comparez votre version avec la dernière version sur GitHub</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Configuration du repo */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="github-repo">URL de votre repository GitHub</Label>
                    <Input
                      id="github-repo"
                      placeholder="https://github.com/votre-nom/votre-repo"
                      defaultValue={localStorage.getItem('mediavault-github-repo') || ''}
                      onChange={(e) => saveRepoUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Trouvez l'URL sur GitHub → Votre repository → Bouton vert "Code" → Copiez l'URL HTTPS
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="github-branch">Branche Git</Label>
                    <div className="flex gap-2">
                      <Select 
                        defaultValue={localStorage.getItem('mediavault-github-branch') || 'main'}
                        onValueChange={(value) => localStorage.setItem('mediavault-github-branch', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Branche" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">main</SelectItem>
                          <SelectItem value="master">master</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={checkForUpdates}
                        disabled={updateCheckState === 'checking'}
                        className="gap-2 flex-1"
                      >
                        {updateCheckState === 'checking' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Vérification...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Vérifier les mises à jour
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>La branche par défaut est généralement "main" ou "master" selon votre repo</span>
                      {lastCheckDate && (
                        <>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>
                            Dernière vérification : {new Date(lastCheckDate).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Token pour repos privés */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label htmlFor="github-token" className="flex items-center gap-2">
                      Personal Access Token
                      <span className="text-xs text-muted-foreground font-normal">(optionnel - pour repos privés)</span>
                    </Label>
                    <Input
                      id="github-token"
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      defaultValue={localStorage.getItem('mediavault-github-token') || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          localStorage.setItem('mediavault-github-token', e.target.value);
                        } else {
                          localStorage.removeItem('mediavault-github-token');
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → Cochez "repo"
                    </p>
                  </div>
                </div>

                {/* Résultat de la vérification */}
                {updateCheckState === 'available' && latestCommitInfo && (
                  <div className="bg-amber-500/20 border border-amber-500/40 p-4 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <span className="font-medium text-amber-400">Mise à jour disponible !</span>
                      {changelog.length > 0 && (
                        <span className="text-xs bg-amber-500/30 px-2 py-0.5 rounded-full">
                          {changelog.length} commit{changelog.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Dernière version :</span> <code className="bg-black/30 px-1 rounded text-foreground">{latestCommitInfo.sha}</code></p>
                      <p><span className="text-muted-foreground">Date :</span> <span className="text-foreground">{latestCommitInfo.date}</span></p>
                      <p><span className="text-muted-foreground">Description :</span> <span className="text-foreground">{latestCommitInfo.message}</span></p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={markAsUpdated}>
                        <Check className="w-4 h-4 mr-2" />
                        J'ai installé cette version
                      </Button>
                    </div>
                  </div>
                )}

                {/* Changelog */}
                {updateCheckState === 'available' && changelog.length > 0 && (
                  <div className="bg-muted/30 border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Changelog</span>
                      <span className="text-xs text-muted-foreground">
                        ({changelog.length} modification{changelog.length > 1 ? 's' : ''} depuis votre version)
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {changelog.map((commit, index) => (
                        <div 
                          key={commit.sha} 
                          className={cn(
                            "px-4 py-3 flex gap-3 hover:bg-muted/30 transition-colors",
                            index !== changelog.length - 1 && "border-b border-border/50"
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{commit.message}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <code className="bg-black/20 px-1 rounded">{commit.sha}</code>
                              <span>•</span>
                              <span>{commit.date}</span>
                              <span>•</span>
                              <span>{commit.author}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {updateCheckState === 'up-to-date' && latestCommitInfo && (
                  <div className="bg-green-500/20 border border-green-500/40 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="font-medium text-green-400">Vous êtes à jour !</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Version actuelle : <code className="bg-black/30 px-1 rounded">{latestCommitInfo.sha}</code> ({latestCommitInfo.date})
                    </p>
                  </div>
                )}

                {updateCheckState === 'error' && (
                  <div className="bg-red-500/20 border border-red-500/40 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="font-medium text-red-400">Erreur de vérification</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vérifiez l'URL du repository et votre connexion internet.
                    </p>
                  </div>
                )}

                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">💡 Comment ça marche :</span>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>Ce bouton vérifie la dernière version disponible sur GitHub</li>
                    <li>Si une mise à jour est disponible, cliquez sur "Mettre à jour" en haut</li>
                    <li>Le script automatique fait le reste !</li>
                  </ul>
                </div>

              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 1: Télécharger le nouveau code */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-purple-500/30">
              <CardHeader className="bg-purple-500/10 border-b border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">1</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">GITHUB</span>
                      📥 Télécharger le nouveau code
                    </CardTitle>
                    <CardDescription>Récupérez les modifications faites dans Lovable</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 1.1 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">1.1</span>
                    <span className="font-medium">Allez sur GitHub</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ouvrez <a href="https://github.com" target="_blank" className="text-primary hover:underline">github.com</a> dans votre navigateur
                  </div>
                </div>

                {/* Sous-étape 1.2 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">1.2</span>
                    <span className="font-medium">Ouvrez votre repository MediaVault</span>
                  </div>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Cliquez sur votre photo de profil (en haut à droite)</li>
                    <li>Cliquez sur <strong className="text-foreground">"Your repositories"</strong></li>
                    <li>Cliquez sur le nom de votre projet</li>
                  </ol>
                </div>

                {/* Sous-étape 1.3 */}
                <div className="pl-4 border-l-2 border-purple-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">1.3</span>
                    <span className="font-medium">Téléchargez le code mis à jour</span>
                  </div>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Cliquez sur le bouton vert <strong className="text-green-400">"&lt;&gt; Code"</strong></li>
                    <li>Cliquez sur <strong className="text-foreground">"Download ZIP"</strong></li>
                    <li>Le fichier se télécharge automatiquement</li>
                  </ol>
                </div>

              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 2: Remplacer les fichiers */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-green-500/30">
              <CardHeader className="bg-green-500/10 border-b border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">2</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">VOTRE PC</span>
                      📁 Remplacer et recompiler
                    </CardTitle>
                    <CardDescription>Mettez à jour les fichiers sur votre ordinateur</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 2.1 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">2.1</span>
                    <span className="font-medium">Ouvrez le fichier ZIP téléchargé</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Double-cliquez sur le fichier ZIP dans votre dossier Téléchargements
                  </div>
                </div>

                {/* Sous-étape 2.2 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">2.2</span>
                    <span className="font-medium">Remplacez le contenu de C:\MediaVault</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Sélectionnez <strong className="text-foreground">tout le contenu</strong> du dossier extrait et copiez-le dans <code className="bg-black/30 px-1 rounded">C:\MediaVault</code></p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-sm">
                    <span className="text-amber-400 font-medium">⚠️ Important :</span>
                    <ul className="text-muted-foreground mt-1 list-disc list-inside space-y-1">
                      <li><strong className="text-red-400">NE supprimez PAS</strong> votre dossier <code className="bg-black/30 px-1 rounded">media</code> (vos photos/vidéos)</li>
                      <li><strong className="text-red-400">NE supprimez PAS</strong> votre fichier <code className="bg-black/30 px-1 rounded">data.json</code> (vos métadonnées)</li>
                      <li><strong className="text-red-400">NE supprimez PAS</strong> votre fichier <code className="bg-black/30 px-1 rounded">server.cjs</code> (votre serveur configuré)</li>
                      <li>Remplacez uniquement le reste (dossiers src, package.json, etc.)</li>
                    </ul>
                  </div>
                </div>

                {/* Sous-étape 2.3 */}
                <div className="pl-4 border-l-2 border-green-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">2.3</span>
                    <span className="font-medium">Recompilez le site</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ouvrez l'Invite de commandes (<kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Windows + R</kbd> → <code className="bg-black/30 px-1 rounded">cmd</code> → Entrée)
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg font-mono text-sm space-y-2">
                    <div><span className="text-green-400">cd C:\MediaVault</span></div>
                    <div><span className="text-green-400">npm install</span> <span className="text-muted-foreground"># seulement si nouveaux packages</span></div>
                    <div><span className="text-green-400">npm run build</span></div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg text-sm">
                    <span className="text-blue-400 font-medium">💡 Astuce :</span>
                    <span className="text-muted-foreground"> Si vous n'avez pas ajouté de nouvelles fonctionnalités, vous pouvez sauter <code className="bg-black/30 px-1 rounded">npm install</code> et faire directement <code className="bg-black/30 px-1 rounded">npm run build</code></span>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ÉTAPE 3: Relancer le serveur */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 to-green-500/5">
              <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">3</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">VOTRE PC</span>
                      🚀 Relancer le serveur
                    </CardTitle>
                    <CardDescription>Démarrez votre site mis à jour</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Sous-étape 3.1 */}
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">3.1</span>
                    <span className="font-medium">Si le serveur tourne déjà, arrêtez-le</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Dans la fenêtre d'invite de commandes où le serveur tourne, appuyez sur <kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Ctrl + C</kbd>
                  </div>
                </div>

                {/* Sous-étape 3.2 */}
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">3.2</span>
                    <span className="font-medium">Relancez le serveur</span>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg font-mono text-sm">
                    <span className="text-emerald-400">node server.cjs</span>
                  </div>
                </div>

                {/* Sous-étape 3.3 */}
                <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">3.3</span>
                    <span className="font-medium">Vérifiez les changements</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ouvrez <code className="bg-black/30 px-1 rounded">http://localhost:3001</code> dans votre navigateur. Faites <kbd className="px-1 py-0.5 bg-black/30 rounded text-xs">Ctrl + F5</kbd> pour forcer le rechargement.
                  </div>
                </div>

                <div className="bg-green-500/20 border border-green-500/40 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🎉</div>
                  <div className="text-green-400 font-medium">Votre site est maintenant à jour !</div>
                </div>
              </CardContent>
            </Card>

            {/* Récapitulatif rapide */}
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="text-lg">📋 Récapitulatif rapide</CardTitle>
                <CardDescription>Les 3 commandes à retenir pour chaque mise à jour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black/50 p-4 rounded-lg font-mono text-sm space-y-1">
                  <div><span className="text-muted-foreground"># 1. Allez dans le dossier</span></div>
                  <div><span className="text-green-400">cd C:\MediaVault</span></div>
                  <div className="pt-2"><span className="text-muted-foreground"># 2. Recompilez (après avoir remplacé les fichiers)</span></div>
                  <div><span className="text-green-400">npm run build</span></div>
                  <div className="pt-2"><span className="text-muted-foreground"># 3. Relancez le serveur</span></div>
                  <div><span className="text-green-400">node server.cjs</span></div>
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Script de mise à jour automatique */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/5">
              <CardHeader className="bg-cyan-500/10 border-b border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      🤖 Script de mise à jour automatique
                    </CardTitle>
                    <CardDescription>Un fichier .bat qui fait tout automatiquement !</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                  <div className="text-green-400 font-medium mb-2">✨ Ce script fait tout pour vous :</div>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Télécharge automatiquement le nouveau code depuis GitHub</li>
                    <li>Installe les nouvelles dépendances si nécessaire</li>
                    <li>Recompile le site</li>
                    <li>Relance le serveur</li>
                  </ul>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-sm">
                  <span className="text-amber-400 font-medium">⚠️ Prérequis :</span>
                  <span className="text-muted-foreground"> Git doit être installé sur votre PC. Téléchargez-le sur </span>
                  <a href="https://git-scm.com/downloads" target="_blank" className="text-primary hover:underline">git-scm.com</a>
                </div>

                {/* Étape 1: Initialiser Git (une seule fois) */}
                <div className="pl-4 border-l-2 border-cyan-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">Étape 1</span>
                    <span className="font-medium">Configuration initiale (une seule fois)</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ouvrez l'Invite de commandes dans <code className="bg-black/30 px-1 rounded">C:\MediaVault</code> et exécutez :
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg font-mono text-sm space-y-1">
                    <div><span className="text-cyan-400">cd C:\MediaVault</span></div>
                    <div><span className="text-cyan-400">git init</span></div>
                    <div><span className="text-cyan-400">git remote add origin https://github.com/VOTRE_NOM/VOTRE_REPO.git</span></div>
                  </div>
                  <div className="text-xs text-muted-foreground italic">
                    Remplacez VOTRE_NOM/VOTRE_REPO par votre URL GitHub (visible sur la page de votre repository)
                  </div>
                </div>

                {/* Étape 2: Créer le fichier */}
                <div className="pl-4 border-l-2 border-cyan-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">Étape 2</span>
                    <span className="font-medium">Créez le fichier de mise à jour</span>
                  </div>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>Ouvrez le <strong className="text-foreground">Bloc-notes</strong></li>
                    <li>Copiez le code ci-dessous</li>
                    <li>Enregistrez sous <code className="bg-black/30 px-1 rounded">Mettre a jour MediaVault.bat</code> dans <code className="bg-black/30 px-1 rounded">C:\MediaVault</code></li>
                  </ol>
                </div>

                {/* Code du script */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Contenu du fichier :</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(updateScript);
                        toast.success("Script copié !", { description: "Collez-le dans le Bloc-notes" });
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copier le script
                    </Button>
                  </div>
                  <pre className="bg-black/70 p-4 rounded-lg font-mono text-xs overflow-x-auto text-cyan-300 max-h-64 overflow-y-auto">
                    {updateScript}
                  </pre>
                </div>

                {/* Utilisation */}
                <div className="pl-4 border-l-2 border-cyan-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">Étape 3</span>
                    <span className="font-medium">Utilisation</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    À chaque fois que vous faites des modifications dans Lovable :
                  </div>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li><strong className="text-foreground">Double-cliquez</strong> sur <code className="bg-black/30 px-1 rounded">Mettre a jour MediaVault.bat</code></li>
                    <li>Attendez que le script se termine</li>
                    <li>C'est tout ! Votre site est à jour 🎉</li>
                  </ol>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg text-sm">
                  <span className="text-blue-400 font-medium">💡 Note :</span>
                  <span className="text-muted-foreground"> Le script préserve automatiquement vos fichiers <code className="bg-black/30 px-1 rounded">media</code>, <code className="bg-black/30 px-1 rounded">data.json</code> et <code className="bg-black/30 px-1 rounded">server.cjs</code>. Vos données ne seront jamais perdues !</span>
                </div>

              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </div>

      {/* Update Progress Modal */}
      <UpdateProgressModal
        open={showUpdateModal}
        onOpenChange={setShowUpdateModal}
        currentVersion={currentVersion}
        newVersion={newVersion}
        commitsBehind={changelog.length}
        onStartUpdate={triggerUpdateScript}
        changelog={changelog}
      />
    </div>
  );
};

// Script stored outside template literal to avoid escaping issues
const serverScript = [
  "const http = require('http');",
  "const fs = require('fs');",
  "const path = require('path');",
  "",
  "// ⚠️ MODIFIEZ CE CHEMIN avec votre dossier de médias",
  "// Utilisez des / (slash) pour les chemins Windows",
  "// Exemple: 'C:/Users/VotreNom/Pictures'",
  "const MEDIA_FOLDER = 'C:/Users/VotreNom/Pictures';",
  "",
  "// Ports à essayer (si le premier est occupé, essaie le suivant)",
  "const PORTS = [3001, 3002, 3003, 3004, 3005];",
  "let currentPort = PORTS[0];",
  "",
  "// Vérification du dossier au démarrage",
  "if (!fs.existsSync(MEDIA_FOLDER)) {",
  "  console.error('❌ MEDIA_FOLDER introuvable:', MEDIA_FOLDER);",
  "  console.log('➡️ Corrigez MEDIA_FOLDER puis relancez: node server.cjs');",
  "  process.exit(1);",
  "}",
  "",
  "const getMimeType = (ext) => {",
  "  const types = {",
  "    '.jpg': 'image/jpeg',",
  "    '.jpeg': 'image/jpeg',",
  "    '.png': 'image/png',",
  "    '.gif': 'image/gif',",
  "    '.webp': 'image/webp',",
  "    '.mp4': 'video/mp4',",
  "    '.webm': 'video/webm',",
  "    '.mov': 'video/quicktime'",
  "  };",
  "  return types[ext.toLowerCase()] || 'application/octet-stream';",
  "};",
  "",
  "// Parse multipart form data",
  "const parseMultipart = (buffer, boundary) => {",
  "  const parts = [];",
  "  const boundaryBuffer = Buffer.from('--' + boundary);",
  "  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length + 2;",
  "  ",
  "  while (start < buffer.length) {",
  "    const end = buffer.indexOf(boundaryBuffer, start);",
  "    if (end === -1) break;",
  "    ",
  "    const part = buffer.slice(start, end - 2);",
  "    const headerEnd = part.indexOf(Buffer.from([13, 10, 13, 10]));",
  "    if (headerEnd === -1) {",
  "      start = end + boundaryBuffer.length + 2;",
  "      continue;",
  "    }",
  "    ",
  "    const headers = part.slice(0, headerEnd).toString();",
  "    const content = part.slice(headerEnd + 4);",
  "    ",
  "    const filenameMatch = headers.match(/filename=\"([^\"]+)\"/);",
  "    if (filenameMatch) {",
  "      parts.push({",
  "        filename: filenameMatch[1],",
  "        data: content",
  "      });",
  "    }",
  "    ",
  "    start = end + boundaryBuffer.length + 2;",
  "  }",
  "  ",
  "  return parts;",
  "};",
  "",
  "const createServer = (port) => {",
  "  const server = http.createServer((req, res) => {",
  "    // CORS Headers",
  "    res.setHeader('Access-Control-Allow-Origin', '*');",
  "    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');",
  "    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');",
  "    ",
  "    if (req.method === 'OPTIONS') {",
  "      res.writeHead(200);",
  "      return res.end();",
  "    }",
  "",
  "    // Health check",
  "    if (req.url === '/api/health') {",
  "      res.writeHead(200, { 'Content-Type': 'application/json' });",
  "      return res.end(JSON.stringify({ status: 'ok', folder: MEDIA_FOLDER }));",
  "    }",
  "",
  "    // Upload file",
  "    if (req.url === '/api/upload' && req.method === 'POST') {",
  "      const contentType = req.headers['content-type'] || '';",
  "      const boundary = contentType.split('boundary=')[1];",
  "      ",
  "      if (!boundary) {",
  "        res.writeHead(400, { 'Content-Type': 'application/json' });",
  "        return res.end(JSON.stringify({ error: 'Invalid content-type' }));",
  "      }",
  "      ",
  "      const chunks = [];",
  "      req.on('data', chunk => chunks.push(chunk));",
  "      req.on('end', () => {",
  "        try {",
  "          const buffer = Buffer.concat(chunks);",
  "          const parts = parseMultipart(buffer, boundary);",
  "          ",
  "          if (parts.length === 0) {",
  "            res.writeHead(400, { 'Content-Type': 'application/json' });",
  "            return res.end(JSON.stringify({ error: 'No file found' }));",
  "          }",
  "          ",
  "          const file = parts[0];",
  "          const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');",
  "          const filePath = path.join(MEDIA_FOLDER, safeName);",
  "          ",
  "          fs.writeFileSync(filePath, file.data);",
  "          ",
  "          const urlPath = encodeURIComponent(safeName);",
  "          res.writeHead(200, { 'Content-Type': 'application/json' });",
  "          res.end(JSON.stringify({",
  "            success: true,",
  "            fileName: safeName,",
  "            url: 'http://localhost:' + port + '/media/' + urlPath,",
  "            thumbnailUrl: 'http://localhost:' + port + '/media/' + urlPath",
  "          }));",
  "          ",
  "          console.log('✅ Fichier uploadé:', safeName);",
  "        } catch (err) {",
  "          console.error('❌ Erreur upload:', err.message);",
  "          res.writeHead(500, { 'Content-Type': 'application/json' });",
  "          res.end(JSON.stringify({ error: err.message }));",
  "        }",
  "      });",
  "      return;",
  "    }",
  "",
  "    // Delete file",
  "    if (req.url === '/api/delete' && req.method === 'DELETE') {",
  "      let body = '';",
  "      req.on('data', chunk => body += chunk);",
  "      req.on('end', () => {",
  "        try {",
  "          const { fileName } = JSON.parse(body);",
  "          if (!fileName) {",
  "            res.writeHead(400, { 'Content-Type': 'application/json' });",
  "            return res.end(JSON.stringify({ error: 'fileName required' }));",
  "          }",
  "          ",
  "          const filePath = path.normalize(path.join(MEDIA_FOLDER, fileName));",
  "          ",
  "          // Security: prevent path traversal",
  "          if (!filePath.startsWith(path.normalize(MEDIA_FOLDER + path.sep))) {",
  "            res.writeHead(400, { 'Content-Type': 'application/json' });",
  "            return res.end(JSON.stringify({ error: 'Invalid path' }));",
  "          }",
  "          ",
  "          if (!fs.existsSync(filePath)) {",
  "            res.writeHead(404, { 'Content-Type': 'application/json' });",
  "            return res.end(JSON.stringify({ error: 'File not found' }));",
  "          }",
  "          ",
  "          fs.unlinkSync(filePath);",
  "          ",
  "          res.writeHead(200, { 'Content-Type': 'application/json' });",
  "          res.end(JSON.stringify({ success: true, fileName }));",
  "          ",
  "          console.log('🗑️ Fichier supprimé:', fileName);",
  "        } catch (err) {",
  "          console.error('❌ Erreur suppression:', err.message);",
  "          res.writeHead(500, { 'Content-Type': 'application/json' });",
  "          res.end(JSON.stringify({ error: err.message }));",
  "        }",
  "      });",
  "      return;",
  "    }",
  "",
  "    // List files (scan récursif)",
  "    if (req.url === '/api/files') {",
  "      try {",
  "        const isSupported = (name) => /\\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(name);",
  "",
  "        const listMediaFiles = (dir, baseDir) => {",
  "          const out = [];",
  "          const entries = fs.readdirSync(dir, { withFileTypes: true });",
  "",
  "          for (const entry of entries) {",
  "            const abs = path.join(dir, entry.name);",
  "            if (entry.isDirectory()) {",
  "              out.push(...listMediaFiles(abs, baseDir));",
  "              continue;",
  "            }",
  "            if (!entry.isFile()) continue;",
  "            if (!isSupported(entry.name)) continue;",
  "",
  "            const rel = path.relative(baseDir, abs);",
  "            const stats = fs.statSync(abs);",
  "            const ext = path.extname(entry.name).toLowerCase();",
  "            const isVideo = ['.mp4', '.webm', '.mov'].includes(ext);",
  "",
  "            const urlPath = rel",
  "              .split(path.sep)",
  "              .filter(Boolean)",
  "              .map(encodeURIComponent)",
  "              .join('/');",
  "",
  "            out.push({",
  "              name: rel,",
  "              url: 'http://localhost:' + port + '/media/' + urlPath,",
  "              thumbnailUrl: 'http://localhost:' + port + '/media/' + urlPath,",
  "              size: stats.size,",
  "              type: isVideo ? 'video' : 'image',",
  "              createdAt: stats.birthtime.toISOString(),",
  "            });",
  "          }",
  "",
  "          return out;",
  "        };",
  "",
  "        const files = listMediaFiles(MEDIA_FOLDER, MEDIA_FOLDER);",
  "",
  "        res.writeHead(200, { 'Content-Type': 'application/json' });",
  "        return res.end(JSON.stringify(files));",
  "      } catch (err) {",
  "        res.writeHead(500, { 'Content-Type': 'application/json' });",
  "        return res.end(JSON.stringify({ error: err.message }));",
  "      }",
  "    }",
  "",
  "    // Serve media files",
  "    if (req.url.startsWith('/media/')) {",
  "      const fileName = decodeURIComponent(req.url.slice(7));",
  "      const filePath = path.normalize(path.join(MEDIA_FOLDER, fileName));",
  "",
  "      if (!filePath.startsWith(path.normalize(MEDIA_FOLDER + path.sep))) {",
  "        res.writeHead(400, { 'Content-Type': 'application/json' });",
  "        return res.end(JSON.stringify({ error: 'Bad path' }));",
  "      }",
  "",
  "      if (fs.existsSync(filePath)) {",
  "        const stat = fs.statSync(filePath);",
  "        const ext = path.extname(filePath);",
  "",
  "        res.writeHead(200, {",
  "          'Content-Type': getMimeType(ext),",
  "          'Content-Length': stat.size,",
  "          'Cache-Control': 'public, max-age=31536000',",
  "        });",
  "        return fs.createReadStream(filePath).pipe(res);",
  "      }",
  "    }",
  "",
  "    res.writeHead(404, { 'Content-Type': 'application/json' });",
  "    res.end(JSON.stringify({ error: 'Not Found' }));",
  "  });",
  "",
  "  return server;",
  "};",
  "",
  "const startServer = (portIndex = 0) => {",
  "  if (portIndex >= PORTS.length) {",
  "    console.error('❌ Erreur: Tous les ports sont occupés (3001-3005)');",
  "    console.log('');",
  "    console.log('Solutions:');",
  "    console.log('1. Fermez les autres instances du serveur');",
  "    console.log('2. Redémarrez votre ordinateur');",
  "    console.log('3. Exécutez: netstat -ano | findstr :3001');",
  "    console.log('   puis: taskkill /PID <numero> /F');",
  "    process.exit(1);",
  "  }",
  "",
  "  const port = PORTS[portIndex];",
  "  const server = createServer(port);",
  "",
  "  server.on('error', (err) => {",
  "    if (err.code === 'EADDRINUSE') {",
  "      console.log('⚠️  Port ' + port + ' occupé, essai du port ' + PORTS[portIndex + 1] + '...');",
  "      startServer(portIndex + 1);",
  "    } else {",
  "      console.error('❌ Erreur serveur:', err.message);",
  "      process.exit(1);",
  "    }",
  "  });",
  "",
  "  server.listen(port, () => {",
  "    currentPort = port;",
  "    console.log('');",
  "    console.log('✅ MediaVault Server démarré!');",
  "    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');",
  "    console.log('📁 Dossier: ' + MEDIA_FOLDER);",
  "    console.log('🌐 URL: http://localhost:' + port);",
  "    console.log('📡 API: http://localhost:' + port + '/api/files');",
  "    console.log('📤 Upload: http://localhost:' + port + '/api/upload');",
  "    console.log('🗑️ Delete: http://localhost:' + port + '/api/delete');",
  "    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');",
  "    console.log('');",
  "    if (port !== 3001) {",
  "      console.log('⚠️  IMPORTANT: Mettez à jour URL dans MediaVault:');",
  "      console.log('   http://localhost:' + port);",
  "      console.log('');",
  "    }",
  "    console.log('Laissez cette fenêtre ouverte et retournez sur MediaVault.');",
  "  });",
  "};",
  "",
  "console.log('');",
  "console.log('🚀 Démarrage du serveur MediaVault...');",
  "startServer();"
].join('\n');

// Script tout-en-un pour self-hosting complet (site + API + métadonnées)
const selfHostingScript = [
  "const http = require('http');",
  "const fs = require('fs');",
  "const path = require('path');",
  "const { exec } = require('child_process');",
  "",
  "// ═══════════════════════════════════════════════════════════",
  "// CONFIGURATION - Modifiez ces chemins selon votre installation",
  "// ═══════════════════════════════════════════════════════════",
  "const MEDIA_FOLDER = 'C:/MediaVault/media';     // Vos photos/vidéos",
  "const DIST_FOLDER = 'C:/MediaVault/dist';       // Le site compilé",
  "const DATA_FILE = 'C:/MediaVault/data.json';    // Métadonnées (tags, playlists)",
  "",
  "const PORT = 3001;",
  "",
  "// Vérifications au démarrage",
  "if (!fs.existsSync(MEDIA_FOLDER)) {",
  "  console.error('❌ Dossier média introuvable:', MEDIA_FOLDER);",
  "  process.exit(1);",
  "}",
  "if (!fs.existsSync(DIST_FOLDER)) {",
  "  console.error('❌ Dossier dist introuvable:', DIST_FOLDER);",
  "  console.log('➡️ Compilez le site avec: npm run build');",
  "  process.exit(1);",
  "}",
  "",
  "// Initialiser data.json si inexistant",
  "if (!fs.existsSync(DATA_FILE)) {",
  "  fs.writeFileSync(DATA_FILE, JSON.stringify({ media: [], tags: [], playlists: [] }, null, 2));",
  "  console.log('📄 Fichier data.json créé');",
  "}",
  "",
  "const getMimeType = (ext) => {",
  "  const types = {",
  "    '.html': 'text/html',",
  "    '.css': 'text/css',",
  "    '.js': 'application/javascript',",
  "    '.json': 'application/json',",
  "    '.png': 'image/png',",
  "    '.jpg': 'image/jpeg',",
  "    '.jpeg': 'image/jpeg',",
  "    '.gif': 'image/gif',",
  "    '.webp': 'image/webp',",
  "    '.svg': 'image/svg+xml',",
  "    '.mp4': 'video/mp4',",
  "    '.webm': 'video/webm',",
  "    '.mov': 'video/quicktime',",
  "    '.ico': 'image/x-icon',",
  "    '.woff': 'font/woff',",
  "    '.woff2': 'font/woff2'",
  "  };",
  "  return types[ext.toLowerCase()] || 'application/octet-stream';",
  "};",
  "",
  "const server = http.createServer((req, res) => {",
  "  res.setHeader('Access-Control-Allow-Origin', '*');",
  "  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');",
  "  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');",
  "",
  "  if (req.method === 'OPTIONS') {",
  "    res.writeHead(200);",
  "    return res.end();",
  "  }",
  "",
  "  // API: Santé",
  "  if (req.url === '/api/health') {",
  "    res.writeHead(200, { 'Content-Type': 'application/json' });",
  "    return res.end(JSON.stringify({ status: 'ok' }));",
  "  }",
  "",
  "  // API: Lancer la mise à jour",
  "  if (req.url === '/api/update' && req.method === 'POST') {",
  "    const updateScript = path.join(__dirname, 'Mettre a jour MediaVault.bat');",
  "    if (fs.existsSync(updateScript)) {",
  "      exec('start cmd /c \"' + updateScript + '\"', (err) => {",
  "        if (err) {",
  "          res.writeHead(500, { 'Content-Type': 'application/json' });",
  "          return res.end(JSON.stringify({ error: err.message }));",
  "        }",
  "        res.writeHead(200, { 'Content-Type': 'application/json' });",
  "        res.end(JSON.stringify({ success: true, message: 'Mise à jour lancée' }));",
  "      });",
  "    } else {",
  "      res.writeHead(404, { 'Content-Type': 'application/json' });",
  "      res.end(JSON.stringify({ error: 'Script de mise à jour introuvable: ' + updateScript }));",
  "    }",
  "    return;",
  "  }",
  "",
  "  // API: Lire les données (tags, playlists, médias)",
  "  if (req.url === '/api/data' && req.method === 'GET') {",
  "    try {",
  "      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));",
  "      res.writeHead(200, { 'Content-Type': 'application/json' });",
  "      return res.end(JSON.stringify(data));",
  "    } catch (err) {",
  "      res.writeHead(500, { 'Content-Type': 'application/json' });",
  "      return res.end(JSON.stringify({ error: err.message }));",
  "    }",
  "  }",
  "",
  "  // API: Sauvegarder les données",
  "  if (req.url === '/api/data' && req.method === 'POST') {",
  "    let body = '';",
  "    req.on('data', chunk => body += chunk);",
  "    req.on('end', () => {",
  "      try {",
  "        const data = JSON.parse(body);",
  "        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));",
  "        res.writeHead(200, { 'Content-Type': 'application/json' });",
  "        res.end(JSON.stringify({ success: true }));",
  "      } catch (err) {",
  "        res.writeHead(500, { 'Content-Type': 'application/json' });",
  "        res.end(JSON.stringify({ error: err.message }));",
  "      }",
  "    });",
  "    return;",
  "  }",
  "",
  "  // API: Lister les fichiers média",
  "  if (req.url === '/api/files') {",
  "    try {",
  "      const isSupported = (name) => /\\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(name);",
  "      const listFiles = (dir, baseDir) => {",
  "        const out = [];",
  "        const entries = fs.readdirSync(dir, { withFileTypes: true });",
  "        for (const entry of entries) {",
  "          const abs = path.join(dir, entry.name);",
  "          if (entry.isDirectory()) {",
  "            out.push(...listFiles(abs, baseDir));",
  "          } else if (entry.isFile() && isSupported(entry.name)) {",
  "            const rel = path.relative(baseDir, abs);",
  "            const stats = fs.statSync(abs);",
  "            const ext = path.extname(entry.name).toLowerCase();",
  "            const urlPath = rel.split(path.sep).map(encodeURIComponent).join('/');",
  "            out.push({",
  "              name: rel,",
  "              url: 'http://localhost:' + PORT + '/media/' + urlPath,",
  "              thumbnailUrl: 'http://localhost:' + PORT + '/media/' + urlPath,",
  "              size: stats.size,",
  "              type: ['.mp4', '.webm', '.mov'].includes(ext) ? 'video' : 'image',",
  "              createdAt: stats.birthtime.toISOString()",
  "            });",
  "          }",
  "        }",
  "        return out;",
  "      };",
  "      const files = listFiles(MEDIA_FOLDER, MEDIA_FOLDER);",
  "      res.writeHead(200, { 'Content-Type': 'application/json' });",
  "      return res.end(JSON.stringify(files));",
  "    } catch (err) {",
  "      res.writeHead(500, { 'Content-Type': 'application/json' });",
  "      return res.end(JSON.stringify({ error: err.message }));",
  "    }",
  "  }",
  "",
  "  // Servir les fichiers média",
  "  if (req.url.startsWith('/media/')) {",
  "    const fileName = decodeURIComponent(req.url.slice(7));",
  "    const filePath = path.normalize(path.join(MEDIA_FOLDER, fileName));",
  "    if (filePath.startsWith(path.normalize(MEDIA_FOLDER)) && fs.existsSync(filePath)) {",
  "      const stat = fs.statSync(filePath);",
  "      res.writeHead(200, {",
  "        'Content-Type': getMimeType(path.extname(filePath)),",
  "        'Content-Length': stat.size,",
  "        'Cache-Control': 'public, max-age=31536000'",
  "      });",
  "      return fs.createReadStream(filePath).pipe(res);",
  "    }",
  "  }",
  "",
  "  // Servir le site (fichiers statiques)",
  "  let urlPath = req.url.split('?')[0];",
  "  if (urlPath === '/') urlPath = '/index.html';",
  "",
  "  const filePath = path.join(DIST_FOLDER, urlPath);",
  "  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {",
  "    const ext = path.extname(filePath);",
  "    res.writeHead(200, { 'Content-Type': getMimeType(ext) });",
  "    return fs.createReadStream(filePath).pipe(res);",
  "  }",
  "",
  "  // SPA fallback: renvoyer index.html",
  "  const indexPath = path.join(DIST_FOLDER, 'index.html');",
  "  if (fs.existsSync(indexPath)) {",
  "    res.writeHead(200, { 'Content-Type': 'text/html' });",
  "    return fs.createReadStream(indexPath).pipe(res);",
  "  }",
  "",
  "  res.writeHead(404);",
  "  res.end('Not Found');",
  "});",
  "",
  "server.listen(PORT, () => {",
  "  console.log('');",
  "  console.log('✅ MediaVault Self-Hosted démarré!');",
  "  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');",
  "  console.log('🌐 Site: http://localhost:' + PORT);",
  "  console.log('📁 Médias: ' + MEDIA_FOLDER);",
  "  console.log('📦 Site: ' + DIST_FOLDER);",
  "  console.log('💾 Données: ' + DATA_FILE);",
  "  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');",
  "  console.log('');",
  "  console.log('Ouvrez http://localhost:' + PORT + ' dans votre navigateur');",
"});"
].join('\n');

// Script .bat pour lancer le serveur en un clic
const batScript = `@echo off
title MediaVault - Serveur Local
color 0A

echo.
echo ================================
echo    MediaVault - Demarrage
echo ================================
echo.

cd /d C:\\MediaVault

echo Lancement du serveur...
echo.

start http://localhost:3001

node server.cjs

pause`;

// Script .bat pour mise à jour automatique
const updateScript = `@echo off
title MediaVault - Mise a jour automatique
color 0B

echo.
echo ====================================================
echo    MediaVault - Mise a jour automatique
echo ====================================================
echo.

cd /d C:\\MediaVault

echo [1/4] Sauvegarde des fichiers importants...
echo.
if exist "data.json" (
    copy /Y "data.json" "data.json.backup" >nul
    echo       data.json sauvegarde
)
if exist "server.cjs" (
    copy /Y "server.cjs" "server.cjs.backup" >nul
    echo       server.cjs sauvegarde
)
echo.

echo [2/4] Telechargement du nouveau code depuis GitHub...
echo.
git fetch origin
git reset --hard origin/main
echo.

echo [3/4] Restauration de vos fichiers...
echo.
if exist "data.json.backup" (
    copy /Y "data.json.backup" "data.json" >nul
    del "data.json.backup"
    echo       data.json restaure
)
if exist "server.cjs.backup" (
    copy /Y "server.cjs.backup" "server.cjs" >nul
    del "server.cjs.backup"
    echo       server.cjs restaure
)
echo.

echo [4/4] Installation et compilation...
echo.
call npm install
call npm run build
echo.

echo ====================================================
echo    Mise a jour terminee avec succes !
echo ====================================================
echo.
echo Appuyez sur une touche pour lancer le serveur...
pause >nul

start http://localhost:3001
node server.cjs`;
