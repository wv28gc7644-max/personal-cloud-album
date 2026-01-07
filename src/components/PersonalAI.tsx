import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Brain, MessageSquare, BookOpen, Database, Settings, Sparkles, Edit2, Check } from "lucide-react";
import { usePersonalAI } from "@/hooks/usePersonalAI";
import PersonalAIChat from "./PersonalAIChat";
import PersonalAILearning from "./PersonalAILearning";
import PersonalAIMemory from "./PersonalAIMemory";

const AVATARS = ["🤖", "🧠", "💡", "🔮", "🌟", "🎭", "👾", "🦾"];

export default function PersonalAI() {
  const { config, updateConfig, stats } = usePersonalAI();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(config.name);

  const handleSaveName = () => {
    updateConfig({ name: tempName });
    setIsEditingName(false);
  };

  const handleAvatarChange = (avatar: string) => {
    updateConfig({ avatar });
  };

  // Calculer le niveau basé sur le nombre de connaissances
  const level = Math.floor(stats.totalKnowledge / 10) + 1;
  const levelProgress = (stats.totalKnowledge % 10) * 10;
  const levelName = level <= 2 ? "Novice" : level <= 5 ? "Apprenti" : level <= 10 ? "Expert" : "Maître";

  return (
    <div className="h-full flex flex-col">
      {/* Header Card */}
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10">
        <Card className="bg-background/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="text-6xl p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30">
                  {config.avatar}
                </div>
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="grid grid-cols-4 gap-1 p-2">
                    {AVATARS.map(avatar => (
                      <button
                        key={avatar}
                        onClick={() => handleAvatarChange(avatar)}
                        className="text-xl hover:scale-125 transition-transform"
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="h-8 w-48"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={handleSaveName}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold">{config.name}</h2>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setIsEditingName(true)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Niveau {level} - {levelName}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {stats.totalKnowledge} connaissances
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progression vers niveau {level + 1}</span>
                    <span>{levelProgress}%</span>
                  </div>
                  <Progress value={levelProgress} className="h-2" />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <div className="text-2xl font-bold text-blue-500">{stats.facts}</div>
                  <div className="text-xs text-muted-foreground">Faits</div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <div className="text-2xl font-bold text-green-500">{stats.instructions}</div>
                  <div className="text-xs text-muted-foreground">Instructions</div>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <div className="text-2xl font-bold text-orange-500">{stats.preferences}</div>
                  <div className="text-xs text-muted-foreground">Préférences</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <div className="border-b px-6">
          <TabsList className="h-12">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Discuter
            </TabsTrigger>
            <TabsTrigger value="learning" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Apprentissage
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2">
              <Database className="h-4 w-4" />
              Mémoire
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 m-0">
          <PersonalAIChat />
        </TabsContent>

        <TabsContent value="learning" className="flex-1 m-0 p-6">
          <PersonalAILearning />
        </TabsContent>

        <TabsContent value="memory" className="flex-1 m-0 p-6">
          <PersonalAIMemory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
