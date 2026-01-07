import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Loader2, 
  CheckCircle,
  XCircle,
  Settings2,
  Mic,
  Image,
  Volume2,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HomeAssistantConfig {
  url: string;
  token: string;
  enabled: boolean;
  wakeWord: string;
  voiceResponse: boolean;
  automations: {
    imageGenOnCommand: boolean;
    notifyOnComplete: boolean;
    lightFeedback: boolean;
  };
}

interface HAStatus {
  connected: boolean;
  version: string;
  entities: number;
}

export const HomeAssistantIntegration = () => {
  const [config, setConfig] = useState<HomeAssistantConfig>(() => {
    const saved = localStorage.getItem('mediavault-ha-config');
    return saved ? JSON.parse(saved) : {
      url: 'http://homeassistant.local:8123',
      token: '',
      enabled: false,
      wakeWord: 'hey assistant',
      voiceResponse: true,
      automations: {
        imageGenOnCommand: true,
        notifyOnComplete: true,
        lightFeedback: false
      }
    };
  });
  const [status, setStatus] = useState<HAStatus>({
    connected: false,
    version: '',
    entities: 0
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const saveConfig = (updates: Partial<HomeAssistantConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('mediavault-ha-config', JSON.stringify(newConfig));
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
      const response = await fetch('http://localhost:3001/api/integrations/homeassistant/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.url,
          token: config.token
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          connected: true,
          version: data.version,
          entities: data.entities
        });
        saveConfig({ enabled: true });
        toast.success('Home Assistant connecté !');
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

  const disconnectHA = async () => {
    try {
      await fetch('http://localhost:3001/api/integrations/homeassistant/disconnect', {
        method: 'POST'
      });
      setStatus({ connected: false, version: '', entities: 0 });
      saveConfig({ enabled: false });
      toast.success('Déconnecté');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5 text-[#41BDF5]" />
          Intégration Home Assistant
        </CardTitle>
        <CardDescription>
          Commandes vocales domotique + IA depuis votre maison
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
                    {status.entities} entités disponibles
                  </p>
                )}
              </div>
            </div>
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

        {/* Configuration */}
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

        {/* Voice Settings */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mic className="w-4 h-4" />
            Paramètres vocaux
          </div>

          <div className="space-y-2">
            <Label>Mot de réveil</Label>
            <Input
              value={config.wakeWord}
              onChange={(e) => saveConfig({ wakeWord: e.target.value })}
              placeholder="hey assistant"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Réponse vocale</span>
            </div>
            <Switch
              checked={config.voiceResponse}
              onCheckedChange={(v) => saveConfig({ voiceResponse: v })}
            />
          </div>
        </div>

        {/* Automations */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="w-4 h-4" />
            Automatisations
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Génération image sur commande vocale</span>
              </div>
              <Switch
                checked={config.automations.imageGenOnCommand}
                onCheckedChange={() => toggleAutomation('imageGenOnCommand')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-400" />
                <span className="text-sm">Notification sonore à la fin</span>
              </div>
              <Switch
                checked={config.automations.notifyOnComplete}
                onCheckedChange={() => toggleAutomation('notifyOnComplete')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-sm">Feedback lumineux (lampes)</span>
              </div>
              <Switch
                checked={config.automations.lightFeedback}
                onCheckedChange={() => toggleAutomation('lightFeedback')}
              />
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        {status.connected && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium mb-2">Exemples de commandes vocales :</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>"Hey assistant, génère une image de montagne enneigée"</li>
              <li>"Hey assistant, transcris ce que je dis"</li>
              <li>"Hey assistant, upscale la dernière image"</li>
              <li>"Hey assistant, raconte-moi une histoire"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
