import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  Home, 
  Loader2, 
  CheckCircle,
  XCircle,
  Settings2,
  Mic,
  Image,
  Volume2,
  Lightbulb,
  Thermometer,
  Camera,
  Lock,
  Power,
  RefreshCw,
  Search,
  Zap,
  Sun,
  Moon,
  Wind,
  Droplets,
  Plus,
  Trash2,
  Play,
  Pause,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    brightness?: number;
    color_temp?: number;
    rgb_color?: [number, number, number];
    temperature?: number;
    humidity?: number;
    [key: string]: any;
  };
  last_changed: string;
  domain: string;
}

interface HARoom {
  id: string;
  name: string;
  icon: string;
  entities: string[];
}

interface HomeAssistantConfig {
  url: string;
  token: string;
  enabled: boolean;
  wakeWord: string;
  voiceResponse: boolean;
  autoDiscovery: boolean;
  rooms: HARoom[];
  automations: {
    imageGenOnCommand: boolean;
    notifyOnComplete: boolean;
    lightFeedback: boolean;
    morningRoutine: boolean;
    nightMode: boolean;
  };
}

interface HAStatus {
  connected: boolean;
  version: string;
  entityCount: number;
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  light: Lightbulb,
  switch: Power,
  sensor: Thermometer,
  camera: Camera,
  lock: Lock,
  climate: Wind,
  media_player: Play,
  cover: ChevronRight,
};

const DOMAIN_COLORS: Record<string, string> = {
  light: 'text-amber-400',
  switch: 'text-blue-400',
  sensor: 'text-green-400',
  camera: 'text-purple-400',
  lock: 'text-red-400',
  climate: 'text-cyan-400',
  media_player: 'text-pink-400',
  cover: 'text-orange-400',
};

