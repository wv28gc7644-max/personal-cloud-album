import { useMediaStore } from '@/hooks/useMediaStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, ListMusic } from 'lucide-react';
import { toast } from 'sonner';

export function PlaylistsSettings() {
  const { playlists, removePlaylist } = useMediaStore();

  const handleDeletePlaylist = (playlistId: string, playlistName: string) => {
    removePlaylist(playlistId);
    toast.success(`Playlist "${playlistName}" supprimée`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListMusic className="w-5 h-5" />
            Playlists ({playlists.length})
          </CardTitle>
          <CardDescription>Gérez vos collections de médias</CardDescription>
        </CardHeader>
        <CardContent>
          {playlists.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune playlist créée
            </p>
          ) : (
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <div 
                  key={playlist.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{playlist.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {playlist.items.length} élément(s)
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeletePlaylist(playlist.id, playlist.name)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        💡 Pour créer une playlist, utilisez le bouton "+" dans la barre latérale
      </p>
    </div>
  );
}
