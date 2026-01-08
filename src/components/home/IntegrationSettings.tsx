import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Lightbulb, 
  Camera, 
  Cpu,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Wifi,
  Settings2,
  Zap,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSmartHomeDevices, TuyaConfig, ReolinkConfig } from '@/hooks/useSmartHomeDevices';

export function IntegrationSettings() {
  const {
    config,
    updateConfig,
    devices,
    discoverTuyaDevices,
    discoverReolinkCameras,
    importDevices,
    isDiscovering,
  } = useSmartHomeDevices();

  const [showTuyaKey, setShowTuyaKey] = useState(false);
  const [testingTuya, setTestingTuya] = useState(false);
  const [testingReolink, setTestingReolink] = useState(false);
  const [newCamera, setNewCamera] = useState({
    name: '',
    ip: '',
    username: 'admin',
    password: '',
    channel: 0,
  });

  const tuyaDevices = devices.filter(d => d.protocol === 'tuya');
  const reolinkDevices = devices.filter(d => d.protocol === 'reolink');

  const handleTestTuya = async () => {
    if (!config.tuya.accessId || !config.tuya.accessKey) {
      toast.error('Remplissez les identifiants Tuya');
      return;
    }
    
    setTestingTuya(true);
    try {
      const discovered = await discoverTuyaDevices();
      if (discovered.length > 0) {
        toast.success('Connexion Tuya réussie', {
          description: `${discovered.length} appareil(s) trouvé(s)`,
          action: {
            label: 'Importer',
            onClick: () => importDevices(discovered),
          },
        });
      } else {
        toast.info('Connexion OK mais aucun appareil trouvé');
      }
    } catch {
      toast.error('Échec de la connexion Tuya');
    } finally {
      setTestingTuya(false);
    }
  };

  const handleTestReolink = async () => {
    setTestingReolink(true);
    try {
      const discovered = await discoverReolinkCameras();
      if (discovered.length > 0) {
        toast.success('Découverte Reolink réussie', {
          description: `${discovered.length} caméra(s) trouvée(s)`,
          action: {
            label: 'Importer',
            onClick: () => importDevices(discovered),
          },
        });
      } else {
        toast.info('Aucune caméra Reolink trouvée');
      }
    } catch {
      toast.error('Échec de la découverte Reolink');
    } finally {
      setTestingReolink(false);
    }
  };

  const addReolinkCamera = () => {
    if (!newCamera.name || !newCamera.ip) {
      toast.error('Nom et IP requis');
      return;
    }

    const cameras = [...config.reolink.cameras, { ...newCamera, id: `cam-${Date.now()}` }];
    updateConfig('reolink', { cameras });
    setNewCamera({ name: '', ip: '', username: 'admin', password: '', channel: 0 });
    toast.success('Caméra ajoutée');
  };

  const removeReolinkCamera = (id: string) => {
    const cameras = config.reolink.cameras.filter(c => c.id !== id);
    updateConfig('reolink', { cameras });
    toast.success('Caméra supprimée');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tuya">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tuya" className="gap-2">
            <Lightbulb className="w-4 h-4 text-orange-500" />
            Tuya Smart
          </TabsTrigger>
          <TabsTrigger value="reolink" className="gap-2">
            <Camera className="w-4 h-4 text-purple-500" />
            Reolink
          </TabsTrigger>
        </TabsList>

        {/* Tuya Integration */}
        <TabsContent value="tuya" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-orange-500" />
                Tuya Smart / Smart Life
              </CardTitle>
              <CardDescription>
                Connectez vos appareils Tuya pour le contrôle et la surveillance énergétique en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    config.tuya.enabled ? "bg-orange-500/20" : "bg-muted"
                  )}>
                    <Lightbulb className={cn(
                      "w-5 h-5",
                      config.tuya.enabled ? "text-orange-500" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium">Activer Tuya</p>
                    <p className="text-sm text-muted-foreground">
                      Contrôle via Tuya Cloud API
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.tuya.enabled}
                  onCheckedChange={(enabled) => updateConfig('tuya', { enabled })}
                />
              </div>

              {config.tuya.enabled && (
                <>
                  {/* Credentials */}
                  <div className="space-y-4 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Settings2 className="w-4 h-4" />
                      Identifiants API Tuya IoT Platform
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="tuya-access-id">Access ID</Label>
                        <Input
                          id="tuya-access-id"
                          placeholder="Votre Access ID Tuya"
                          value={config.tuya.accessId}
                          onChange={(e) => updateConfig('tuya', { accessId: e.target.value })}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="tuya-access-key">Access Key (Secret)</Label>
                        <div className="relative">
                          <Input
                            id="tuya-access-key"
                            type={showTuyaKey ? "text" : "password"}
                            placeholder="Votre Access Key Tuya"
                            value={config.tuya.accessKey}
                            onChange={(e) => updateConfig('tuya', { accessKey: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowTuyaKey(!showTuyaKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showTuyaKey ? 
                              <EyeOff className="w-4 h-4 text-muted-foreground" /> : 
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            }
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="tuya-region">Région Data Center</Label>
                        <Select
                          value={config.tuya.region}
                          onValueChange={(region: TuyaConfig['region']) => updateConfig('tuya', { region })}
                        >
                          <SelectTrigger id="tuya-region">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eu">🇪🇺 Europe (eu)</SelectItem>
                            <SelectItem value="us">🇺🇸 Amérique (us)</SelectItem>
                            <SelectItem value="cn">🇨🇳 Chine (cn)</SelectItem>
                            <SelectItem value="in">🇮🇳 Inde (in)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleTestTuya} disabled={testingTuya} className="w-full">
                      {testingTuya ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Test en cours...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Tester et découvrir les appareils
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Auto Discovery */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Découverte automatique</p>
                      <p className="text-xs text-muted-foreground">Détecte les nouveaux appareils périodiquement</p>
                    </div>
                    <Switch
                      checked={config.tuya.autoDiscovery}
                      onCheckedChange={(autoDiscovery) => updateConfig('tuya', { autoDiscovery })}
                    />
                  </div>

                  {/* Connected Devices */}
                  {tuyaDevices.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Appareils Tuya ({tuyaDevices.length})</h4>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2">
                          {tuyaDevices.map(device => (
                            <div key={device.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <div className="flex items-center gap-2">
                                {device.online ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <span className="text-sm">{device.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {device.state.power !== undefined && (
                                  <Badge variant="outline" className="gap-1">
                                    <Zap className="w-3 h-3" />
                                    {device.state.power}W
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">{device.model}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Help Link */}
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-sm">
                      📖 <a 
                        href="https://developer.tuya.com/en/docs/iot/quick-start" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-orange-500 hover:underline"
                      >
                        Comment obtenir vos identifiants Tuya IoT Platform
                      </a>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reolink Integration */}
        <TabsContent value="reolink" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-500" />
                Caméras Reolink
              </CardTitle>
              <CardDescription>
                Intégrez vos caméras Reolink pour le streaming live et la détection de mouvement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    config.reolink.enabled ? "bg-purple-500/20" : "bg-muted"
                  )}>
                    <Camera className={cn(
                      "w-5 h-5",
                      config.reolink.enabled ? "text-purple-500" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium">Activer Reolink</p>
                    <p className="text-sm text-muted-foreground">
                      Streaming RTSP et contrôle PTZ
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.reolink.enabled}
                  onCheckedChange={(enabled) => updateConfig('reolink', { enabled })}
                />
              </div>

              {config.reolink.enabled && (
                <>
                  {/* Auto Discovery */}
                  <Button onClick={handleTestReolink} disabled={testingReolink} className="w-full">
                    {testingReolink ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Recherche ONVIF...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-4 h-4 mr-2" />
                        Découvrir les caméras sur le réseau
                      </>
                    )}
                  </Button>

                  <Separator />

                  {/* Add Camera Manually */}
                  <div className="space-y-4 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Plus className="w-4 h-4" />
                      Ajouter une caméra manuellement
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="cam-name">Nom</Label>
                        <Input
                          id="cam-name"
                          placeholder="Entrée principale"
                          value={newCamera.name}
                          onChange={(e) => setNewCamera(c => ({ ...c, name: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cam-ip">Adresse IP</Label>
                        <Input
                          id="cam-ip"
                          placeholder="192.168.1.100"
                          value={newCamera.ip}
                          onChange={(e) => setNewCamera(c => ({ ...c, ip: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cam-user">Utilisateur</Label>
                        <Input
                          id="cam-user"
                          placeholder="admin"
                          value={newCamera.username}
                          onChange={(e) => setNewCamera(c => ({ ...c, username: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cam-pass">Mot de passe</Label>
                        <Input
                          id="cam-pass"
                          type="password"
                          placeholder="••••••••"
                          value={newCamera.password}
                          onChange={(e) => setNewCamera(c => ({ ...c, password: e.target.value }))}
                        />
                      </div>
                    </div>

                    <Button onClick={addReolinkCamera} className="w-full" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter la caméra
                    </Button>
                  </div>

                  {/* Configured Cameras */}
                  {config.reolink.cameras.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Caméras configurées ({config.reolink.cameras.length})</h4>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2">
                          {config.reolink.cameras.map(camera => (
                            <div key={camera.id} className="flex items-center justify-between p-3 rounded bg-muted/30">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-purple-500/20">
                                  <Camera className="w-4 h-4 text-purple-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{camera.name}</p>
                                  <p className="text-xs text-muted-foreground">{camera.ip}</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeReolinkCamera(camera.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Connected Cameras from Discovery */}
                  {reolinkDevices.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Caméras découvertes ({reolinkDevices.length})</h4>
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2">
                          {reolinkDevices.map(device => (
                            <div key={device.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <div className="flex items-center gap-2">
                                {device.online ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <span className="text-sm">{device.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">{device.model}</Badge>
                                <Badge variant="outline" className="text-xs">{device.ip}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Stream Info */}
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm">
                      📹 Format stream RTSP: <code className="text-xs bg-background px-1 py-0.5 rounded">rtsp://user:pass@IP:554/h264Preview_01_main</code>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
