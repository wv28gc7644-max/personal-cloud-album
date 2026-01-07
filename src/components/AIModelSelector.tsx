import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Zap, Brain, Globe, Sparkles, ChevronDown } from "lucide-react";

export type AIModel = "auto" | "personal" | "gemini" | "grok" | "ollama";

interface AIModelOption {
  id: AIModel;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
}

const AI_MODELS: AIModelOption[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Sélection automatique du meilleur modèle",
    icon: <Zap className="h-4 w-4" />,
    color: "text-yellow-500",
    available: true
  },
  {
    id: "personal",
    name: "Mon IA",
    description: "Votre IA personnelle sans restrictions",
    icon: <Brain className="h-4 w-4" />,
    color: "text-purple-500",
    available: true
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Google Gemini 2.5 Flash",
    icon: <Globe className="h-4 w-4" />,
    color: "text-blue-500",
    available: true
  },
  {
    id: "grok",
    name: "Grok",
    description: "xAI Grok (nécessite clé API)",
    icon: <span className="text-sm font-bold">𝕏</span>,
    color: "text-foreground",
    available: true
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Modèles locaux via Ollama",
    icon: <span className="text-lg">🦙</span>,
    color: "text-orange-500",
    available: true
  }
];

interface AIModelSelectorProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
  compact?: boolean;
}

export default function AIModelSelector({ value, onChange, compact = false }: AIModelSelectorProps) {
  const selectedModel = AI_MODELS.find(m => m.id === value) || AI_MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={compact ? "sm" : "default"}
          className="gap-2"
        >
          <span className={selectedModel.color}>{selectedModel.icon}</span>
          {!compact && selectedModel.name}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Modèle IA
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {AI_MODELS.map(model => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onChange(model.id)}
            disabled={!model.available}
            className="flex items-start gap-3 py-2"
          >
            <span className={`mt-0.5 ${model.color}`}>{model.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{model.name}</span>
                {value === model.id && (
                  <Badge variant="secondary" className="text-xs px-1">Actif</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{model.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
