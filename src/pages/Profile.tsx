import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Camera, Edit2, Save, X, Image, Video, Heart, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaStore } from '@/hooks/useMediaStore';

const Profile = () => {
  const { user, profile, updateProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { media } = useMediaStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    const { error } = await updateProfile(formData);
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Succès",
        description: "Profil mis à jour"
      });
      setIsEditing(false);
    }
  };

  // Stats - use name instead of title, and mock favorites/views
  const userMedia = media;
  const totalPhotos = userMedia.filter(m => m.type === 'image').length;
  const totalVideos = userMedia.filter(m => m.type === 'video').length;
  const totalFavorites = 0; // Would be tracked separately
  const totalViews = userMedia.length * 10; // Mock

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Photo */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/40">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/80"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-4 right-4 bg-background/80"
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 -mt-16">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-background">
              <AvatarImage src={formData.avatar_url} />
              <AvatarFallback className="text-4xl">
                {formData.display_name?.[0] || user?.email?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-0 right-0 bg-background rounded-full"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Nom d'affichage"
                  className="text-2xl font-bold"
                />
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="@username"
                  className="text-muted-foreground"
                />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{profile?.display_name || 'Utilisateur'}</h1>
                <p className="text-muted-foreground">@{profile?.username || 'user'}</p>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier le profil
              </Button>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4">
          {isEditing ? (
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Parlez de vous..."
              className="min-h-[100px]"
            />
          ) : (
            <p className="text-muted-foreground">{profile?.bio || 'Aucune bio'}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Image className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{totalPhotos}</p>
              <p className="text-xs text-muted-foreground">Photos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Video className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{totalVideos}</p>
              <p className="text-xs text-muted-foreground">Vidéos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{totalFavorites}</p>
              <p className="text-xs text-muted-foreground">Favoris</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{totalViews}</p>
              <p className="text-xs text-muted-foreground">Vues</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="all" className="mt-8">
          <TabsList>
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="videos">Vidéos</TabsTrigger>
            <TabsTrigger value="favorites">Favoris</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-3 gap-1">
              {userMedia.slice(0, 9).map((item) => (
                <div key={item.id} className="aspect-square bg-muted rounded-sm overflow-hidden">
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="photos" className="mt-4">
            <div className="grid grid-cols-3 gap-1">
              {userMedia.filter(m => m.type === 'image').slice(0, 9).map((item) => (
                <div key={item.id} className="aspect-square bg-muted rounded-sm overflow-hidden">
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="mt-4">
            <div className="grid grid-cols-3 gap-1">
              {userMedia.filter(m => m.type === 'video').slice(0, 9).map((item) => (
                <div key={item.id} className="aspect-square bg-muted rounded-sm overflow-hidden">
                  <video src={item.url} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            <div className="grid grid-cols-3 gap-1">
              {userMedia.slice(0, 3).map((item) => (
                <div key={item.id} className="aspect-square bg-muted rounded-sm overflow-hidden">
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Member Since */}
        <p className="text-center text-muted-foreground text-sm mt-8 pb-8">
          Membre depuis {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'récemment'}
        </p>
      </div>
    </div>
  );
};

export default Profile;
