import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Bot, 
  Loader2, 
  CheckCircle,
  XCircle,
  Settings2,
  Send,
  Image,
  Video,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DiscordConfig {
  botToken: string;
  guildId: string;
  channelId: string;
  enabled: boolean;
  commands: {
    generate: boolean;
    upscale: boolean;
    chat: boolean;
    search: boolean;
  };
}

interface BotStatus {
  connected: boolean;
  username: string;
  guilds: number;
  lastMessage?: string;
}

export const DiscordIntegration = () => {
  const [config, setConfig] = useState<DiscordConfig>(() => {
    const saved = localStorage.getItem('mediavault-discord-config');
    return saved ? JSON.parse(saved) : {
      botToken: '',
      guildId: '',
      channelId: '',
      enabled: false,
      commands: {
        generate: true,
        upscale: true,
        chat: true,
        search: true
      }
    };
  });
  const [status, setStatus] = useState<BotStatus>({
    connected: false,
    username: '',
    guilds: 0
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  const saveConfig = (updates: Partial<DiscordConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('mediavault-discord-config', JSON.stringify(newConfig));
  };

  const toggleCommand = (cmd: keyof DiscordConfig['commands']) => {
    saveConfig({
      commands: { ...config.commands, [cmd]: !config.commands[cmd] }
    });
  };

  const connectBot = async () => {
    if (!config.botToken) {
      toast.error('Token du bot requis');
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch('http://localhost:3001/api/integrations/discord/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.botToken,
          guildId: config.guildId,
          commands: config.commands
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          connected: true,
          username: data.username,
          guilds: data.guilds
        });
        saveConfig({ enabled: true });
        toast.success('Bot Discord connecté !');
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      toast.error('Erreur de connexion', {
        description: 'Vérifiez le token et que le serveur est démarré'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectBot = async () => {
    try {
      await fetch('http://localhost:3001/api/integrations/discord/disconnect', {
        method: 'POST'
      });
      setStatus({ connected: false, username: '', guilds: 0 });
      saveConfig({ enabled: false });
      toast.success('Bot déconnecté');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const sendTestMessage = async () => {
    if (!testMessage.trim()) return;

    try {
      await fetch('http://localhost:3001/api/integrations/discord/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: config.channelId,
          message: testMessage
        })
      });
      toast.success('Message envoyé !');
      setTestMessage('');
    } catch (error) {
      toast.error('Erreur d\'envoi');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[#5865F2]" />
          Intégration Discord
        </CardTitle>
        <CardDescription>
          Contrôlez l'IA depuis Discord avec des commandes slash
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
                  {status.connected ? `Connecté: ${status.username}` : 'Non connecté'}
                </p>
                {status.connected && (
                  <p className="text-xs text-muted-foreground">
                    {status.guilds} serveur(s)
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={status.connected ? "destructive" : "default"}
              onClick={status.connected ? disconnectBot : connectBot}
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
            <Label>Token du Bot Discord</Label>
            <Input
              type="password"
              value={config.botToken}
              onChange={(e) => saveConfig({ botToken: e.target.value })}
              placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ..."
            />
            <p className="text-xs text-muted-foreground">
              Créez un bot sur{' '}
              <a 
                href="https://discord.com/developers/applications" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Discord Developer Portal
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ID du Serveur (Guild)</Label>
              <Input
                value={config.guildId}
                onChange={(e) => saveConfig({ guildId: e.target.value })}
                placeholder="123456789012345678"
              />
            </div>
            <div className="space-y-2">
              <Label>ID du Canal (optionnel)</Label>
              <Input
                value={config.channelId}
                onChange={(e) => saveConfig({ channelId: e.target.value })}
                placeholder="123456789012345678"
              />
            </div>
          </div>
        </div>

        {/* Commands */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="w-4 h-4" />
            Commandes disponibles
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-purple-400" />
                <span className="text-sm">/generate</span>
              </div>
              <Switch
                checked={config.commands.generate}
                onCheckedChange={() => toggleCommand('generate')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-sky-400" />
                <span className="text-sm">/upscale</span>
              </div>
              <Switch
                checked={config.commands.upscale}
                onCheckedChange={() => toggleCommand('upscale')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-green-400" />
                <span className="text-sm">/chat</span>
              </div>
              <Switch
                checked={config.commands.chat}
                onCheckedChange={() => toggleCommand('chat')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-amber-400" />
                <span className="text-sm">/search</span>
              </div>
              <Switch
                checked={config.commands.search}
                onCheckedChange={() => toggleCommand('search')}
              />
            </div>
          </div>
        </div>

        {/* Test Message */}
        {status.connected && config.channelId && (
          <div className="space-y-2">
            <Label>Envoyer un message test</Label>
            <div className="flex gap-2">
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Message à envoyer..."
                onKeyDown={(e) => e.key === 'Enter' && sendTestMessage()}
              />
              <Button onClick={sendTestMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
