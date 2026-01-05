import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, Loader2, Download, Archive, RotateCcw, CheckCircle2, Play, GitCommit, Volume2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Sound types
export type NotificationSoundType = 'chime' | 'bell' | 'success' | 'ping' | 'none';

// Play notification sound based on type
export const playNotificationSound = (type: NotificationSoundType = 'chime') => {
  if (type === 'none') return;
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playTone = (frequency: number, startTime: number, duration: number, gain: number = 0.3) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };
  
  const now = audioContext.currentTime;
  
  switch (type) {
    case 'chime':
      // Pleasant two-tone chime
      playTone(587.33, now, 0.15);        // D5
      playTone(880, now + 0.15, 0.25);    // A5
      break;
    case 'bell':
      // Church bell style
      playTone(523.25, now, 0.4);         // C5
      playTone(659.25, now + 0.1, 0.35);  // E5
      playTone(783.99, now + 0.2, 0.3);   // G5
      break;
    case 'success':
      // Triumphant fanfare
      playTone(523.25, now, 0.1);         // C5
      playTone(659.25, now + 0.1, 0.1);   // E5
      playTone(783.99, now + 0.2, 0.15);  // G5
      playTone(1046.5, now + 0.35, 0.3);  // C6
      break;
    case 'ping':
      // Simple ping
      playTone(1200, now, 0.15, 0.2);
      break;
  }
};

// Get the saved notification sound preference
export const getNotificationSoundPref = (): NotificationSoundType => {
  return (localStorage.getItem('mediavault-notification-sound') as NotificationSoundType) || 'chime';
};

// Request and show system notification
const showSystemNotification = () => {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('MediaVault mis à jour', {
        body: 'La mise à jour a été installée avec succès !',
        icon: '/favicon.ico',
        tag: 'mediavault-update',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('MediaVault mis à jour', {
            body: 'La mise à jour a été installée avec succès !',
            icon: '/favicon.ico',
            tag: 'mediavault-update',
          });
        }
      });
    }
  }
};

interface ChangelogCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface UpdateProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: string;
  newVersion: string;
  commitsBehind: number;
  onStartUpdate: () => Promise<boolean>;
  changelog?: ChangelogCommit[];
}

type UpdateStep = 'backup' | 'download' | 'install' | 'restart';

interface StepInfo {
  id: UpdateStep;
  label: string;
  icon: typeof Archive;
  description: string;
}

const STEPS: StepInfo[] = [
  { id: 'backup', label: 'Sauvegarde', icon: Archive, description: 'Sauvegarde des données locales...' },
  { id: 'download', label: 'Téléchargement', icon: Download, description: 'Récupération de la nouvelle version...' },
  { id: 'install', label: 'Installation', icon: RefreshCw, description: 'Installation des fichiers...' },
  { id: 'restart', label: 'Redémarrage', icon: RotateCcw, description: 'Redémarrage du serveur...' },
];