export function HomeAutomationHub() {
  const [config, setConfig] = useState<HomeAssistantConfig>(() => {
    const saved = localStorage.getItem('mediavault-ha-config-v2');
    return saved ? JSON.parse(saved) : {
      url: 'http://homeassistant.local:8123',
      token: '',
      enabled: false,
      wakeWord: 'hey assistant',
      voiceResponse: true,
      autoDiscovery: true,
      rooms: [],
      automations: {
        imageGenOnCommand: true,
        notifyOnComplete: true,
        lightFeedback: false,
        morningRoutine: false,
        nightMode: false
      }
    };
  });

  const [status, setStatus] = useState<HAStatus>({
    connected: false,
    version: '',
    entityCount: 0
  });

  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // Save config
  useEffect(() => {
    localStorage.setItem('mediavault-ha-config-v2', JSON.stringify(config));
  }, [config]);

  const saveConfig = (updates: Partial<HomeAssistantConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleAutomation = (key: keyof HomeAssistantConfig['automations']) => {
    saveConfig({
      automations: { ...config.automations, [key]: !config.automations[key] }
    });
  };

  const connectHA = async () => {
    if (!config.url || !config.token) {
      toast.error('URL et token requis');
      return;
    }

    setIsConnecting(true);

    try {
      // Try to connect to Home Assistant
      const response = await fetch(`${config.url}/api/`, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Get all states
        const statesResponse = await fetch(`${config.url}/api/states`, {
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statesResponse.ok) {
          const statesData = await statesResponse.json();
          const parsedEntities: HAEntity[] = statesData.map((entity: any) => ({
            ...entity,
            domain: entity.entity_id.split('.')[0]
          }));
          
          setEntities(parsedEntities);
          setStatus({
            connected: true,
            version: data.version || 'Unknown',
            entityCount: parsedEntities.length
          });
          saveConfig({ enabled: true });
          toast.success(`Home Assistant ${data.version} connecté !`, {
            description: `${parsedEntities.length} entités découvertes`
          });
        }
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      toast.error('Erreur de connexion', {
        description: 'Vérifiez l\'URL et le token'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectHA = () => {
    setStatus({ connected: false, version: '', entityCount: 0 });
    setEntities([]);
    saveConfig({ enabled: false });
    toast.success('Déconnecté');
  };

  const discoverDevices = async () => {
    if (!status.connected) return;
    
    setIsDiscovering(true);
    
    try {
      const statesResponse = await fetch(`${config.url}/api/states`, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statesResponse.ok) {
        const statesData = await statesResponse.json();
        const parsedEntities: HAEntity[] = statesData.map((entity: any) => ({
          ...entity,
          domain: entity.entity_id.split('.')[0]
        }));
        
        setEntities(parsedEntities);
        setStatus(prev => ({ ...prev, entityCount: parsedEntities.length }));
        toast.success('Découverte terminée', {
          description: `${parsedEntities.length} entités trouvées`
        });
      }
    } catch (error) {
      toast.error('Erreur lors de la découverte');
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggleEntity = async (entity: HAEntity) => {
    if (!status.connected) return;
    
    const service = entity.state === 'on' ? 'turn_off' : 'turn_on';
    
    try {
      await fetch(`${config.url}/api/services/${entity.domain}/${service}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entity_id: entity.entity_id })
      });
      
      // Update local state
      setEntities(prev => prev.map(e => 
        e.entity_id === entity.entity_id 
          ? { ...e, state: e.state === 'on' ? 'off' : 'on' }
          : e
      ));
      
      toast.success(`${entity.attributes.friendly_name || entity.entity_id} ${service === 'turn_on' ? 'allumé' : 'éteint'}`);
    } catch (error) {
      toast.error('Erreur lors du contrôle');
    }
  };

  const setLightBrightness = async (entity: HAEntity, brightness: number) => {
    if (!status.connected) return;
    
    try {
      await fetch(`${config.url}/api/services/light/turn_on`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          entity_id: entity.entity_id,
          brightness: Math.round(brightness * 2.55) // Convert 0-100 to 0-255
        })
      });
      
      setEntities(prev => prev.map(e => 
        e.entity_id === entity.entity_id 
          ? { ...e, attributes: { ...e.attributes, brightness: Math.round(brightness * 2.55) } }
          : e
      ));
    } catch (error) {
      toast.error('Erreur lors du réglage');
    }
  };

  // Get unique domains
  const domains = [...new Set(entities.map(e => e.domain))].sort();
  
  // Filter entities
  const filteredEntities = entities.filter(entity => {
    const matchesSearch = !searchQuery || 
      entity.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entity.attributes.friendly_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDomain = !selectedDomain || entity.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  // Group by domain
  const entitiesByDomain = filteredEntities.reduce((acc, entity) => {
    if (!acc[entity.domain]) acc[entity.domain] = [];
    acc[entity.domain].push(entity);
    return acc;
  }, {} as Record<string, HAEntity[]>);

  return (
    <div className="space-y-6">
      {/* Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#41BDF5]" />
            MediaVault Home Hub
          </CardTitle>
          <CardDescription>
            Contrôlez votre maison intelligente directement depuis MediaVault
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className={cn(
            "p-4 rounded-lg border",
            status.connected 
              ? "bg-green-500/10 border-green-500/30"
              : "bg-muted/30 border-border/50"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {status.connected ? `Home Assistant ${status.version}` : 'Non connecté'}
                  </p>
                  {status.connected && (
                    <p className="text-xs text-muted-foreground">
                      {status.entityCount} entités • Connecté
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {status.connected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={discoverDevices}
                    disabled={isDiscovering}
                  >
                    {isDiscovering ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant={status.connected ? "destructive" : "default"}
                  onClick={status.connected ? disconnectHA : connectHA}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : status.connected ? (
                    'Déconnecter'
                  ) : (
                    'Connecter'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Configuration */}
          {!status.connected && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>URL de Home Assistant</Label>
                <Input
                  value={config.url}
                  onChange={(e) => saveConfig({ url: e.target.value })}
                  placeholder="http://homeassistant.local:8123"
                />
              </div>

              <div className="space-y-2">
                <Label>Token d'accès (Long-Lived Access Token)</Label>
                <Input
                  type="password"
                  value={config.token}
                  onChange={(e) => saveConfig({ token: e.target.value })}
                  placeholder="eyJ0eXAiOiJKV1Q..."
                />
                <p className="text-xs text-muted-foreground">
                  Créez un token dans Profil → Tokens d'accès longue durée
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entities & Controls */}
      {status.connected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Appareils & Entités</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-9 w-48"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Domain Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                size="sm"
                variant={selectedDomain === null ? 'default' : 'outline'}
                onClick={() => setSelectedDomain(null)}
              >
                Tous ({entities.length})
              </Button>
              {domains.map(domain => {
                const Icon = DOMAIN_ICONS[domain] || Power;
                const count = entities.filter(e => e.domain === domain).length;
                return (
                  <Button
                    key={domain}
                    size="sm"
                    variant={selectedDomain === domain ? 'default' : 'outline'}
                    onClick={() => setSelectedDomain(domain)}
                    className="gap-1.5"
                  >
                    <Icon className={cn("w-3.5 h-3.5", DOMAIN_COLORS[domain])} />
                    {domain} ({count})
                  </Button>
                );
              })}
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {Object.entries(entitiesByDomain).map(([domain, domainEntities]) => {
                  const Icon = DOMAIN_ICONS[domain] || Power;
                  return (
                    <div key={domain} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", DOMAIN_COLORS[domain])} />
                        <span className="text-sm font-medium capitalize">{domain}</span>
                        <Badge variant="outline" className="text-xs">
                          {domainEntities.length}
                        </Badge>
                      </div>
                      <div className="grid gap-2">
                        {domainEntities.map(entity => (
                          <EntityCard 
                            key={entity.entity_id}
                            entity={entity}
                            onToggle={() => toggleEntity(entity)}
                            onBrightness={(b) => setLightBrightness(entity, b)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Automations */}
      {status.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Automatisations MediaVault
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Image className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-sm font-medium">Génération image vocale</span>
                  <p className="text-xs text-muted-foreground">
                    "Hey assistant, génère une image de..."
                  </p>
                </div>
              </div>
              <Switch
                checked={config.automations.imageGenOnCommand}
                onCheckedChange={() => toggleAutomation('imageGenOnCommand')}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-green-400" />
                <div>
                  <span className="text-sm font-medium">Notification sonore</span>
                  <p className="text-xs text-muted-foreground">
                    Annonce vocale quand la génération est terminée
                  </p>
                </div>
              </div>
              <Switch
                checked={config.automations.notifyOnComplete}
                onCheckedChange={() => toggleAutomation('notifyOnComplete')}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-sm font-medium">Feedback lumineux</span>
                  <p className="text-xs text-muted-foreground">
                    Changement de couleur des lampes pendant la génération
                  </p>
                </div>
              </div>
              <Switch
                checked={config.automations.lightFeedback}
                onCheckedChange={() => toggleAutomation('lightFeedback')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-orange-400" />
                <div>
                  <span className="text-sm font-medium">Routine matinale</span>
                  <p className="text-xs text-muted-foreground">
                    Affiche le slideshow au réveil
                  </p>
                </div>
              </div>
              <Switch
                checked={config.automations.morningRoutine}
                onCheckedChange={() => toggleAutomation('morningRoutine')}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-sm font-medium">Mode nuit</span>
                  <p className="text-xs text-muted-foreground">
                    Active le thème sombre et baisse les lumières
                  </p>
                </div>
              </div>
              <Switch
                checked={config.automations.nightMode}
                onCheckedChange={() => toggleAutomation('nightMode')}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Entity Card Component
function EntityCard({ 
  entity, 
  onToggle,
  onBrightness
}: { 
  entity: HAEntity;
  onToggle: () => void;
  onBrightness?: (brightness: number) => void;
}) {
  const Icon = DOMAIN_ICONS[entity.domain] || Power;
  const isOn = entity.state === 'on';
  const brightness = entity.attributes.brightness 
    ? Math.round(entity.attributes.brightness / 2.55) 
    : null;
  
  const isControllable = ['light', 'switch', 'cover', 'fan'].includes(entity.domain);
  const hasBrightness = entity.domain === 'light' && isOn;

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      isOn ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "p-2 rounded-lg",
            isOn ? "bg-primary/20" : "bg-muted"
          )}>
            <Icon className={cn(
              "w-4 h-4",
              isOn ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {entity.attributes.friendly_name || entity.entity_id}
            </p>
            <p className="text-xs text-muted-foreground">
              {entity.state}
              {brightness !== null && ` • ${brightness}%`}
              {entity.attributes.temperature !== undefined && 
                ` • ${entity.attributes.temperature}°C`}
            </p>
          </div>
        </div>
        
        {isControllable && (
          <Switch
            checked={isOn}
            onCheckedChange={onToggle}
          />
        )}
      </div>

      {hasBrightness && onBrightness && (
        <div className="mt-3 px-2">
          <Slider
            value={[brightness || 0]}
            onValueChange={([v]) => onBrightness(v)}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
