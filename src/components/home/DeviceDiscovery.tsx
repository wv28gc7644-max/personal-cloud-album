import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Wifi, 
  WifiOff,
  Plus,
  RefreshCw,
  Cpu,
  Camera,
  Lightbulb,
  Thermometer,
  Power,
  Zap,
  Home as HomeIcon,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DiscoveredDevice {
  id: string;
  name: string;
  type: 'matter' | 'tuya' | 'reolink' | 'homeassistant';
  category: 'light' | 'switch' | 'sensor' | 'camera' | 'climate' | 'energy' | 'other';
  ip?: string;
  model?: string;
  firmware?: string;
  online: boolean;
  capabilities?: string[];
  rawData?: any;
}

interface DiscoveryStatus {
  isScanning: boolean;
  progress: number;
  currentProtocol: string;
  devicesFound: number;
}

const PROTOCOL_ICONS = {
  matter: Cpu,
  tuya: Lightbulb,
  reolink: Camera,
  homeassistant: HomeIcon,
};

const PROTOCOL_COLORS = {
  matter: 'text-blue-500',
  tuya: 'text-orange-500',
  reolink: 'text-purple-500',
  homeassistant: 'text-cyan-500',
};

const CATEGORY_ICONS = {
  light: Lightbulb,
  switch: Power,
  sensor: Thermometer,
  camera: Camera,
  climate: Thermometer,
  energy: Zap,
  other: Cpu,
};

