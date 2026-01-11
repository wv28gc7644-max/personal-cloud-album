import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { getAICreations, saveAICreations, AICreation as SafeAICreation } from "@/utils/safeLocalStorage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Image, Video, Music, Mic, Wand2, Download, 
  Trash2, Plus, Search, Filter, MoreVertical,
  Calendar, Clock, Sparkles, Eye
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AICreation {
  id: string;
  type: "image" | "video" | "music" | "voice" | "montage";
  name: string;
  url: string;
  thumbnail?: string;
  prompt?: string;
  model: string;
  createdAt: Date;
  duration?: number; // en secondes pour la génération
  metadata?: Record<string, any>;
}

const TYPE_ICONS = {
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  music: <Music className="h-4 w-4" />,
  voice: <Mic className="h-4 w-4" />,
  montage: <Wand2 className="h-4 w-4" />
};

const TYPE_LABELS = {
  image: "Image",
  video: "Vidéo",
  music: "Musique",
  voice: "Voix",
  montage: "Montage"
};

const TYPE_COLORS = {
  image: "bg-blue-500/10 text-blue-500",
  video: "bg-purple-500/10 text-purple-500",
  music: "bg-green-500/10 text-green-500",
  voice: "bg-orange-500/10 text-orange-500",
  montage: "bg-pink-500/10 text-pink-500"
};

export default function AICreationsView() {
  const [creations, setCreations] = useState<AICreation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedCreation, setSelectedCreation] = useState<AICreation | null>(null);

  // Charger depuis localStorage (validated via Zod)
  useEffect(() => {
    const validated = getAICreations();
    // Map to local AICreation type (add model field if missing)
    setCreations(validated.map(c => ({
      id: c.id,
      type: c.type === 'audio' ? 'music' : c.type as AICreation['type'],
      name: c.name,
      url: c.url,
      thumbnail: c.thumbnail,
      prompt: c.prompt,
      model: c.model || 'unknown',
      createdAt: c.createdAt,
      duration: c.duration,
      metadata: c.metadata,
    })));
  }, []);

  const filteredCreations = creations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.prompt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: string) => {
    const updated = creations.filter(c => c.id !== id);
    setCreations(updated);
    saveAICreations(updated);
    toast.success("Création supprimée");
  };

  const handleDownload = async (creation: AICreation) => {
    try {
      const response = await fetch(creation.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = creation.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Téléchargement démarré");
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleAddToLibrary = (creation: AICreation) => {
    // TODO: Ajouter à la bibliothèque principale
    toast.success("Ajouté à la bibliothèque");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Créations IA</h1>
            <p className="text-muted-foreground">
              {creations.length} création{creations.length > 1 ? "s" : ""} générée{creations.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {filterType === "all" ? "Tous les types" : TYPE_LABELS[filterType as keyof typeof TYPE_LABELS]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterType("all")}>
                Tous les types
              </DropdownMenuItem>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <DropdownMenuItem key={key} onClick={() => setFilterType(key)}>
                  <span className="mr-2">{TYPE_ICONS[key as keyof typeof TYPE_ICONS]}</span>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1 p-6">
        {filteredCreations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune création</h3>
            <p className="text-muted-foreground mb-4">
              {creations.length === 0 
                ? "Vos créations IA apparaîtront ici"
                : "Aucun résultat pour cette recherche"}
            </p>
            {creations.length === 0 && (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => window.dispatchEvent(new CustomEvent('mediavault-navigate', { detail: 'ai-studio' }))}
              >
                <Wand2 className="h-4 w-4" />
                Ouvrir le Studio IA
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCreations.map(creation => (
              <Card 
                key={creation.id}
                className="group overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                {/* Thumbnail */}
                <div 
                  className="aspect-square bg-muted relative cursor-pointer"
                  onClick={() => setSelectedCreation(creation)}
                >
                  {creation.type === "image" || creation.thumbnail ? (
                    <img 
                      src={creation.thumbnail || creation.url}
                      alt={creation.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={`p-6 rounded-full ${TYPE_COLORS[creation.type]}`}>
                        {TYPE_ICONS[creation.type]}
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />
                      Voir
                    </Button>
                  </div>

                  {/* Type badge */}
                  <Badge 
                    className={`absolute top-2 left-2 ${TYPE_COLORS[creation.type]}`}
                  >
                    {TYPE_ICONS[creation.type]}
                    <span className="ml-1">{TYPE_LABELS[creation.type]}</span>
                  </Badge>
                </div>

                {/* Info */}
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{creation.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(creation.createdAt, "dd MMM yyyy", { locale: fr })}
                        {creation.duration && (
                          <>
                            <Clock className="h-3 w-3 ml-2" />
                            {creation.duration}s
                          </>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(creation)}>
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddToLibrary(creation)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter à la bibliothèque
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(creation.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {creation.prompt && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {creation.prompt}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCreation} onOpenChange={() => setSelectedCreation(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCreation && TYPE_ICONS[selectedCreation.type]}
              {selectedCreation?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCreation && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="rounded-lg overflow-hidden bg-muted">
                {selectedCreation.type === "image" ? (
                  <img 
                    src={selectedCreation.url}
                    alt={selectedCreation.name}
                    className="w-full max-h-96 object-contain"
                  />
                ) : selectedCreation.type === "video" ? (
                  <video 
                    src={selectedCreation.url}
                    controls
                    className="w-full max-h-96"
                  />
                ) : selectedCreation.type === "music" || selectedCreation.type === "voice" ? (
                  <audio 
                    src={selectedCreation.url}
                    controls
                    className="w-full p-4"
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Aperçu non disponible
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2">{TYPE_LABELS[selectedCreation.type]}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Modèle:</span>
                  <span className="ml-2">{selectedCreation.model}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <span className="ml-2">
                    {format(selectedCreation.createdAt, "dd MMMM yyyy à HH:mm", { locale: fr })}
                  </span>
                </div>
                {selectedCreation.duration && (
                  <div>
                    <span className="text-muted-foreground">Durée génération:</span>
                    <span className="ml-2">{selectedCreation.duration}s</span>
                  </div>
                )}
              </div>

              {selectedCreation.prompt && (
                <div>
                  <span className="text-sm text-muted-foreground">Prompt:</span>
                  <p className="mt-1 text-sm bg-muted p-3 rounded-lg">
                    {selectedCreation.prompt}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleDownload(selectedCreation)}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
                <Button onClick={() => handleAddToLibrary(selectedCreation)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter à la bibliothèque
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
