import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bell, Volume2, Play, Zap, Radio, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationSoundType, playNotificationSound } from '@/components/UpdateProgressModal';
import { useRealtimeUpdateCheck } from '@/hooks/useRealtimeUpdateCheck';

export function NotificationsSettings() {
  const [notificationSound, setNotificationSound] = useState<NotificationSoundType>(() => 
    (localStorage.getItem('mediavault-notification-sound') as NotificationSoundType) || 'chime'
  );
  const [showSystemNotifications, setShowSystemNotifications] = useState(() => 
    localStorage.getItem('mediavault-show-system-notifications') !== 'false'
  );
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(() => 
    localStorage.getItem('mediavault-disable-auto-update-check') !== 'true'
  );
  const [realtimeCheckEnabled, setRealtimeCheckEnabled] = useState(() => 
    localStorage.getItem('mediavault-realtime-update-check') === 'true'
  );
  const [realtimeCheckInterval, setRealtimeCheckInterval] = useState(() => 
    parseInt(localStorage.getItem('mediavault-realtime-update-interval') || '60')
  );

  const { lastCheck: realtimeLastCheck, isChecking: isRealtimeChecking } = useRealtimeUpdateCheck({
    enabled: realtimeCheckEnabled,
    intervalSeconds: realtimeCheckInterval,
    onUpdateDetected: () => {}
  });

  const handleNotificationSoundChange = (value: NotificationSoundType) => {
    setNotificationSound(value);
    localStorage.setItem('mediavault-notification-sound', value);
  };

  const handleSystemNotificationsChange = (checked: boolean) => {
    setShowSystemNotifications(checked);
    localStorage.setItem('mediavault-show-system-notifications', checked.toString());
  };

  const handleAutoCheckChange = (checked: boolean) => {
    setAutoCheckEnabled(checked);
    if (checked) {
      localStorage.removeItem('mediavault-disable-auto-update-check');
    } else {
      localStorage.setItem('mediavault-disable-auto-update-check', 'true');
    }
  };

  const handleRealtimeCheckChange = (checked: boolean) => {
    setRealtimeCheckEnabled(checked);
    localStorage.setItem('mediavault-realtime-update-check', checked.toString());
  };

  const handleRealtimeIntervalChange = (value: string) => {
    const interval = parseInt(value);
    setRealtimeCheckInterval(interval);
    localStorage.setItem('mediavault-realtime-update-interval', value);
  };

  return (
    <div className="space-y-4">
      {/* Son de notification */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label className="text-sm font-medium">Son de notification</Label>
            <p className="text-xs text-muted-foreground">Son joué à la fin d'une mise à jour</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={notificationSound} onValueChange={(v) => handleNotificationSoundChange(v as NotificationSoundType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chime">Carillon</SelectItem>
              <SelectItem value="bell">Cloche</SelectItem>
              <SelectItem value="success">Fanfare</SelectItem>
              <SelectItem value="ping">Ping</SelectItem>
              <SelectItem value="none">Aucun</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-9 w-9"
            onClick={() => playNotificationSound(notificationSound)}
            disabled={notificationSound === 'none'}
          >
            <Play className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Notifications système */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label htmlFor="system-notif" className="text-sm font-medium cursor-pointer">Notifications système</Label>
            <p className="text-xs text-muted-foreground">Afficher une notification Windows/Mac après mise à jour</p>
          </div>
        </div>
        <Switch
          id="system-notif"
          checked={showSystemNotifications}
          onCheckedChange={handleSystemNotificationsChange}
        />
      </div>

      {/* Vérification automatique au démarrage */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label htmlFor="auto-update-check" className="text-sm font-medium cursor-pointer">
              Vérification automatique au démarrage
            </Label>
            <p className="text-xs text-muted-foreground">
              Affiche une notification si une mise à jour est disponible
            </p>
          </div>
        </div>
        <Switch
          id="auto-update-check"
          checked={autoCheckEnabled}
          onCheckedChange={handleAutoCheckChange}
        />
      </div>

      {/* Vérification en temps réel */}
      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className={cn("w-5 h-5", realtimeCheckEnabled && "text-primary animate-pulse")} />
            <div>
              <Label htmlFor="realtime-check" className="text-sm font-medium cursor-pointer">
                Vérification en temps réel
              </Label>
              <p className="text-xs text-muted-foreground">
                Vérifie périodiquement et notifie immédiatement
              </p>
            </div>
          </div>
          <Switch
            id="realtime-check"
            checked={realtimeCheckEnabled}
            onCheckedChange={handleRealtimeCheckChange}
          />
        </div>
        
        {realtimeCheckEnabled && (
          <div className="pt-2 border-t border-border/50 space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground flex-shrink-0">Intervalle :</Label>
              <Select value={realtimeCheckInterval.toString()} onValueChange={handleRealtimeIntervalChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 secondes</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isRealtimeChecking ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span>Vérification en cours...</span>
                </>
              ) : realtimeLastCheck ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Dernière vérif: {realtimeLastCheck.toLocaleTimeString('fr-FR')}</span>
                </>
              ) : (
                <span>En attente de la première vérification...</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
