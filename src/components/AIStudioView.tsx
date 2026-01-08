import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Image, Video, Mic, Music, Scissors, Wand2, 
  Maximize, Film, Smile, Workflow, Sparkles, Play
} from "lucide-react";
import { ImageGenerator } from "./ImageGenerator";
import { VideoGenerator } from "./VideoGenerator";
import { VoiceCloner } from "./VoiceCloner";
import { MusicGenerator } from "./MusicGenerator";
import { StemSeparator } from "./StemSeparator";
import { ImageUpscaler } from "./ImageUpscaler";
import { FrameInterpolation } from "./FrameInterpolation";
import { LipSync } from "./LipSync";
import { WorkflowBuilder } from "./WorkflowBuilder";
import AutoMontage from "./AutoMontage";

interface AITool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  category: "generation" | "editing" | "audio" | "advanced";
  status: "available" | "beta" | "coming";
}

const AI_TOOLS: AITool[] = [
  {
    id: "image-gen",
    name: "Génération d'images",
    description: "Créez des images à partir de texte avec Stable Diffusion",
    icon: <Image className="h-8 w-8" />,
    component: <ImageGenerator />,
    category: "generation",
    status: "available"
  },
  {
    id: "video-gen",
    name: "Génération de vidéos",
    description: "Créez des vidéos avec AnimateDiff et SVD",
    icon: <Video className="h-8 w-8" />,
    component: <VideoGenerator />,
    category: "generation",
    status: "available"
  },
  {
    id: "voice-clone",
    name: "Clonage vocal",
    description: "Clonez et générez des voix avec XTTS",
    icon: <Mic className="h-8 w-8" />,
    component: <VoiceCloner />,
    category: "audio",
    status: "available"
  },
  {
    id: "music-gen",
    name: "Génération musicale",
    description: "Créez de la musique avec MusicGen",
    icon: <Music className="h-8 w-8" />,
    component: <MusicGenerator />,
    category: "audio",
    status: "available"
  },
  {
    id: "stem-sep",
    name: "Séparation audio",
    description: "Séparez les pistes avec Demucs",
    icon: <Scissors className="h-8 w-8" />,
    component: <StemSeparator />,
    category: "audio",
    status: "available"
  },
  {
    id: "upscale",
    name: "Upscaling",
    description: "Améliorez la résolution avec ESRGAN",
    icon: <Maximize className="h-8 w-8" />,
    component: <ImageUpscaler />,
    category: "editing",
    status: "available"
  },
  {
    id: "interpolation",
    name: "Interpolation",
    description: "Augmentez les FPS avec RIFE",
    icon: <Film className="h-8 w-8" />,
    component: <FrameInterpolation />,
    category: "editing",
    status: "available"
  },
  {
    id: "lip-sync",
    name: "Lip Sync",
    description: "Synchronisez les lèvres avec l'audio",
    icon: <Smile className="h-8 w-8" />,
    component: <LipSync />,
    category: "advanced",
    status: "available"
  },
  {
    id: "auto-montage",
    name: "Montage automatique",
    description: "Créez des montages à partir de vos médias",
    icon: <Play className="h-8 w-8" />,
    component: <AutoMontage />,
    category: "editing",
    status: "beta"
  },
  {
    id: "workflows",
    name: "Workflows",
    description: "Créez des pipelines IA personnalisés",
    icon: <Workflow className="h-8 w-8" />,
    component: <WorkflowBuilder />,
    category: "advanced",
    status: "available"
  }
];

const CATEGORIES = [
  { id: "all", name: "Tous", icon: <Sparkles className="h-4 w-4" /> },
  { id: "generation", name: "Génération", icon: <Wand2 className="h-4 w-4" /> },
  { id: "editing", name: "Édition", icon: <Scissors className="h-4 w-4" /> },
  { id: "audio", name: "Audio", icon: <Music className="h-4 w-4" /> },
  { id: "advanced", name: "Avancé", icon: <Workflow className="h-4 w-4" /> }
];

export default function AIStudioView() {
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredTools = activeCategory === "all" 
    ? AI_TOOLS 
    : AI_TOOLS.filter(tool => tool.category === activeCategory);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white ai-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Studio IA</h1>
            <p className="text-muted-foreground">Tous vos outils de création IA en un seul endroit</p>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat.id)}
              className="gap-2"
            >
              {cat.icon}
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <ScrollArea className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map(tool => (
            <Card 
              key={tool.id}
              className="group cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
              onClick={() => setSelectedTool(tool)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {tool.icon}
                  </div>
                  {tool.status === "beta" && (
                    <Badge variant="secondary" className="text-xs">Beta</Badge>
                  )}
                  {tool.status === "coming" && (
                    <Badge variant="outline" className="text-xs">Bientôt</Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{tool.name}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="ghost" 
                  className="w-full group-hover:bg-primary/10"
                  disabled={tool.status === "coming"}
                >
                  {tool.status === "coming" ? "Bientôt disponible" : "Ouvrir"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Tool Dialog */}
      <Dialog open={!!selectedTool} onOpenChange={() => setSelectedTool(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTool?.icon}
              {selectedTool?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {selectedTool?.component}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
