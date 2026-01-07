import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Film, Music, Sparkles, Clock, Play, 
  Loader2, CheckCircle, Settings, Shuffle
} from "lucide-react";
import { toast } from "sonner";

interface MontageSettings {
  name: string;
  duration: number; // seconds
  clipDuration: number; // seconds per clip
  transition: "cut" | "fade" | "dissolve" | "wipe" | "random";
  addMusic: boolean;
  musicStyle: string;
  saveToLibrary: boolean;
  shuffleOrder: boolean;
}

const TRANSITIONS = [
  { id: "cut", name: "Coupe franche" },
  { id: "fade", name: "Fondu au noir" },
  { id: "dissolve", name: "Fondu enchaîné" },
  { id: "wipe", name: "Volet" },
  { id: "random", name: "Aléatoire" }
];

const MUSIC_STYLES = [
  "Cinématique épique",
  "Lo-fi relaxant",
  "Électronique énergique",
  "Acoustique doux",
  "Pop moderne",
  "Ambient atmosphérique"
];

export default function AutoMontage() {
  const [settings, setSettings] = useState<MontageSettings>({
    name: "Mon Montage",
    duration: 60,
    clipDuration: 3,
    transition: "dissolve",
    addMusic: true,
    musicStyle: "Cinématique épique",
    saveToLibrary: true,
    shuffleOrder: false
  });
  
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<string>("");

  const estimatedClips = Math.floor(settings.duration / settings.clipDuration);

  const handleGenerate = async () => {
    if (selectedMediaIds.length === 0) {
      toast.error("Sélectionnez des médias", {
        description: "Ajoutez des vidéos ou images à votre montage"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Simulation du processus de montage
      const steps = [
        { name: "Analyse des médias...", duration: 1500 },
        { name: "Sélection des moments forts...", duration: 2000 },
        { name: "Application des transitions...", duration: 1500 },
        settings.addMusic ? { name: "Génération de la musique...", duration: 3000 } : null,
        { name: "Rendu final...", duration: 2000 }
      ].filter(Boolean);

      for (let i = 0; i < steps.length; i++) {
        const s = steps[i]!;
        setStep(s.name);
        await new Promise(resolve => setTimeout(resolve, s.duration));
        setProgress(((i + 1) / steps.length) * 100);
      }

      toast.success("Montage terminé !", {
        description: settings.saveToLibrary 
          ? "Le montage a été ajouté à votre bibliothèque"
          : "Le montage est prêt à être lu"
      });
    } catch (error) {
      console.error("Montage error:", error);
      toast.error("Erreur lors du montage");
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setStep("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres du montage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nom du montage</Label>
            <Input
              value={settings.name}
              onChange={(e) => setSettings(s => ({ ...s, name: e.target.value }))}
              placeholder="Mon super montage"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Durée totale</Label>
              <span className="text-sm text-muted-foreground">
                {Math.floor(settings.duration / 60)}:{(settings.duration % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <Slider
              value={[settings.duration]}
              onValueChange={([v]) => setSettings(s => ({ ...s, duration: v }))}
              min={10}
              max={300}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10s</span>
              <span>5 min</span>
            </div>
          </div>

          {/* Clip Duration */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Durée par clip</Label>
              <span className="text-sm text-muted-foreground">{settings.clipDuration}s</span>
            </div>
            <Slider
              value={[settings.clipDuration]}
              onValueChange={([v]) => setSettings(s => ({ ...s, clipDuration: v }))}
              min={1}
              max={10}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
              ≈ {estimatedClips} clips dans le montage
            </p>
          </div>

          {/* Transition */}
          <div className="space-y-2">
            <Label>Type de transition</Label>
            <Select
              value={settings.transition}
              onValueChange={(v) => setSettings(s => ({ ...s, transition: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSITIONS.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shuffle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-muted-foreground" />
              <Label>Ordre aléatoire</Label>
            </div>
            <Switch
              checked={settings.shuffleOrder}
              onCheckedChange={(v) => setSettings(s => ({ ...s, shuffleOrder: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Music */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Musique IA
          </CardTitle>
          <CardDescription>
            Générer automatiquement une musique de fond
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Ajouter de la musique</Label>
            <Switch
              checked={settings.addMusic}
              onCheckedChange={(v) => setSettings(s => ({ ...s, addMusic: v }))}
            />
          </div>

          {settings.addMusic && (
            <div className="space-y-2">
              <Label>Style musical</Label>
              <Select
                value={settings.musicStyle}
                onValueChange={(v) => setSettings(s => ({ ...s, musicStyle: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSIC_STYLES.map(style => (
                    <SelectItem key={style} value={style}>{style}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Sortie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Sauvegarder dans la bibliothèque</Label>
              <p className="text-xs text-muted-foreground">
                {settings.saveToLibrary 
                  ? "Le montage sera ajouté à vos médias"
                  : "Lecture éphémère uniquement"}
              </p>
            </div>
            <Switch
              checked={settings.saveToLibrary}
              onCheckedChange={(v) => setSettings(s => ({ ...s, saveToLibrary: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Media Selection Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Médias sélectionnés</CardTitle>
          <CardDescription>
            {selectedMediaIds.length} média{selectedMediaIds.length > 1 ? "s" : ""} sélectionné{selectedMediaIds.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedMediaIds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Sélectionnez des médias depuis votre bibliothèque</p>
              <Button variant="outline" className="mt-4" disabled>
                Parcourir la bibliothèque
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-32">
              {/* TODO: Display selected media thumbnails */}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      {isGenerating && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {step}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <Button 
        size="lg" 
        className="w-full gap-2"
        onClick={handleGenerate}
        disabled={isGenerating || selectedMediaIds.length === 0}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Création en cours...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Créer le montage
          </>
        )}
      </Button>
    </div>
  );
}
