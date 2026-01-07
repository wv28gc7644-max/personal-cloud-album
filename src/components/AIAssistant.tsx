import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bot, Send, Mic, MicOff, X, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AIModelSelector, { AIModel } from './AIModelSelector';
import { useAIOrchestrator } from '@/hooks/useAIOrchestrator';
import { supabase } from '@/integrations/supabase/client';

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
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  onCommand?: (command: string) => void;
}

const MODEL_COLORS: Record<AIModel, string> = {
  auto: 'bg-yellow-500/20 text-yellow-500',
  personal: 'bg-purple-500/20 text-purple-500',
  gemini: 'bg-blue-500/20 text-blue-500',
  grok: 'bg-foreground/20 text-foreground',
  ollama: 'bg-orange-500/20 text-orange-500'
};

export const AIAssistant = ({ onCommand }: AIAssistantProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const { toast } = useToast();
  
  const { selectedModel, setSelectedModel, chat, isLoading, lastUsedModel } = useAIOrchestrator();

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
    const cleanText = text.replace(/\[CMD:[^\]]+\]/g, '');
    
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

  const parseCommands = (text: string) => {
    const cmdMatch = text.match(/\[CMD:([^\]]+)\]/);
    if (cmdMatch && onCommand) {
      onCommand(cmdMatch[1]);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const result = await chat([
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: messageText }
      ]);

      const assistantMessage: Message = { role: 'assistant', content: result.content };
      setMessages(prev => [...prev, assistantMessage]);

      // Parse commands and speak
      if (result.content) {
        parseCommands(result.content);
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
          title="Assistant IA"
        >
          <Bot className="h-4 w-4" />
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Assistant IA
              {lastUsedModel && (
                <Badge variant="outline" className={MODEL_COLORS[lastUsedModel]}>
                  {lastUsedModel === 'personal' ? 'Mon IA' : lastUsedModel}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <AIModelSelector 
                value={selectedModel} 
                onChange={setSelectedModel}
                compact
              />
              {isSpeaking && (
                <Button size="sm" variant="ghost" onClick={stopSpeaking}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 mt-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <div className="relative inline-block">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-primary animate-pulse" />
                </div>
                <p>Salut ! Je suis ton assistant IA.</p>
                <p className="text-sm mt-2">Parle-moi ou écris-moi pour commencer.</p>
                <p className="text-xs mt-4 text-muted-foreground/70">
                  Modèle actuel : {selectedModel === 'auto' ? 'Automatique' : selectedModel === 'personal' ? 'Mon IA' : selectedModel}
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content.replace(/\[CMD:[^\]]+\]/g, '')}</p>
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

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={toggleListening}
            disabled={isLoading}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écris ton message..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading || isListening}
          />
          <Button onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
