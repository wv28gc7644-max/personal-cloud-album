import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, Loader2, Brain, Sparkles } from "lucide-react";
import { usePersonalAI } from "@/hooks/usePersonalAI";
import { useLocalAI } from "@/hooks/useLocalAI";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  learned?: { type: string; content: string };
}

export default function PersonalAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const { config, getContextForPrompt, parseAndLearn } = usePersonalAI();
  const { config: aiConfig } = useLocalAI();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "fr-FR";

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Mode apprentissage : vérifier si c'est une commande d'apprentissage
      if (config.learningMode) {
        const learnResult = parseAndLearn(userMessage.content);
        if (learnResult.learned) {
          const response: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `✅ C'est noté ! J'ai appris: "${learnResult.content}"`,
            learned: { type: learnResult.type!, content: learnResult.content! }
          };
          setMessages(prev => [...prev, response]);
          setIsLoading(false);
          return;
        }
      }

      // Appeler Ollama
      const ollamaUrl = aiConfig?.ollamaUrl || "http://localhost:11434";
      const context = getContextForPrompt();

      const systemPrompt = `${config.systemPrompt}\n\n${context}`;

      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage.content }
      ];

      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi3:mini",
          messages: chatMessages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error("Ollama non disponible");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message?.content || "Je n'ai pas compris."
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erreur chat:", error);
      toast.error("Erreur de connexion à Mon IA", {
        description: "Vérifiez qu'Ollama est démarré avec le modèle phi3:mini"
      });
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "⚠️ Je ne suis pas disponible pour le moment. Vérifiez qu'Ollama est démarré et que le modèle phi3:mini est installé."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4">{config.avatar}</div>
            <h3 className="text-xl font-semibold mb-2">Bonjour ! Je suis {config.name}</h3>
            <p className="text-muted-foreground max-w-md">
              Je suis votre IA personnelle sans restrictions. Plus vous m'apprenez de choses, plus je deviens utile !
            </p>
            {config.learningMode && (
              <Badge variant="secondary" className="mt-4 gap-1">
                <Sparkles className="h-3 w-3" />
                Mode apprentissage actif
              </Badge>
            )}
          </div>
        ) : (
          <div className="space-y-4">
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
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                      <Brain className="h-3 w-3" />
                      {config.name}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.learned && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Appris: {message.learned.type}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={toggleListening}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={config.learningMode ? "Apprenez-moi quelque chose..." : "Écrivez votre message..."}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
