import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Bot, Send, Mic, MicOff, X, Loader2, Sparkles, 
  Settings2, Image, FileText, BarChart3, Play,
  Upload, Volume2, VolumeX, Trash2, History,
  Zap, Brain, Command, Eye, Palette
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AIModelSelector, { AIModel } from './AIModelSelector';
import { useAIOrchestrator } from '@/hooks/useAIOrchestrator';
import { cn } from '@/lib/utils';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  command?: string;
}

interface AIAssistantEnhancedProps {
  onCommand?: (command: string) => void;
  mediaStats?: {
    totalMedia: number;
    totalPhotos: number;
    totalVideos: number;
    totalSize: string;
  };
}

// Available commands with descriptions
const COMMANDS = [
  { cmd: 'UPDATE', label: 'Mettre à jour', icon: Zap, description: 'Mettre à jour l\'application' },
  { cmd: 'SLIDESHOW', label: 'Diaporama', icon: Play, description: 'Lancer le diaporama' },
  { cmd: 'UPLOAD', label: 'Upload', icon: Upload, description: 'Ouvrir l\'upload de médias' },
  { cmd: 'STATS', label: 'Statistiques', icon: BarChart3, description: 'Voir les statistiques' },
  { cmd: 'ADMIN', label: 'Paramètres', icon: Settings2, description: 'Ouvrir les paramètres' },
  { cmd: 'AI_STUDIO', label: 'AI Studio', icon: Palette, description: 'Ouvrir l\'AI Studio' },
  { cmd: 'AI_CREATIONS', label: 'Créations IA', icon: Image, description: 'Voir les créations IA' },
];

const MODEL_COLORS: Record<AIModel, string> = {
  auto: 'bg-yellow-500/20 text-yellow-400',
  personal: 'bg-purple-500/20 text-purple-400',
  gemini: 'bg-blue-500/20 text-blue-400',
  grok: 'bg-foreground/20 text-foreground',
  ollama: 'bg-orange-500/20 text-orange-400'
};

const QUICK_PROMPTS = [
  { label: 'Résumer mes médias', prompt: 'Donne-moi un résumé de ma collection de médias' },
  { label: 'Organiser', prompt: 'Comment pourrais-je mieux organiser ma collection ?' },
  { label: 'Trouver doublons', prompt: 'Comment trouver et supprimer les doublons ?' },
  { label: 'Créer album', prompt: 'Aide-moi à créer un nouvel album thématique' },
];

