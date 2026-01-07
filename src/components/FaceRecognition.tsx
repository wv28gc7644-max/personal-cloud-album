import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  UserCircle, 
  ScanFace, 
  Loader2, 
  Plus,
  Trash2,
  Search,
  Image,
  Users,
  Camera,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FaceProfile {
  id: string;
  name: string;
  thumbnailUrl: string;
  faceCount: number;
  createdAt: Date;
}

interface ScanResult {
  mediaId: string;
  mediaUrl: string;
  faces: {
    profileId: string;
    profileName: string;
    confidence: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }[];
}

export const FaceRecognition = () => {
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [totalToScan, setTotalToScan] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePhotos, setNewProfilePhotos] = useState<File[]>([]);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScanResult[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setNewProfilePhotos(prev => [...prev, ...Array.from(files)]);
    }
  };

  const createProfile = async () => {
    if (!newProfileName.trim()) {
      toast.error('Veuillez nommer ce profil');
      return;
    }

    if (newProfilePhotos.length === 0) {
      toast.error('Ajoutez au moins une photo du visage');
      return;
    }

    setIsCreatingProfile(true);

    try {
      const formData = new FormData();
      formData.append('name', newProfileName);
      newProfilePhotos.forEach((photo, i) => {
        formData.append(`photo_${i}`, photo);
      });

      const response = await fetch('http://localhost:3001/api/ai/faces/create-profile', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const newProfile: FaceProfile = {
          id: data.profileId,
          name: newProfileName,
          thumbnailUrl: URL.createObjectURL(newProfilePhotos[0]),
          faceCount: newProfilePhotos.length,
          createdAt: new Date()
        };
        
        setProfiles(prev => [...prev, newProfile]);
        setNewProfileName('');
        setNewProfilePhotos([]);
        toast.success(`Profil "${newProfileName}" créé avec succès !`);
      } else {
        throw new Error('Profile creation failed');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du profil', {
        description: 'Vérifiez que InsightFace est installé'
      });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const deleteProfile = (profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
    toast.success('Profil supprimé');
  };

  const scanLibrary = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScannedCount(0);

    try {
      // Get media count first
      const countResponse = await fetch('http://localhost:3001/api/media/count');
      const { count } = await countResponse.json();
      setTotalToScan(count);

      // Start scanning
      const response = await fetch('http://localhost:3001/api/ai/faces/scan-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileIds: profiles.map(p => p.id)
        })
      });

      if (response.ok) {
        // Stream progress updates
        const reader = response.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const text = new TextDecoder().decode(value);
            const lines = text.split('\n').filter(l => l.trim());
            
            for (const line of lines) {
              try {
                const update = JSON.parse(line);
                setScannedCount(update.scanned);
                setScanProgress((update.scanned / count) * 100);
              } catch {}
            }
          }
        }

        toast.success('Scan terminé !', {
          description: `${count} médias analysés`
        });
      }
    } catch (error) {
      toast.error('Erreur lors du scan');
    } finally {
      setIsScanning(false);
    }
  };

  const searchByFace = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(`http://localhost:3001/api/ai/faces/search?name=${encodeURIComponent(searchQuery)}`);
      
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        toast.success(`${results.length} médias trouvés`);
      }
    } catch (error) {
      toast.error('Erreur de recherche');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanFace className="w-5 h-5 text-blue-500" />
          Reconnaissance Faciale
        </CardTitle>
        <CardDescription>
          Identifiez et organisez vos médias par personnes avec InsightFace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Profile Section */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus className="w-4 h-4" />
            Créer un profil de personne
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de la personne</Label>
              <Input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Ex: Marie, Papa, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Photos du visage ({newProfilePhotos.length})</Label>
              <label>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <span>
                    <Camera className="w-4 h-4" />
                    Ajouter des photos
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {newProfilePhotos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {newProfilePhotos.map((photo, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${i + 1}`}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <button
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    onClick={() => setNewProfilePhotos(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={createProfile}
            disabled={isCreatingProfile || !newProfileName.trim() || newProfilePhotos.length === 0}
            className="w-full gap-2"
          >
            {isCreatingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <UserCircle className="w-4 h-4" />
                Créer le profil
              </>
            )}
          </Button>
        </div>

        {/* Existing Profiles */}
        {profiles.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Profils enregistrés ({profiles.length})
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className="relative p-3 bg-muted/30 rounded-lg text-center group"
                >
                  <img
                    src={profile.thumbnailUrl}
                    alt={profile.name}
                    className="w-16 h-16 mx-auto rounded-full object-cover mb-2"
                  />
                  <p className="font-medium text-sm">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.faceCount} photos</p>
                  
                  <button
                    className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={() => deleteProfile(profile.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scan Library */}
        <div className="space-y-3">
          <Button
            onClick={scanLibrary}
            disabled={isScanning || profiles.length === 0}
            className="w-full gap-2"
            size="lg"
            variant="outline"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scan en cours... ({scannedCount}/{totalToScan})
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4" />
                Scanner la bibliothèque
              </>
            )}
          </Button>

          {isScanning && (
            <div className="space-y-1">
              <Progress value={scanProgress} />
              <p className="text-xs text-muted-foreground text-center">
                Analyse des visages dans vos médias...
              </p>
            </div>
          )}
        </div>

        {/* Search by Face */}
        <div className="space-y-2">
          <Label>Rechercher par personne</Label>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom de la personne..."
              onKeyDown={(e) => e.key === 'Enter' && searchByFace()}
            />
            <Button onClick={searchByFace} className="gap-2">
              <Search className="w-4 h-4" />
              Rechercher
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <Label>Résultats ({searchResults.length})</Label>
            <ScrollArea className="h-48">
              <div className="grid grid-cols-4 gap-2">
                {searchResults.map(result => (
                  <div
                    key={result.mediaId}
                    className="relative group rounded overflow-hidden"
                  >
                    <img
                      src={result.mediaUrl}
                      alt=""
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60">
                      <div className="flex flex-wrap gap-1">
                        {result.faces.map((face, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {face.profileName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {profiles.length === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Créez des profils de personnes pour commencer à organiser vos photos
          </p>
        )}
      </CardContent>
    </Card>
  );
};
