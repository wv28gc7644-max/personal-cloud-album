import { useAutoSync } from '@/hooks/useAutoSync';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AutoSyncSettings() {
  const { 
    isAutoSyncEnabled, 
    intervalSeconds, 
    lastSyncTime, 
    newFilesCount,
    deletedFilesCount,
    isSyncing,
    enableAutoSync, 
    setIntervalSeconds,
    syncNow
  } = useAutoSync();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Synchronisation automatique
          </CardTitle>
          <CardDescription>Import automatique des nouveaux médias depuis le serveur</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle sync auto */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <div>
              <Label htmlFor="auto-sync" className="text-sm font-medium cursor-pointer">
                Synchronisation automatique
              </Label>
              <p className="text-xs text-muted-foreground">
                Importer automatiquement les nouveaux fichiers
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={isAutoSyncEnabled}
              onCheckedChange={enableAutoSync}
            />
          </div>

          {/* Intervalle */}
          {isAutoSyncEnabled && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Intervalle de synchronisation</Label>
                  <p className="text-xs text-muted-foreground">Fréquence de vérification</p>
                </div>
              </div>
              <Select 
                value={intervalSeconds.toString()} 
                onValueChange={(v) => setIntervalSeconds(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 sec</SelectItem>
                  <SelectItem value="60">1 min</SelectItem>
                  <SelectItem value="120">2 min</SelectItem>
                  <SelectItem value="300">5 min</SelectItem>
                  <SelectItem value="600">10 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dernière sync */}
          {lastSyncTime && (
            <div className="p-3 bg-muted/20 rounded-lg text-sm">
              <p className="text-muted-foreground">
                Dernière synchronisation : <span className="font-medium text-foreground">{lastSyncTime instanceof Date ? lastSyncTime.toLocaleString('fr-FR') : String(lastSyncTime)}</span>
              </p>
              {(newFilesCount > 0 || deletedFilesCount > 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {newFilesCount > 0 && `+${newFilesCount} nouveau(x)`}
                  {newFilesCount > 0 && deletedFilesCount > 0 && ' • '}
                  {deletedFilesCount > 0 && `-${deletedFilesCount} supprimé(s)`}
                </p>
              )}
            </div>
          )}

          {/* Bouton sync manuelle */}
          <Button 
            onClick={syncNow} 
            variant="outline" 
            className="w-full gap-2"
            disabled={isSyncing}
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
