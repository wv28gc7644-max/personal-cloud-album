import { useState } from 'react';
import { useMediaStore } from '@/hooks/useMediaStore';
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
  Monitor
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
                <CardTitle>Serveur local</CardTitle>
                <CardDescription>Connectez votre disque dur Windows</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-medium mb-2">Configuration du serveur</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Pour accéder à vos fichiers locaux, vous devez lancer un petit serveur sur votre PC Windows.
                  </p>
                  
                  <div className="space-y-3">
                    <Label htmlFor="serverUrl">URL du serveur local</Label>
                    <Input
                      id="serverUrl"
                      value={settings.localServerUrl}
                      onChange={(e) => updateSetting('localServerUrl', e.target.value)}
                      placeholder="http://localhost:3001"
                    />
                  </div>
                </div>

                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-amber-400 mb-2">📁 Instructions</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Installez Node.js sur votre PC Windows</li>
                      <li>Créez un dossier pour votre serveur</li>
                      <li>Copiez le script ci-dessous dans un fichier <code className="bg-muted px-1 rounded">server.js</code></li>
                      <li>Exécutez <code className="bg-muted px-1 rounded">node server.js</code></li>
                      <li>Vos fichiers seront accessibles via l'API</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Script serveur (server.js)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-black/50 p-4 rounded-lg overflow-x-auto">
{`const http = require('http');
const fs = require('fs');
const path = require('path');

const MEDIA_FOLDER = 'C:/Users/VotreNom/Pictures';
const PORT = 3001;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.url === '/api/files') {
    const files = fs.readdirSync(MEDIA_FOLDER)
      .filter(f => /\\.(jpg|jpeg|png|gif|mp4|webm)$/i.test(f))
      .map(f => ({
        name: f,
        url: \`http://localhost:\${PORT}/media/\${f}\`,
        size: fs.statSync(path.join(MEDIA_FOLDER, f)).size
      }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(files));
  }

  if (req.url.startsWith('/media/')) {
    const fileName = decodeURIComponent(req.url.slice(7));
    const filePath = path.join(MEDIA_FOLDER, fileName);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size
      });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(\`Serveur MediaVault sur http://localhost:\${PORT}\`);
  console.log(\`Dossier: \${MEDIA_FOLDER}\`);
});`}
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