export function DeviceDiscovery() {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [status, setStatus] = useState<DiscoveryStatus>({
    isScanning: false,
    progress: 0,
    currentProtocol: '',
    devicesFound: 0,
  });
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  const simulateDiscovery = useCallback(async () => {
    setStatus({ isScanning: true, progress: 0, currentProtocol: 'Matter', devicesFound: 0 });
    setDevices([]);

    // Simulate Matter discovery
    await new Promise(r => setTimeout(r, 800));
    setStatus(s => ({ ...s, progress: 15, currentProtocol: 'Matter' }));
    
    const matterDevices: DiscoveredDevice[] = [
      { id: 'matter-1', name: 'Thread Light Bulb', type: 'matter', category: 'light', online: true, model: 'Matter Thread' },
      { id: 'matter-2', name: 'Matter Bridge', type: 'matter', category: 'other', online: true, model: 'Eve Energy' },
    ];
    setDevices(d => [...d, ...matterDevices]);
    setStatus(s => ({ ...s, devicesFound: s.devicesFound + 2 }));

    // Simulate Tuya discovery
    await new Promise(r => setTimeout(r, 1000));
    setStatus(s => ({ ...s, progress: 45, currentProtocol: 'Tuya Smart' }));
    
    const tuyaDevices: DiscoveredDevice[] = [
      { id: 'tuya-1', name: 'Smart Plug Energy', type: 'tuya', category: 'energy', ip: '192.168.1.101', online: true, model: 'BK7231T', capabilities: ['on_off', 'energy_monitoring'] },
      { id: 'tuya-2', name: 'RGB LED Strip', type: 'tuya', category: 'light', ip: '192.168.1.102', online: true, model: 'WB3S' },
      { id: 'tuya-3', name: 'Temperature Sensor', type: 'tuya', category: 'sensor', ip: '192.168.1.103', online: true, model: 'ZigBee' },
      { id: 'tuya-4', name: 'Smart Switch 3-Gang', type: 'tuya', category: 'switch', ip: '192.168.1.104', online: false, model: 'CB2S' },
    ];
    setDevices(d => [...d, ...tuyaDevices]);
    setStatus(s => ({ ...s, devicesFound: s.devicesFound + 4 }));

    // Simulate Reolink discovery
    await new Promise(r => setTimeout(r, 800));
    setStatus(s => ({ ...s, progress: 75, currentProtocol: 'Reolink ONVIF' }));
    
    const reolinkDevices: DiscoveredDevice[] = [
      { id: 'reolink-1', name: 'RLC-510A', type: 'reolink', category: 'camera', ip: '192.168.1.201', online: true, model: 'RLC-510A', firmware: 'v3.1.0.2347' },
      { id: 'reolink-2', name: 'E1 Zoom', type: 'reolink', category: 'camera', ip: '192.168.1.202', online: true, model: 'E1 Zoom', firmware: 'v3.0.0.660' },
    ];
    setDevices(d => [...d, ...reolinkDevices]);
    setStatus(s => ({ ...s, devicesFound: s.devicesFound + 2 }));

    // Complete
    await new Promise(r => setTimeout(r, 500));
    setStatus(s => ({ ...s, isScanning: false, progress: 100, currentProtocol: '' }));
    toast.success('Découverte terminée', { description: `${devices.length + 8} appareils trouvés` });
  }, []);

  const toggleDeviceSelection = (id: string) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedDevices = () => {
    const count = selectedDevices.size;
    if (count === 0) {
      toast.error('Sélectionnez au moins un appareil');
      return;
    }
    toast.success(`${count} appareil(s) ajouté(s)`, {
      description: 'Les widgets ont été créés automatiquement'
    });
    setSelectedDevices(new Set());
  };

  // Group devices by type
  const devicesByType = devices.reduce((acc, device) => {
    if (!acc[device.type]) acc[device.type] = [];
    acc[device.type].push(device);
    return acc;
  }, {} as Record<string, DiscoveredDevice[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Découverte automatique
        </CardTitle>
        <CardDescription>
          Détecte les appareils Matter, Tuya et Reolink sur votre réseau
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan Button & Status */}
        <div className="flex items-center gap-4">
          <Button
            onClick={simulateDiscovery}
            disabled={status.isScanning}
            className="flex-shrink-0"
          >
            {status.isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recherche...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Lancer la découverte
              </>
            )}
          </Button>

          {status.isScanning && (
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status.currentProtocol}</span>
                <span className="font-medium">{status.devicesFound} trouvés</span>
              </div>
              <Progress value={status.progress} className="h-2" />
            </div>
          )}
        </div>

        {/* Protocol Support Info */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PROTOCOL_ICONS).map(([protocol, Icon]) => (
            <Badge key={protocol} variant="outline" className="gap-1.5">
              <Icon className={cn("w-3 h-3", PROTOCOL_COLORS[protocol as keyof typeof PROTOCOL_COLORS])} />
              {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
            </Badge>
          ))}
        </div>

        <Separator />

        {/* Device List */}
        {devices.length > 0 ? (
          <>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {Object.entries(devicesByType).map(([type, typeDevices]) => {
                  const ProtocolIcon = PROTOCOL_ICONS[type as keyof typeof PROTOCOL_ICONS] || Cpu;
                  const protocolColor = PROTOCOL_COLORS[type as keyof typeof PROTOCOL_COLORS] || 'text-gray-500';
                  
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ProtocolIcon className={cn("w-4 h-4", protocolColor)} />
                        <span className="text-sm font-medium capitalize">{type}</span>
                        <Badge variant="secondary" className="text-xs">
                          {typeDevices.length}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2">
                        {typeDevices.map(device => {
                          const CategoryIcon = CATEGORY_ICONS[device.category] || Cpu;
                          const isSelected = selectedDevices.has(device.id);
                          
                          return (
                            <div
                              key={device.id}
                              onClick={() => toggleDeviceSelection(device.id)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                isSelected 
                                  ? "bg-primary/10 border-primary" 
                                  : "bg-muted/30 border-border hover:border-primary/50"
                              )}
                            >
                              <div className={cn(
                                "p-2 rounded-lg",
                                device.online ? "bg-green-500/20" : "bg-muted"
                              )}>
                                <CategoryIcon className={cn(
                                  "w-4 h-4",
                                  device.online ? "text-green-500" : "text-muted-foreground"
                                )} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{device.name}</p>
                                  {device.online ? (
                                    <Wifi className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <WifiOff className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {device.model}
                                  {device.ip && ` • ${device.ip}`}
                                </p>
                              </div>

                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                              )}>
                                {isSelected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Add Selected Button */}
            {selectedDevices.size > 0 && (
              <Button onClick={addSelectedDevices} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter {selectedDevices.size} appareil(s)
              </Button>
            )}
          </>
        ) : (
          !status.isScanning && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Aucun appareil découvert</p>
              <p className="text-xs mt-1">Lancez une découverte pour trouver vos appareils</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