export function UpdateProgressModal({
  open,
  onOpenChange,
  currentVersion,
  newVersion,
  commitsBehind,
  onStartUpdate,
  changelog = [],
}: UpdateProgressModalProps) {
  const [phase, setPhase] = useState<'confirm' | 'updating'>('confirm');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isWaitingForServer, setIsWaitingForServer] = useState(false);

  const getServerUrl = useCallback(() => {
    const serverUrl = localStorage.getItem('mediavault-admin-settings');
    let baseUrl = 'http://localhost:3001';
    try {
      if (serverUrl) {
        const settings = JSON.parse(serverUrl);
        baseUrl = settings.localServerUrl || baseUrl;
      }
    } catch (e) {
      // Use default
    }
    return baseUrl;
  }, []);

  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${getServerUrl()}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [getServerUrl]);

  const waitForServerRestart = useCallback(async () => {
    setIsWaitingForServer(true);
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    
    // First wait for server to go down (give it time to restart)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Then poll until it comes back
    while (attempts < maxAttempts) {
      const isHealthy = await checkServerHealth();
      if (isHealthy) {
        // Server is back, update complete!
        setIsWaitingForServer(false);
        setIsComplete(true);
        setProgress(100);
        
        // Play sound and show notification
        const soundPref = getNotificationSoundPref();
        playNotificationSound(soundPref);
        
        const showSystemNotif = localStorage.getItem('mediavault-show-system-notifications') !== 'false';
        if (showSystemNotif) {
          showSystemNotification();
        }
        
        // Update local version to match latest
        const latestVersion = localStorage.getItem('mediavault-latest-full-sha');
        if (latestVersion) {
          localStorage.setItem('mediavault-local-version', latestVersion);
          localStorage.removeItem('mediavault-changelog');
          window.dispatchEvent(new CustomEvent('mediavault-update-status-changed'));
        }
        
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2500);
        
        return;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update progress during waiting
      const waitProgress = 75 + (attempts / maxAttempts) * 20;
      setProgress(Math.min(waitProgress, 95));
    }
    
    // Timeout - server didn't come back
    setError("Le serveur ne répond pas. Veuillez vérifier manuellement et rafraîchir la page.");
    setIsWaitingForServer(false);
  }, [checkServerHealth]);

  const startUpdate = useCallback(async () => {
    setPhase('updating');
    setIsUpdating(true);
    setError(null);
    setCurrentStep(0);
    setProgress(0);

    // Simulate step progression while the batch script runs
    const simulateSteps = async () => {
      for (let i = 0; i < STEPS.length; i++) {
        setCurrentStep(i);
        
        // Progress within each step
        const stepDuration = i === 2 ? 8000 : 3000; // Install step takes longer
        const startProgress = (i / STEPS.length) * 100;
        const endProgress = ((i + 1) / STEPS.length) * 100;
        
        const stepStart = Date.now();
        while (Date.now() - stepStart < stepDuration) {
          const elapsed = Date.now() - stepStart;
          const stepProgress = Math.min(elapsed / stepDuration, 0.95);
          setProgress(startProgress + (endProgress - startProgress) * stepProgress);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };

    try {
      // Start the update process
      const success = await onStartUpdate();
      
      if (success) {
        // Run progress simulation and wait for server
        simulateSteps();
        await waitForServerRestart();
      } else {
        setError("Impossible de lancer la mise à jour. Vérifiez que le serveur est en cours d'exécution.");
        setIsUpdating(false);
      }
    } catch (err) {
      setError("Erreur lors de la mise à jour: " + (err instanceof Error ? err.message : String(err)));
      setIsUpdating(false);
    }
  }, [onStartUpdate, waitForServerRestart]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPhase('confirm');
      setIsUpdating(false);
      setCurrentStep(-1);
      setProgress(0);
      setError(null);
      setIsComplete(false);
      setIsWaitingForServer(false);
    }
  }, [open]);

  const formatVersion = (sha: string) => {
    if (!sha) return 'N/A';
    return sha.substring(0, 7);
  };

  // Load changelog from localStorage if not provided
  const displayChangelog = changelog.length > 0 ? changelog : (() => {
    try {
      const stored = localStorage.getItem('mediavault-changelog');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg" 
        onPointerDownOutside={(e) => isUpdating && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className={cn("w-5 h-5", isUpdating && !isComplete && "animate-spin")} />
            Mise à jour MediaVault
          </DialogTitle>
          {phase === 'confirm' && (
            <DialogDescription>
              Vérifiez les changements avant de lancer la mise à jour
            </DialogDescription>
          )}
        </DialogHeader>

        {phase === 'confirm' ? (
          <div className="space-y-4 py-2">
            {/* Version info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Version actuelle</p>
                <p className="font-mono text-sm font-medium text-muted-foreground">
                  {formatVersion(currentVersion)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Nouvelle version</p>
                <p className="font-mono text-sm font-medium text-primary">
                  {formatVersion(newVersion)}
                </p>
              </div>
            </div>

            {/* Commits behind badge */}
            {commitsBehind > 0 && (
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-sm font-medium">
                  <Download className="w-3.5 h-3.5" />
                  {commitsBehind} mise{commitsBehind > 1 ? 's' : ''} à jour à installer
                </span>
              </div>
            )}

            {/* Changelog */}
            {displayChangelog.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Changelog</span>
                </div>
                <ScrollArea className="h-48">
                  {displayChangelog.map((commit: ChangelogCommit, index: number) => (
                    <div 
                      key={commit.sha} 
                      className={cn(
                        "px-4 py-3 flex gap-3 hover:bg-muted/30 transition-colors",
                        index !== displayChangelog.length - 1 && "border-b border-border/50"
                      )}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{commit.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <code className="bg-black/20 px-1 rounded">{commit.sha}</code>
                          <span>•</span>
                          <span>{commit.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button className="flex-1 gap-2" onClick={startUpdate}>
                <Play className="w-4 h-4" />
                Lancer la mise à jour
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Version info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Version actuelle</p>
                <p className="font-mono text-sm font-medium text-muted-foreground">
                  {formatVersion(currentVersion)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Nouvelle version</p>
                <p className="font-mono text-sm font-medium text-primary">
                  {formatVersion(newVersion)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {isComplete 
                  ? "Mise à jour terminée ! Rafraîchissement..."
                  : isWaitingForServer
                  ? "En attente du redémarrage du serveur..."
                  : `${Math.round(progress)}%`}
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep || isComplete;
                const isPending = index > currentStep;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all",
                      isActive && "bg-primary/10",
                      isCompleted && "opacity-60"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-green-500 text-white",
                      isPending && "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium",
                        isPending && "text-muted-foreground"
                      )}>
                        {step.label}
                      </p>
                      {isActive && (
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Success message */}
            {isComplete && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Mise à jour réussie ! La page va se rafraîchir automatiquement...
                </span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Preview sound button component for settings
export function SoundPreviewButton({ soundType }: { soundType: NotificationSoundType }) {
  return (
    <Button 
      variant="ghost" 
      size="icon"
      className="h-8 w-8"
      onClick={() => playNotificationSound(soundType)}
    >
      <Volume2 className="w-4 h-4" />
    </Button>
  );
}
