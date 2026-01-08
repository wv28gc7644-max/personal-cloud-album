import { useState, useCallback } from 'react';
import { useLocalServer } from '@/hooks/useLocalServer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, CheckCircle, XCircle, Loader2, RefreshCw, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ServerSettings() {
  const { isConnected, isLoading, error, testConnection, loadFilesFromServer, filesCount } = useLocalServer();
  const [serverUrl, setServerUrl] = useState(() => 
    localStorage.getItem('mediavault-server-url') || 'http://localhost:3001'
  );

  const handleSaveUrl = () => {
    localStorage.setItem('mediavault-server-url', serverUrl);
    toast.success('URL du serveur sauvegardée');
  };

  const handleTestConnection = async () => {
    await testConnection();
  };

  const handleLoadFiles = async () => {
    await loadFilesFromServer();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Connexion au serveur local
          </CardTitle>
          <CardDescription>Connectez-vous au serveur Node.js pour synchroniser vos médias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">URL du serveur</Label>
            <div className="flex gap-2">
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:3001"
              />
              <Button onClick={handleSaveUrl} variant="secondary">
                Sauvegarder
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isConnected ? "text-green-500" : "text-muted-foreground"
              )}>
                {isLoading ? 'Connexion...' : isConnected ? 'Connecté' : 'Non connecté'}
              </span>
            </div>
            
            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleTestConnection} 
              variant="outline" 
              className="gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Tester la connexion
            </Button>
            
            <Button 
              onClick={handleLoadFiles} 
              variant="default" 
              className="gap-2"
              disabled={isLoading || !isConnected}
            >
              <FolderOpen className="w-4 h-4" />
              Charger les fichiers
            </Button>
          </div>

          {filesCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {filesCount} fichier(s) chargé(s) depuis le serveur
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