export const AIAssistantEnhanced = ({ onCommand, mediaStats }: AIAssistantEnhancedProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const { toast } = useToast();
  
  const { selectedModel, setSelectedModel, chat, isLoading, lastUsedModel } = useAIOrchestrator();

  // System context with media stats
  const getSystemContext = useCallback(() => {
    let context = `Contexte actuel de l'application MediaVault:\n`;
    
    if (mediaStats) {
      context += `- Médias totaux: ${mediaStats.totalMedia}\n`;
      context += `- Photos: ${mediaStats.totalPhotos}\n`;
      context += `- Vidéos: ${mediaStats.totalVideos}\n`;
      context += `- Espace utilisé: ${mediaStats.totalSize}\n`;
    }
    
    context += `\nCommandes disponibles que tu peux suggérer:\n`;
    COMMANDS.forEach(c => {
      context += `- [CMD:${c.cmd}] - ${c.description}\n`;
    });
    
    return context;
  }, [mediaStats]);

  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Erreur",
          description: "Impossible d'accéder au microphone",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speakWithElevenLabs = async (text: string, voiceId: string = 'JBFqnCBsd6RMkjVDRZzb') => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ text, voiceId })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.audioContent) {
          const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => setIsSpeaking(false);
          await audio.play();
          return true;
        }
      }
      return false;
    } catch (e) {
      console.log('ElevenLabs TTS failed, using fallback');
      return false;
    }
  };

  const speak = async (text: string) => {
    if (!autoSpeak) return;
    
    const cleanText = text.replace(/\[CMD:[^\]]+\]/g, '').trim();
    if (!cleanText) return;
    
    // Try ElevenLabs first
    const success = await speakWithElevenLabs(cleanText);
    
    // Fallback to Web Speech API
    if (!success && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 1;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  const parseAndExecuteCommands = (text: string) => {
    const cmdMatches = text.matchAll(/\[CMD:([^\]]+)\]/g);
    for (const match of cmdMatches) {
      const command = match[1];
      if (onCommand) {
        onCommand(command);
        toast({
          title: "Commande exécutée",
          description: COMMANDS.find(c => c.cmd === command)?.description || command
        });
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const result = await chat([
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: messageText }
      ], getSystemContext());

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: result.content,
        timestamp: new Date(),
        model: result.model
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Parse commands and speak
      if (result.content) {
        parseAndExecuteCommands(result.content);
        speak(result.content);
      }

      // Show fallback notification
      if (result.fallbackUsed) {
        toast({
          title: "Modèle alternatif utilisé",
          description: `Réponse générée par ${result.model === 'personal' ? 'Mon IA' : result.model}`,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    }
  };

  const executeCommand = (command: string) => {
    if (onCommand) {
      onCommand(command);
      toast({
        title: "Commande exécutée",
        description: COMMANDS.find(c => c.cmd === command)?.description || command
      });
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Non supporté",
        description: "La reconnaissance vocale n'est pas disponible",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const clearHistory = () => {
    setMessages([]);
    toast({ title: "Historique effacé" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative group"
          title="Assistant IA"
        >
          <Bot className="h-4 w-4" />
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
          )}
          <span className="absolute inset-0 rounded-md bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[560px] flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b bg-card/50">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="h-5 w-5 text-primary" />
                <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
              </div>
              <span className="font-semibold">Assistant IA</span>
              {lastUsedModel && (
                <Badge variant="outline" className={cn("text-xs", MODEL_COLORS[lastUsedModel])}>
                  {lastUsedModel === 'personal' ? 'Mon IA' : lastUsedModel}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setAutoSpeak(!autoSpeak)}
                title={autoSpeak ? "Désactiver la voix" : "Activer la voix"}
              >
                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <AIModelSelector 
                value={selectedModel} 
                onChange={setSelectedModel}
                compact
              />
              {isSpeaking && (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={stopSpeaking}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 px-4 py-2 bg-card/30">
            <TabsTrigger value="chat" className="gap-1 text-xs">
              <Bot className="h-3 w-3" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="commands" className="gap-1 text-xs">
              <Command className="h-3 w-3" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="context" className="gap-1 text-xs">
              <Eye className="h-3 w-3" />
              Contexte
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 data-[state=active]:flex">
            {/* Quick Prompts */}
            {messages.length === 0 && (
              <div className="px-4 py-3 border-b">
                <p className="text-xs text-muted-foreground mb-2">Suggestions rapides</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_PROMPTS.map((qp, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleSend(qp.prompt)}
                    >
                      {qp.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
              <div className="space-y-4 py-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <div className="relative inline-block">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-primary animate-pulse" />
                    </div>
                    <p className="font-medium">Salut ! Je suis ton assistant IA.</p>
                    <p className="text-sm mt-2">Je peux t'aider à gérer tes médias, naviguer dans l'app, et bien plus.</p>
                    <p className="text-xs mt-4 text-muted-foreground/70">
                      Modèle: {selectedModel === 'auto' ? 'Automatique' : selectedModel === 'personal' ? 'Mon IA' : selectedModel}
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm">
                        {msg.content.replace(/\[CMD:[^\]]+\]/g, '')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] opacity-60">
                          {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.model && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {msg.model}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-card/30">
              {messages.length > 0 && (
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 gap-1 text-muted-foreground"
                    onClick={clearHistory}
                  >
                    <Trash2 className="h-3 w-3" />
                    Effacer
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Écris ton message..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={isLoading || isListening}
                  className="flex-1"
                />
                <Button 
                  onClick={() => handleSend()} 
                  disabled={isLoading || !input.trim()}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Commands Tab */}
          <TabsContent value="commands" className="flex-1 p-4 mt-0">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Contrôle rapide de l'application
              </p>
              <div className="grid grid-cols-2 gap-2">
                {COMMANDS.map((cmd) => (
                  <Button
                    key={cmd.cmd}
                    variant="outline"
                    className="h-auto py-3 flex-col items-start gap-1"
                    onClick={() => executeCommand(cmd.cmd)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <cmd.icon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{cmd.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      {cmd.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Context Tab */}
          <TabsContent value="context" className="flex-1 p-4 mt-0">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Statistiques accessibles
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{mediaStats?.totalMedia || 0}</div>
                    <div className="text-xs text-muted-foreground">Médias totaux</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{mediaStats?.totalPhotos || 0}</div>
                    <div className="text-xs text-muted-foreground">Photos</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{mediaStats?.totalVideos || 0}</div>
                    <div className="text-xs text-muted-foreground">Vidéos</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{mediaStats?.totalSize || '0 MB'}</div>
                    <div className="text-xs text-muted-foreground">Espace utilisé</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Ce que l'IA peut faire
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Naviguer dans l'application
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Analyser vos médias et statistiques
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Donner des conseils d'organisation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Exécuter des commandes (diaporama, upload, etc.)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Répondre vocalement
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Créer du contenu IA (images, vidéos, musique)
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Modèle actuel
                </h4>
                <AIModelSelector 
                  value={selectedModel} 
                  onChange={setSelectedModel}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
