import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  MessageCircle,
  Send,
  TestTube,
  CheckCircle,
  Image,
  Video,
  Music,
  Mic,
  Workflow
} from 'lucide-react';
import { useAINotifications } from '@/hooks/useAINotifications';
import { cn } from '@/lib/utils';

const NOTIFICATION_TYPES = [
  { id: 'image_generated', label: 'Image générée', icon: Image, color: 'text-purple-400' },
  { id: 'video_generated', label: 'Vidéo générée', icon: Video, color: 'text-blue-400' },
  { id: 'music_generated', label: 'Musique générée', icon: Music, color: 'text-pink-400' },
  { id: 'audio_transcribed', label: 'Audio transcrit', icon: Mic, color: 'text-sky-400' },
  { id: 'workflow_completed', label: 'Workflow terminé', icon: Workflow, color: 'text-green-400' },
];

export function WebhookNotifications() {
  const { config, updateConfig, testDiscord, testTelegram } = useAINotifications();

  return (
    <div className="space-y-6">
      {/* Discord Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#5865F2]" />
            Notifications Discord
          </CardTitle>
          <CardDescription>
            Recevez des alertes sur Discord quand les tâches IA sont terminées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div>
              <Label className="text-base font-medium">Activer Discord</Label>
              <p className="text-sm text-muted-foreground">
                Envoi automatique des notifications
              </p>
            </div>
            <Switch
              checked={config.discord.enabled}
              onCheckedChange={(checked) => 
                updateConfig({ discord: { ...config.discord, enabled: checked } })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>URL du Webhook Discord</Label>
            <Input
              value={config.discord.webhookUrl}
              onChange={(e) => 
                updateConfig({ discord: { ...config.discord, webhookUrl: e.target.value } })
              }
              placeholder="https://discord.com/api/webhooks/..."
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Créez un webhook dans Paramètres du canal → Intégrations → Webhooks
            </p>
          </div>

          {config.discord.enabled && config.discord.webhookUrl && (
            <Button variant="outline" onClick={testDiscord} className="gap-2">
              <TestTube className="w-4 h-4" />
              Tester Discord
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Telegram Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#0088cc]" />
            Notifications Telegram
          </CardTitle>
          <CardDescription>
            Recevez des alertes sur Telegram sur votre mobile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div>
              <Label className="text-base font-medium">Activer Telegram</Label>
              <p className="text-sm text-muted-foreground">
                Notifications push sur mobile
              </p>
            </div>
            <Switch
              checked={config.telegram.enabled}
              onCheckedChange={(checked) => 
                updateConfig({ telegram: { ...config.telegram, enabled: checked } })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Token du Bot</Label>
              <Input
                value={config.telegram.botToken}
                onChange={(e) => 
                  updateConfig({ telegram: { ...config.telegram, botToken: e.target.value } })
                }
                placeholder="123456789:ABCdefGHI..."
                type="password"
              />
            </div>
            <div className="space-y-2">
              <Label>Chat ID</Label>
              <Input
                value={config.telegram.chatId}
                onChange={(e) => 
                  updateConfig({ telegram: { ...config.telegram, chatId: e.target.value } })
                }
                placeholder="123456789"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Créez un bot avec @BotFather et obtenez votre Chat ID avec @userinfobot
          </p>

          {config.telegram.enabled && config.telegram.botToken && config.telegram.chatId && (
            <Button variant="outline" onClick={testTelegram} className="gap-2">
              <TestTube className="w-4 h-4" />
              Tester Telegram
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Types de notifications
          </CardTitle>
          <CardDescription>
            Événements qui déclencheront une notification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  (config.discord.enabled || config.telegram.enabled)
                    ? "bg-primary/5 border-primary/30"
                    : "bg-muted/30 border-border/50"
                )}
              >
                <type.icon className={cn("w-5 h-5", type.color)} />
                <span className="text-sm font-medium flex-1">{type.label}</span>
                {(config.discord.enabled || config.telegram.enabled) && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
            ))}
          </div>
          
          {!config.discord.enabled && !config.telegram.enabled && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Activez Discord ou Telegram pour recevoir ces notifications
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
