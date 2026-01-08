import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_SYSTEM_PROMPT = `Tu es Mon IA, un assistant personnel intelligent et adaptable. Tu apprends des interactions avec l'utilisateur pour devenir plus utile au fil du temps. Tu es amical, concis et toujours prêt à aider.`;

const PERSONALITY_PRESETS = [
  { id: 'friendly', name: 'Amical', description: 'Ton chaleureux et accessible' },
  { id: 'professional', name: 'Professionnel', description: 'Ton formel et précis' },
  { id: 'creative', name: 'Créatif', description: 'Ton imaginatif et original' },
  { id: 'concise', name: 'Concis', description: 'Réponses courtes et directes' },
  { id: 'custom', name: 'Personnalisé', description: 'Définir votre propre ton' },
];

export function PersonalAISettings() {
  const [aiName, setAiName] = useState(() => 
    localStorage.getItem('mediavault-personal-ai-name') || 'Mon IA'
  );
  const [systemPrompt, setSystemPrompt] = useState(() => 
    localStorage.getItem('mediavault-personal-ai-prompt') || DEFAULT_SYSTEM_PROMPT
  );
  const [personality, setPersonality] = useState(() => 
    localStorage.getItem('mediavault-personal-ai-personality') || 'friendly'
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('mediavault-personal-ai-name') || 'Mon IA';
    const savedPrompt = localStorage.getItem('mediavault-personal-ai-prompt') || DEFAULT_SYSTEM_PROMPT;
    const savedPersonality = localStorage.getItem('mediavault-personal-ai-personality') || 'friendly';
    
    setHasChanges(
      aiName !== savedName || 
      systemPrompt !== savedPrompt || 
      personality !== savedPersonality
    );
  }, [aiName, systemPrompt, personality]);

  const handleSave = () => {
    localStorage.setItem('mediavault-personal-ai-name', aiName);
    localStorage.setItem('mediavault-personal-ai-prompt', systemPrompt);
    localStorage.setItem('mediavault-personal-ai-personality', personality);
    setHasChanges(false);
    toast.success('Configuration de Mon IA sauvegardée');
    window.dispatchEvent(new CustomEvent('mediavault-personal-ai-changed'));
  };

  const handleReset = () => {
    setAiName('Mon IA');
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setPersonality('friendly');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Configuration de Mon IA
          </CardTitle>
          <CardDescription>Personnalisez le comportement et la personnalité de votre assistant IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nom de l'IA */}
          <div className="space-y-2">
            <Label htmlFor="ai-name">Nom de l'IA</Label>
            <Input
              id="ai-name"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              placeholder="Mon IA"
            />
          </div>

          {/* Personnalité */}
          <div className="space-y-2">
            <Label>Personnalité</Label>
            <Select value={personality} onValueChange={setPersonality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERSONALITY_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex flex-col">
                      <span>{preset.name}</span>
                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Prompt système</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Décrivez le comportement de votre IA..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Ce texte définit le comportement et le contexte de base de votre IA
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
              <Save className="w-4 h-4" />
              Sauvegarder
            </Button>
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        💡 Pour configurer Ollama et les modèles IA, allez dans "IA Locale" dans les paramètres
      </p>
    </div>
  );
}
