import { useState } from 'react';
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
  Clock
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

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-1">Gérez les tags, playlists, et paramètres de votre MediaVault</p>
        </div>

        <Tabs defaultValue="tags" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
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
                      <li>Copiez le script ci-dessous dans un fichier <code className="bg-muted px-1 rounded">server.js</code></li>
                      <li>Modifiez <code className="bg-muted px-1 rounded">MEDIA_FOLDER</code> avec le chemin de vos médias</li>
                      <li>Ouvrez un terminal et exécutez: <code className="bg-muted px-1 rounded">node server.js</code></li>
                      <li>Revenez ici et cliquez sur "Charger les fichiers"</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Script serveur (server.js)
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
        </Tabs>
      </div>
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
  "  console.log('➡️ Corrigez MEDIA_FOLDER puis relancez: node server.js');",
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
