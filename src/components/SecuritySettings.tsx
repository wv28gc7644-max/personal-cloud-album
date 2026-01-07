import { useState, useEffect } from 'react';
import { Shield, Clock, LogOut, Key, Smartphone, History, AlertTriangle, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export const SecuritySettings = () => {
  const { user, signOut } = useAuth();
  
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(() => 
    localStorage.getItem('mediavault-auto-logout') === 'true'
  );
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(() => 
    localStorage.getItem('mediavault-auto-logout-minutes') || '30'
  );
  const [logoutOnClose, setLogoutOnClose] = useState(() => 
    localStorage.getItem('mediavault-logout-on-close') === 'true'
  );
  const [requireAuthOnStartup, setRequireAuthOnStartup] = useState(() => 
    localStorage.getItem('mediavault-require-auth-startup') !== 'false'
  );

  // Session activity tracking
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [sessionStart] = useState<Date>(() => {
    const stored = localStorage.getItem('mediavault-session-start');
    return stored ? new Date(stored) : new Date();
  });

  // Update last activity on user interaction
  useEffect(() => {
    const updateActivity = () => setLastActivity(new Date());
    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));
    
    // Store session start
    if (!localStorage.getItem('mediavault-session-start')) {
      localStorage.setItem('mediavault-session-start', new Date().toISOString());
    }
    
    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, []);

  // Auto logout timer
  useEffect(() => {
    if (!autoLogoutEnabled || !user) return;
    
    const checkInactivity = () => {
      const now = new Date();
      const diffMinutes = (now.getTime() - lastActivity.getTime()) / 60000;
      
      if (diffMinutes >= parseInt(autoLogoutMinutes)) {
        toast.warning('Session expirée', { description: 'Déconnexion pour inactivité' });
        signOut();
      }
    };
    
    const interval = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [autoLogoutEnabled, autoLogoutMinutes, lastActivity, user, signOut]);

  // Logout on close
  useEffect(() => {
    if (!logoutOnClose || !user) return;
    
    const handleBeforeUnload = () => {
      // Clear session
      localStorage.removeItem('mediavault-session-start');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [logoutOnClose, user]);

  const handleAutoLogoutChange = (checked: boolean) => {
    setAutoLogoutEnabled(checked);
    localStorage.setItem('mediavault-auto-logout', checked.toString());
    toast.success(checked ? 'Auto-déconnexion activée' : 'Auto-déconnexion désactivée');
  };

  const handleAutoLogoutMinutesChange = (value: string) => {
    setAutoLogoutMinutes(value);
    localStorage.setItem('mediavault-auto-logout-minutes', value);
  };

  const handleLogoutOnCloseChange = (checked: boolean) => {
    setLogoutOnClose(checked);
    localStorage.setItem('mediavault-logout-on-close', checked.toString());
    toast.success(checked ? 'Déconnexion à la fermeture activée' : 'Session persistante activée');
  };

  const handleRequireAuthChange = (checked: boolean) => {
    setRequireAuthOnStartup(checked);
    localStorage.setItem('mediavault-require-auth-startup', checked.toString());
  };

  const formatDuration = (start: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}min`;
    }
    return `${diffMins}min`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Sécurité et sessions
        </CardTitle>
        <CardDescription>
          Gérez la sécurité de votre instance MediaVault
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Session Info */}
        {user && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="w-4 h-4 text-primary" />
              Session actuelle
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Connecté depuis :</span>
                <p className="font-mono">{formatDuration(sessionStart)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Dernière activité :</span>
                <p className="font-mono">{lastActivity.toLocaleTimeString('fr-FR')}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Auto Logout Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label htmlFor="auto-logout" className="text-sm font-medium cursor-pointer">
                  Auto-déconnexion après inactivité
                </Label>
                <p className="text-xs text-muted-foreground">
                  Déconnexion automatique après une période d'inactivité
                </p>
              </div>
            </div>
            <Switch
              id="auto-logout"
              checked={autoLogoutEnabled}
              onCheckedChange={handleAutoLogoutChange}
            />
          </div>

          {autoLogoutEnabled && (
            <div className="ml-8 pl-4 border-l-2 border-primary/30 space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground flex-shrink-0">Délai :</Label>
                <Select value={autoLogoutMinutes} onValueChange={handleAutoLogoutMinutesChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                    <SelectItem value="480">8 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Logout on close */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="logout-close" className="text-sm font-medium cursor-pointer">
                Déconnexion à la fermeture
              </Label>
              <p className="text-xs text-muted-foreground">
                Se déconnecter automatiquement en fermant le navigateur
              </p>
            </div>
          </div>
          <Switch
            id="logout-close"
            checked={logoutOnClose}
            onCheckedChange={handleLogoutOnCloseChange}
          />
        </div>

        {/* Require auth on startup */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="require-auth" className="text-sm font-medium cursor-pointer">
                Authentification requise au démarrage
              </Label>
              <p className="text-xs text-muted-foreground">
                Demander une connexion à chaque démarrage de l'application
              </p>
            </div>
          </div>
          <Switch
            id="require-auth"
            checked={requireAuthOnStartup}
            onCheckedChange={handleRequireAuthChange}
          />
        </div>

        <Separator />

        {/* Security Tips */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            Conseils de sécurité
          </div>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
              <span>Utilisez un mot de passe fort avec au moins 12 caractères</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
              <span>Activez l'auto-déconnexion si vous utilisez un PC partagé</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
              <span>Gardez votre serveur local accessible uniquement en réseau privé</span>
            </li>
          </ul>
        </div>

        {/* Logout Button */}
        {user && (
          <Button 
            variant="destructive" 
            onClick={() => signOut()}
            className="w-full gap-2"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter maintenant
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
