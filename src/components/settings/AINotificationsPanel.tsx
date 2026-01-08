import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Monitor,
  Check,
  X,
  Trash2,
  Sparkles,
  Image,
  Video,
  Music,
  Mic,
  Zap,
  RefreshCw,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIPushNotifications, AIEventType, AIEvent } from '@/hooks/useAIPushNotifications';
import { toast } from 'sonner';

const EVENT_TYPE_CONFIG: Record<AIEventType, { 
  label: string; 
  icon: React.ElementType;
  color: string;
}> = {
  generation_started: { label: 'Génération démarrée', icon: Sparkles, color: 'text-blue-500' },
  generation_progress: { label: 'Progression', icon: RefreshCw, color: 'text-blue-400' },
  generation_completed: { label: 'Génération terminée', icon: Check, color: 'text-green-500' },
  generation_failed: { label: 'Génération échouée', icon: X, color: 'text-red-500' },
  transcription_completed: { label: 'Transcription terminée', icon: Mic, color: 'text-purple-500' },
  upscale_completed: { label: 'Upscale terminé', icon: Image, color: 'text-cyan-500' },
  workflow_started: { label: 'Workflow démarré', icon: Zap, color: 'text-amber-500' },
  workflow_completed: { label: 'Workflow terminé', icon: Zap, color: 'text-green-500' },
  workflow_failed: { label: 'Workflow échoué', icon: AlertTriangle, color: 'text-red-500' },
  model_loaded: { label: 'Modèle chargé', icon: RefreshCw, color: 'text-blue-500' },
  model_unloaded: { label: 'Modèle déchargé', icon: RefreshCw, color: 'text-gray-500' },
  queue_updated: { label: 'File d\'attente', icon: Clock, color: 'text-amber-400' },
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export function AINotificationsPanel() {
  const {
    config,
    events,
    unreadCount,
    updateConfig,
    toggleEventFilter,
    markAsRead,
    markAllAsRead,
    clearEvents,
    requestBrowserPermission,
    emitEvent,
  } = useAIPushNotifications();

  const [showFilters, setShowFilters] = useState(false);

  const handleTestNotification = () => {
    emitEvent({
      type: 'generation_completed',
      title: 'Test de notification',
      message: 'Ceci est une notification de test pour vérifier que tout fonctionne correctement.',
      metadata: {
        model: 'test-model',
        duration: 5.2,
      },
    });
  };

  const getEventIcon = (type: AIEventType) => {
    const config = EVENT_TYPE_CONFIG[type];
    if (!config) return <Bell className="w-4 h-4" />;
    const Icon = config.icon;
    return <Icon className={cn("w-4 h-4", config.color)} />;
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5" />
            Notifications IA en temps réel
          </CardTitle>
          <CardDescription>
            Recevez des notifications pour les événements IA (génération, transcription, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Activer les notifications</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des alertes pour les événements IA
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
            />
          </div>

          <Separator />

          {/* Notification methods */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Méthodes de notification</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {config.soundEnabled ? 
                    <Volume2 className="w-4 h-4 text-primary" /> : 
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  }
                  <span className="text-sm">Son de notification</span>
                </div>
                <Switch
                  checked={config.soundEnabled}
                  onCheckedChange={(soundEnabled) => updateConfig({ soundEnabled })}
                  disabled={!config.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className={cn("w-4 h-4", config.showToast ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm">Toast dans l'application</span>
                </div>
                <Switch
                  checked={config.showToast}
                  onCheckedChange={(showToast) => updateConfig({ showToast })}
                  disabled={!config.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className={cn("w-4 h-4", config.browserNotifications ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm">Notifications du navigateur</span>
                </div>
                {config.browserNotifications ? (
                  <Switch
                    checked={config.browserNotifications}
                    onCheckedChange={(browserNotifications) => updateConfig({ browserNotifications })}
                    disabled={!config.enabled}
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={requestBrowserPermission}
                    disabled={!config.enabled}
                  >
                    Autoriser
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Event filters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Types d'événements</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Masquer' : 'Afficher'} les filtres
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(EVENT_TYPE_CONFIG).map(([type, typeConfig]) => (
                  <div
                    key={type}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                      config.eventFilters[type as AIEventType] 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-muted/30 border-border"
                    )}
                    onClick={() => toggleEventFilter(type as AIEventType)}
                  >
                    <typeConfig.icon className={cn("w-4 h-4", typeConfig.color)} />
                    <span className="text-xs flex-1">{typeConfig.label}</span>
                    {config.eventFilters[type as AIEventType] && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Test button */}
          <Button onClick={handleTestNotification} className="w-full" disabled={!config.enabled}>
            <Sparkles className="w-4 h-4 mr-2" />
            Tester les notifications
          </Button>
        </CardContent>
      </Card>

      {/* Events history */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Historique des événements
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Derniers événements IA reçus
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button size="sm" variant="outline" onClick={markAllAsRead}>
                  <Check className="w-3 h-3 mr-1" />
                  Tout lire
                </Button>
              )}
              {events.length > 0 && (
                <Button size="sm" variant="outline" onClick={clearEvents}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Effacer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">Aucun événement</p>
                <p className="text-xs mt-1">Les notifications IA apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                      !event.read ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
                    )}
                    onClick={() => markAsRead(event.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm", !event.read && "font-medium")}>
                          {event.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.message}
                      </p>
                      {event.metadata && (
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {event.metadata.model && (
                            <Badge variant="outline" className="text-xs h-5">
                              {event.metadata.model}
                            </Badge>
                          )}
                          {event.metadata.duration && (
                            <Badge variant="outline" className="text-xs h-5">
                              {event.metadata.duration.toFixed(1)}s
                            </Badge>
                          )}
                          {event.progress !== undefined && (
                            <Badge variant="outline" className="text-xs h-5">
                              {event.progress}%
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
