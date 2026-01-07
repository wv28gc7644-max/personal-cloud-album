import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  Loader2, 
  CheckCircle,
  XCircle,
  Settings2,
  Image,
  MessageSquare,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TelegramConfig {
  botToken: string;
  allowedUsers: string[];
  enabled: boolean;
  commands: {
    generate: boolean;
    upscale: boolean;
    chat: boolean;
    voice: boolean;
  };
}

interface BotStatus {
  connected: boolean;
  username: string;
  lastUpdate?: string;
}

export const TelegramIntegration = () => {
  const [config, setConfig] = useState<TelegramConfig>(() => {
    const saved = localStorage.getItem('mediavault-telegram-config');
    return saved ? JSON.parse(saved) : {
      botToken: '',
      allowedUsers: [],
      enabled: false,
      commands: {
        generate: true,
        upscale: true,
        chat: true,
        voice: true
      }
    };
  });
  const [status, setStatus] = useState<BotStatus>({
    connected: false,
    username: ''
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [newUser, setNewUser] = useState('');

  const saveConfig = (updates: Partial<TelegramConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('mediavault-telegram-config', JSON.stringify(newConfig));
  };

  const toggleCommand = (cmd: keyof TelegramConfig['commands']) => {
    saveConfig({
      commands: { ...config.commands, [cmd]: !config.commands[cmd] }
    });
  };

  const addUser = () => {
    if (!newUser.trim()) return;
    if (config.allowedUsers.includes(newUser)) {
      toast.error('Utilisateur déjà ajouté');
      return;
    }
    saveConfig({ allowedUsers: [...config.allowedUsers, newUser] });
    setNewUser('');
    toast.success('Utilisateur ajouté');
  };

  const removeUser = (user: string) => {
    saveConfig({ allowedUsers: config.allowedUsers.filter(u => u !== user) });
  };

  const connectBot = async () => {
    if (!config.botToken) {
      toast.error('Token du bot requis');
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch('http://localhost:3001/api/integrations/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.botToken,
          allowedUsers: config.allowedUsers,
          commands: config.commands
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          connected: true,
          username: data.username
        });
        saveConfig({ enabled: true });
        toast.success('Bot Telegram connecté !');
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
      await fetch('http://localhost:3001/api/integrations/telegram/disconnect', {
        method: 'POST'
      });
      setStatus({ connected: false, username: '' });
      saveConfig({ enabled: false });
      toast.success('Bot déconnecté');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5 text-[#0088cc]" />
          Intégration Telegram
        </CardTitle>
        <CardDescription>
          Contrôlez l'IA depuis Telegram sur mobile
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
                  {status.connected ? `@${status.username}` : 'Non connecté'}
                </p>
                {status.connected && (
                  <p className="text-xs text-muted-foreground">
                    En attente de messages...
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
            <Label>Token du Bot Telegram</Label>
            <Input
              type="password"
              value={config.botToken}
              onChange={(e) => saveConfig({ botToken: e.target.value })}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
            <p className="text-xs text-muted-foreground">
              Créez un bot avec{' '}
              <a 
                href="https://t.me/BotFather" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @BotFather
              </a>
            </p>
          </div>
        </div>

        {/* Allowed Users */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <Label>Utilisateurs autorisés</Label>
          <div className="flex gap-2">
            <Input
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              placeholder="@username ou ID"
              onKeyDown={(e) => e.key === 'Enter' && addUser()}
            />
            <Button onClick={addUser}>Ajouter</Button>
          </div>
          
          {config.allowedUsers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {config.allowedUsers.map(user => (
                <Badge
                  key={user}
                  variant="secondary"
                  className="gap-1"
                >
                  {user}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => removeUser(user)}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Laissez vide pour autoriser tout le monde (non recommandé)
            </p>
          )}
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
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-sm">/chat</span>
              </div>
              <Switch
                checked={config.commands.chat}
                onCheckedChange={() => toggleCommand('chat')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded border border-border/50">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="text-sm">/voice</span>
              </div>
              <Switch
                checked={config.commands.voice}
                onCheckedChange={() => toggleCommand('voice')}
              />
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        {status.connected && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium mb-2">Exemples d'utilisation :</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><code>/generate un chat orange dans l'espace</code></li>
              <li><code>/chat Explique-moi la relativité</code></li>
              <li><code>/upscale</code> + envoyer une image</li>
              <li>Envoyer un message vocal pour transcription</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
