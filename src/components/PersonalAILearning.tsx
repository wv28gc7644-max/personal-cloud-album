import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, Lightbulb, Heart, Zap, Plus, 
  Sparkles, Info, CheckCircle
} from "lucide-react";
import { usePersonalAI, Knowledge } from "@/hooks/usePersonalAI";
import { toast } from "sonner";

const KNOWLEDGE_TYPES = [
  {
    id: "fact" as const,
    name: "Fait",
    description: "Informations sur vous (nom, travail, famille...)",
    icon: <Lightbulb className="h-4 w-4" />,
    color: "bg-blue-500/10 text-blue-500",
    examples: [
      "Je m'appelle Jean",
      "Je travaille comme développeur",
      "J'ai 2 enfants"
    ]
  },
  {
    id: "preference" as const,
    name: "Préférence",
    description: "Ce que vous aimez ou n'aimez pas",
    icon: <Heart className="h-4 w-4" />,
    color: "bg-pink-500/10 text-pink-500",
    examples: [
      "J'aime le café",
      "Je préfère les réponses courtes",
      "Je n'aime pas les emojis"
    ]
  },
  {
    id: "instruction" as const,
    name: "Instruction",
    description: "Comment l'IA doit se comporter",
    icon: <Zap className="h-4 w-4" />,
    color: "bg-orange-500/10 text-orange-500",
    examples: [
      "Toujours me vouvoyer",
      "Ne jamais utiliser de jargon technique",
      "Quand je dis 'résume', fais un résumé en 3 points"
    ]
  }
];

export default function PersonalAILearning() {
  const { config, updateConfig, addKnowledge, knowledge } = usePersonalAI();
  const [selectedType, setSelectedType] = useState<Knowledge["type"]>("fact");
  const [newContent, setNewContent] = useState("");
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);

  const handleAdd = () => {
    if (!newContent.trim()) return;

    const added = addKnowledge(newContent.trim(), selectedType);
    setRecentlyAdded(prev => [added.id, ...prev].slice(0, 5));
    setNewContent("");
    toast.success("Connaissance ajoutée !", {
      description: `${KNOWLEDGE_TYPES.find(t => t.id === selectedType)?.name}: ${newContent}`
    });
  };

  const selectedTypeInfo = KNOWLEDGE_TYPES.find(t => t.id === selectedType)!;

  return (
    <div className="space-y-6">
      {/* Learning Mode Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Mode Apprentissage</h3>
                <p className="text-sm text-muted-foreground">
                  Activer pour apprendre automatiquement de la conversation
                </p>
              </div>
            </div>
            <Switch
              checked={config.learningMode}
              onCheckedChange={(checked) => updateConfig({ learningMode: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Add */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ajouter une connaissance
          </CardTitle>
          <CardDescription>
            Enseignez quelque chose de nouveau à votre IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type Selection */}
          <div className="grid grid-cols-3 gap-2">
            {KNOWLEDGE_TYPES.map(type => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                className="h-auto py-3 flex-col gap-1"
                onClick={() => setSelectedType(type.id)}
              >
                <span className={selectedType === type.id ? "" : type.color}>
                  {type.icon}
                </span>
                <span className="text-xs">{type.name}</span>
              </Button>
            ))}
          </div>

          {/* Description & Examples */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground" />
              {selectedTypeInfo.description}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Exemples:</span>
              <ul className="mt-1 space-y-1">
                {selectedTypeInfo.examples.map((ex, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-muted-foreground">•</span>
                    <button 
                      className="hover:text-foreground transition-colors text-left"
                      onClick={() => setNewContent(ex)}
                    >
                      {ex}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <Label>Contenu</Label>
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={`Entrez un${selectedType === "instruction" ? "e instruction" : selectedType === "preference" ? "e préférence" : " fait"}...`}
              rows={3}
            />
          </div>

          <Button onClick={handleAdd} className="w-full gap-2" disabled={!newContent.trim()}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </CardContent>
      </Card>

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Ajouts récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {recentlyAdded.map(id => {
                  const item = knowledge.find(k => k.id === id);
                  if (!item) return null;
                  const typeInfo = KNOWLEDGE_TYPES.find(t => t.id === item.type)!;
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className={typeInfo.color}>
                        {typeInfo.icon}
                      </Badge>
                      <span className="truncate">{item.content}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Phrases magiques */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Phrases magiques
          </CardTitle>
          <CardDescription>
            Utilisez ces formules en mode apprentissage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <code className="text-blue-500">"Apprends que [information]"</code>
              <p className="text-muted-foreground text-xs mt-1">Ajoute un fait</p>
            </div>
            <div className="p-2 rounded-lg bg-pink-500/5 border border-pink-500/20">
              <code className="text-pink-500">"J'aime [quelque chose]"</code>
              <p className="text-muted-foreground text-xs mt-1">Ajoute une préférence</p>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <code className="text-orange-500">"Quand je dis [X], tu [action]"</code>
              <p className="text-muted-foreground text-xs mt-1">Ajoute une instruction</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
              <code className="text-red-500">"Oublie [information]"</code>
              <p className="text-muted-foreground text-xs mt-1">Supprime une connaissance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
