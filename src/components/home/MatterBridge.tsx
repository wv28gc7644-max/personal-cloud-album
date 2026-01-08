import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Cpu, 
  Play, 
  Square, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Plus,
  Minus,
  Smartphone,
  Home,
  Wifi,
  QrCode,
  Copy,
  ExternalLink,
  Lightbulb,
  Thermometer,
  Lock,
  Power,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSmartHomeDevices, SmartDevice } from '@/hooks/useSmartHomeDevices';

const PLATFORM_ICONS = {
  apple: '🍎',
  google: '🔵',
  alexa: '🔷',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  light: Lightbulb,
  sensor: Thermometer,
  lock: Lock,
  switch: Power,
  camera: Camera,
};

export function MatterBridge() {
  const {
    config,
    updateConfig,
    devices,
    matterBridgeStatus,
    startMatterBridge,
    stopMatterBridge,
    exposeMatterDevice,
    unexposeMatterDevice,
  } = useSmartHomeDevices();

  const [pairingCode, setPairingCode] = useState('');
  const [showQR, setShowQR] = useState(false);

  const exposedDevices = devices.filter(d => config.matter.exposedDevices.includes(d.id));
  const availableDevices = devices.filter(d => !config.matter.exposedDevices.includes(d.id));

  const handleStartBridge = async () => {
    await startMatterBridge();
    // Generate pairing code
    const code = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    setPairingCode(formatted);
  };

  const copyPairingCode = () => {
    navigator.clipboard.writeText(pairingCode.replace('-', ''));
    toast.success('Code copié');
  };

  const getStatusColor = () => {
    switch (matterBridgeStatus) {
      case 'running': return 'text-green-500';
      case 'starting': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusText = () => {
    switch (matterBridgeStatus) {
      case 'running': return 'En cours d\'exécution';
      case 'starting': return 'Démarrage...';
      case 'error': return 'Erreur';
      default: return 'Arrêté';
    }
  };

  return (
    <div className="space-y-6">
      {/* Bridge Status */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            Pont Matter
          </CardTitle>
          <CardDescription>
            Exposez vos appareils MediaVault vers Apple Home, Google Home et Alexa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                config.matter.enabled ? "bg-blue-500/20" : "bg-muted"
              )}>
                <Cpu className={cn(
                  "w-5 h-5",
                  config.matter.enabled ? "text-blue-500" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="font-medium">Activer Matter Bridge</p>
                <p className="text-sm text-muted-foreground">
                  Créer un pont Matter pour exposer vos appareils
                </p>
              </div>
            </div>
            <Switch
              checked={config.matter.enabled}
              onCheckedChange={(enabled) => updateConfig('matter', { enabled })}
            />
          </div>

          {config.matter.enabled && (
            <>
              {/* Status & Controls */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    matterBridgeStatus === 'running' ? "bg-green-500 animate-pulse" :
                    matterBridgeStatus === 'starting' ? "bg-amber-500 animate-pulse" :
                    "bg-muted-foreground"
                  )} />
                  <div>
                    <p className={cn("font-medium", getStatusColor())}>{getStatusText()}</p>
                    <p className="text-sm text-muted-foreground">
                      Port {config.matter.bridgePort} • {exposedDevices.length} appareil(s) exposé(s)
                    </p>
                  </div>
                </div>
                
                {matterBridgeStatus === 'running' ? (
                  <Button variant="outline" onClick={stopMatterBridge}>
                    <Square className="w-4 h-4 mr-2" />
                    Arrêter
                  </Button>
                ) : matterBridgeStatus === 'starting' ? (
                  <Button disabled>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Démarrage...
                  </Button>
                ) : (
                  <Button onClick={handleStartBridge}>
                    <Play className="w-4 h-4 mr-2" />
                    Démarrer
                  </Button>
                )}
              </div>

              {/* Pairing Code */}
              {matterBridgeStatus === 'running' && pairingCode && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Code d'appairage Matter</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={copyPairingCode}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowQR(!showQR)}>
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-mono font-bold tracking-wider">
                      {pairingCode}
                    </div>
                    {showQR && (
                      <div className="p-4 bg-white rounded-lg">
                        <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                          QR Code
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <Badge variant="outline" className="gap-1.5">
                      {PLATFORM_ICONS.apple} Apple Home
                    </Badge>
                    <Badge variant="outline" className="gap-1.5">
                      {PLATFORM_ICONS.google} Google Home
                    </Badge>
                    <Badge variant="outline" className="gap-1.5">
                      {PLATFORM_ICONS.alexa} Alexa
                    </Badge>
                  </div>
                </div>
              )}

              {/* Port Configuration */}
              <div className="flex items-center gap-4">
                <Label htmlFor="matter-port">Port Matter</Label>
                <Input
                  id="matter-port"
                  type="number"
                  value={config.matter.bridgePort}
                  onChange={(e) => updateConfig('matter', { bridgePort: parseInt(e.target.value) })}
                  className="w-24"
                  disabled={matterBridgeStatus === 'running'}
                />
              </div>

              <Separator />

              {/* Exposed Devices */}
              <div>
                <h4 className="text-sm font-medium mb-3">Appareils exposés ({exposedDevices.length})</h4>
                
                {exposedDevices.length > 0 ? (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {exposedDevices.map(device => {
                        const Icon = CATEGORY_ICONS[device.category] || Power;
                        return (
                          <div 
                            key={device.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-500/20">
                                <Icon className="w-4 h-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{device.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {device.protocol} • {device.category}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unexposeMatterDevice(device.id)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cpu className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Aucun appareil exposé</p>
                    <p className="text-xs">Ajoutez des appareils ci-dessous</p>
                  </div>
                )}
              </div>

              {/* Available Devices to Expose */}
              {availableDevices.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Appareils disponibles ({availableDevices.length})</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {availableDevices.map(device => {
                        const Icon = CATEGORY_ICONS[device.category] || Power;
                        return (
                          <div 
                            key={device.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-muted">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{device.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {device.protocol} • {device.category}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exposeMatterDevice(device.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Exposer
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Platform Setup Guides */}
      {config.matter.enabled && matterBridgeStatus === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration des plateformes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{PLATFORM_ICONS.apple}</span>
                  <span className="font-medium">Apple Home</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. Ouvrez l'app Maison</li>
                  <li>2. Appuyez sur + → Ajouter accessoire</li>
                  <li>3. Scannez le QR code ou entrez le code</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{PLATFORM_ICONS.google}</span>
                  <span className="font-medium">Google Home</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. Ouvrez l'app Google Home</li>
                  <li>2. + → Configurer un appareil → Matter</li>
                  <li>3. Scannez le QR code ou entrez le code</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950 dark:to-gray-900 border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{PLATFORM_ICONS.alexa}</span>
                  <span className="font-medium">Amazon Alexa</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. Ouvrez l'app Alexa</li>
                  <li>2. Appareils → + → Ajouter appareil</li>
                  <li>3. Matter → Entrez le code</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
