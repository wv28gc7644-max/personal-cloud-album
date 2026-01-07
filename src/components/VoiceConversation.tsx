import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff,
  Loader2, Sparkles, MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAIOrchestrator } from "@/hooks/useAIOrchestrator";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface VoiceConversationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterName?: string;
  characterAvatar?: string;
  voiceId?: string;
}

export default function VoiceConversation({
  open,
  onOpenChange,
  characterName = "Assistant IA",
  characterAvatar = "🤖",
  voiceId = "JBFqnCBsd6RMkjVDRZzb" // George par défaut
}: VoiceConversationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { chat, selectedModel } = useAIOrchestrator();

  // Setup speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "fr-FR";

        recognitionRef.current.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setCurrentTranscript(transcript);

          // Si résultat final, envoyer le message
          if (event.results[event.results.length - 1].isFinal) {
            handleUserMessage(transcript);
            setCurrentTranscript("");
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting recognition:", e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speakText = useCallback(async (text: string) => {
    if (isMuted) return;
    
    setIsSpeaking(true);
    
    try {
      // Essayer ElevenLabs TTS
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ text, voiceId })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.audioContent) {
          const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
          audioRef.current = new Audio(audioUrl);
          audioRef.current.onended = () => setIsSpeaking(false);
          await audioRef.current.play();
          return;
        }
      }
      
      // Fallback vers Web Speech API
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS error:", error);
      // Fallback vers Web Speech API
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  }, [isMuted, voiceId]);

  const handleUserMessage = useCallback(async (content: string) => {
    if (!content.trim() || isProcessing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    stopListening();

    try {
      const result = await chat([
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: content.trim() }
      ]);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.content
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Lire la réponse
      await speakText(result.content);
      
      // Reprendre l'écoute après la réponse
      setTimeout(() => {
        if (open) startListening();
      }, 500);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Erreur de communication");
    } finally {
      setIsProcessing(false);
    }
  }, [messages, chat, speakText, open, startListening, stopListening, isProcessing]);

  const toggleMute = () => {
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
    speechSynthesis.cancel();
    setIsMuted(!isMuted);
  };

  const endConversation = () => {
    stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    speechSynthesis.cancel();
    onOpenChange(false);
  };

  // Auto-start listening when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(startListening, 500);
    } else {
      stopListening();
    }
  }, [open, startListening, stopListening]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="flex flex-col h-[80vh]">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 text-center">
            <div className="text-6xl mb-3">{characterAvatar}</div>
            <h2 className="text-xl font-bold">{characterName}</h2>
            <div className="flex justify-center gap-2 mt-2">
              {isListening && (
                <Badge variant="secondary" className="animate-pulse">
                  <Mic className="h-3 w-3 mr-1" />
                  Écoute...
                </Badge>
              )}
              {isSpeaking && (
                <Badge variant="secondary" className="animate-pulse">
                  <Volume2 className="h-3 w-3 mr-1" />
                  Parle...
                </Badge>
              )}
              {isProcessing && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Réflexion...
                </Badge>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Commencez à parler...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current transcript */}
            {currentTranscript && (
              <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm italic">{currentTranscript}</p>
              </div>
            )}
          </ScrollArea>

          {/* Audio visualization */}
          {(isListening || isSpeaking) && (
            <div className="h-16 flex items-center justify-center gap-1 px-4">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isSpeaking ? "bg-primary" : "bg-muted-foreground"
                  }`}
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="p-4 border-t flex justify-center gap-4">
            <Button
              size="lg"
              variant={isListening ? "default" : "outline"}
              className="rounded-full h-14 w-14"
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || isSpeaking}
            >
              {isListening ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>

            <Button
              size="lg"
              variant={isMuted ? "destructive" : "outline"}
              className="rounded-full h-14 w-14"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </Button>

            <Button
              size="lg"
              variant="destructive"
              className="rounded-full h-14 w-14"
              onClick={endConversation}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
