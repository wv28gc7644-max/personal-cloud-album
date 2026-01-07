import { useState, useEffect } from 'react';
import { useLocalAI, GPU_PROFILES } from '@/hooks/useLocalAI';
import { useComfyUI } from '@/hooks/useComfyUI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Server,
  Cpu,
  Zap,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Image,
  MessageSquare,
  Gauge,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function LocalAISettings() {
  const {
    config: aiConfig,
    updateConfig: updateAIConfig,
    isConnected: ollamaConnected,
    isLoading: ollamaLoading,
    models,
    error: ollamaError,
    testConnection: testOllama,
    pullModel,
    deleteModel,
    gpuProfiles
  } = useLocalAI();

  const {
    config: comfyConfig,
    updateConfig: updateComfyConfig,
    isConnected: comfyConnected,
    isLoading: comfyLoading,
    error: comfyError,
    testConnection: testComfy
  } = useComfyUI();

  const [pullProgress, setPullProgress] = useState<{ model: string; status: string; progress: number } | null>(null);
  const [newModelName, setNewModelName] = useState('');

  // Test connections on mount
  useEffect(() => {
    if (aiConfig.enabled) {
      testOllama();
    }
    if (comfyConfig.enabled) {
      testComfy();
    }
  }, []);

  const handlePullModel = async () => {
    if (!newModelName.trim()) {
      toast.error('Entrez un nom de modèle');
      return;
    }

    setPullProgress({ model: newModelName, status: 'Démarrage...', progress: 0 });

    const success = await pullModel(newModelName, (status, completed, total) => {
      setPullProgress({
        model: newModelName,
        status,
        progress: total > 0 ? (completed / total) * 100 : 0
      });
    });

    if (success) {
      toast.success(`Modèle ${newModelName} installé`);
      setNewModelName('');
    } else {
      toast.error('Échec du téléchargement');
    }
    
    setPullProgress(null);
  };

  const handleDeleteModel = async (modelName: string) => {
    const success = await deleteModel(modelName);
    if (success) {
      toast.success(`Modèle ${modelName} supprimé`);
    } else {
      toast.error('Échec de la suppression');
    }
  };

  const currentProfile = gpuProfiles.find(p => p.id === aiConfig.gpuProfile);

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            IA Locale
          </CardTitle>
          <CardDescription>
            Utilisez vos propres modèles IA sur votre machine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div>
              <Label className="text-base font-medium">Activer l'IA locale</Label>
              <p className="text-sm text-muted-foreground">
                Utilise Ollama au lieu de Lovable AI (Gemini)
              </p>
            </div>
            <Switch
              checked={aiConfig.enabled}
              onCheckedChange={(checked) => updateAIConfig({ enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ollama" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ollama" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Ollama (Texte)
          </TabsTrigger>
          <TabsTrigger value="comfyui" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            ComfyUI (Images)
          </TabsTrigger>
        </TabsList>

        {/* Ollama Settings */}
        <TabsContent value="ollama" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Connexion Ollama
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>URL du serveur Ollama</Label>
                  <Input
                    value={aiConfig.ollamaUrl}
                    onChange={(e) => updateAIConfig({ ollamaUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => testOllama()}
                    disabled={ollamaLoading}
                  >
                    {ollamaLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                {ollamaConnected ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      Connecté - {models.length} modèle(s) disponible(s)
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 dark:text-red-400">
                      {ollamaError || 'Non connecté'}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* GPU Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Profil GPU
              </CardTitle>
              <CardDescription>
                Sélectionnez votre configuration matérielle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={aiConfig.gpuProfile}
                onValueChange={(v) => updateAIConfig({ gpuProfile: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gpuProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        <span>{profile.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {profile.vram}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentProfile && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">Modèles recommandés :</p>
                  <div className="flex flex-wrap gap-1">
                    {currentProfile.recommendedModels.map((model) => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                Priorité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'quality', label: 'Qualité', icon: Zap },
                  { id: 'balanced', label: 'Équilibré', icon: Gauge },
                  { id: 'speed', label: 'Rapidité', icon: RefreshCw }
                ].map((mode) => (
                  <Button
                    key={mode.id}
                    variant={aiConfig.priorityMode === mode.id ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-3"
                    onClick={() => updateAIConfig({ priorityMode: mode.id as any })}
                  >
                    <mode.icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{mode.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Modèle actif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={aiConfig.selectedModel}
                onValueChange={(v) => updateAIConfig({ selectedModel: v })}
                disabled={!ollamaConnected || models.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {model.size}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Models List */}
          <Card>
            <CardHeader>
              <CardTitle>Modèles installés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="mistral:7b-instruct"
                  disabled={!ollamaConnected || !!pullProgress}
                />
                <Button
                  onClick={handlePullModel}
                  disabled={!ollamaConnected || !newModelName.trim() || !!pullProgress}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>

              {pullProgress && (
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{pullProgress.model}</span>
                    <span>{pullProgress.status}</span>
                  </div>
                  <Progress value={pullProgress.progress} />
                </div>
              )}

              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {models.map((model) => (
                    <div
                      key={model.name}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        aiConfig.selectedModel === model.name && "border-primary bg-primary/5"
                      )}
                    >
                      <div>
                        <p className="font-medium">{model.name}</p>
                        <p className="text-xs text-muted-foreground">{model.size}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateAIConfig({ selectedModel: model.name })}
                        >
                          Utiliser
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteModel(model.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {models.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun modèle installé
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ComfyUI Settings */}
        <TabsContent value="comfyui" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Connexion ComfyUI
              </CardTitle>
              <CardDescription>
                Génération d'images avec Stable Diffusion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                <div>
                  <Label className="text-base font-medium">Activer ComfyUI</Label>
                  <p className="text-sm text-muted-foreground">
                    Génération d'images locale
                  </p>
                </div>
                <Switch
                  checked={comfyConfig.enabled}
                  onCheckedChange={(checked) => updateComfyConfig({ enabled: checked })}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>URL ComfyUI</Label>
                  <Input
                    value={comfyConfig.url}
                    onChange={(e) => updateComfyConfig({ url: e.target.value })}
                    placeholder="http://localhost:8188"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => testComfy()}
                    disabled={comfyLoading}
                  >
                    {comfyLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                {comfyConnected ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      Connecté à ComfyUI
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 dark:text-red-400">
                      {comfyError || 'Non connecté'}
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Installation Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Installation ComfyUI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                <p># Cloner ComfyUI</p>
                <p>git clone https://github.com/comfyanonymous/ComfyUI</p>
                <p>cd ComfyUI</p>
                <p>pip install -r requirements.txt</p>
                <p className="mt-2"># Lancer</p>
                <p>python main.py --listen 0.0.0.0</p>
              </div>
              <p className="text-muted-foreground">
                Téléchargez des modèles depuis{' '}
                <a 
                  href="https://civitai.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Civitai
                </a>
                {' '}et placez-les dans le dossier <code className="bg-muted px-1 rounded">models/checkpoints/</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
