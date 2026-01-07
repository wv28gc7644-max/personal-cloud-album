import { useState, useCallback, useEffect } from 'react';

export interface LocalAIModel {
  name: string;
  size: string;
  modifiedAt: string;
  digest: string;
  details?: {
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

export interface GPUProfile {
  id: 'cpu' | 'rtx3080' | 'rtx3090' | 'rtx4080' | 'rtx4090';
  name: string;
  vram: string;
  recommendedModels: string[];
}

export const GPU_PROFILES: GPUProfile[] = [
  {
    id: 'cpu',
    name: 'CPU uniquement',
    vram: '0 GB',
    recommendedModels: ['mistral:7b-instruct-q4_0', 'phi3:mini', 'gemma:2b']
  },
  {
    id: 'rtx3080',
    name: 'RTX 3080 / 4080',
    vram: '10-16 GB',
    recommendedModels: ['nous-hermes2:10.7b-solar', 'dolphin-mixtral:8x7b-q3', 'llama3:8b']
  },
  {
    id: 'rtx3090',
    name: 'RTX 3090',
    vram: '24 GB',
    recommendedModels: ['dolphin-mixtral:8x7b-q5', 'qwen2.5:32b', 'codellama:34b']
  },
  {
    id: 'rtx4090',
    name: 'RTX 4090',
    vram: '24 GB',
    recommendedModels: ['qwen2.5:72b-instruct-q4', 'deepseek-coder:33b', 'mixtral:8x22b']
  }
];

export interface LocalAIConfig {
  enabled: boolean;
  ollamaUrl: string;
  comfyuiUrl: string;
  whisperModel: string;
  selectedModel: string;
  gpuProfile: GPUProfile['id'];
  priorityMode: 'quality' | 'balanced' | 'speed';
}

const DEFAULT_CONFIG: LocalAIConfig = {
  enabled: false,
  ollamaUrl: 'http://localhost:11434',
  comfyuiUrl: 'http://localhost:8188',
  whisperModel: 'whisper:base',
  selectedModel: 'mistral:7b-instruct',
  gpuProfile: 'cpu',
  priorityMode: 'balanced'
};

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useLocalAI() {
  const [config, setConfig] = useState<LocalAIConfig>(() => {
    const saved = localStorage.getItem('localai-config');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<LocalAIModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('localai-config', JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback((updates: Partial<LocalAIConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${config.ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      const modelList: LocalAIModel[] = data.models?.map((m: any) => ({
        name: m.name,
        size: formatBytes(m.size),
        modifiedAt: m.modified_at,
        digest: m.digest,
        details: m.details
      })) || [];
      
      setModels(modelList);
      setIsConnected(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connexion impossible';
      setError(message);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config.ollamaUrl]);

  const chat = useCallback(async (
    messages: Message[],
    onDelta?: (text: string) => void
  ): Promise<string> => {
    if (!config.enabled) {
      throw new Error('IA locale désactivée');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${config.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.selectedModel,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur Ollama: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('Pas de corps de réponse');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              fullContent += parsed.message.content;
              onDelta?.(parsed.message.content);
            }
          } catch {
            // Ignore parse errors for partial lines
          }
        }
      }
      
      return fullContent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chat';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config.enabled, config.ollamaUrl, config.selectedModel]);

  const generate = useCallback(async (
    prompt: string,
    systemPrompt?: string,
    onDelta?: (text: string) => void
  ): Promise<string> => {
    const messages: Message[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    
    return chat(messages, onDelta);
  }, [chat]);

  const pullModel = useCallback(async (
    modelName: string,
    onProgress?: (status: string, completed: number, total: number) => void
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${config.ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur de téléchargement: ${response.status}`);
      }
      
      if (!response.body) return false;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            onProgress?.(
              parsed.status || 'Téléchargement...',
              parsed.completed || 0,
              parsed.total || 100
            );
          } catch {
            // Ignore parse errors
          }
        }
      }
      
      // Refresh model list
      await testConnection();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de téléchargement';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config.ollamaUrl, testConnection]);

  const deleteModel = useCallback(async (modelName: string): Promise<boolean> => {
    try {
      const response = await fetch(`${config.ollamaUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      
      if (response.ok) {
        await testConnection();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [config.ollamaUrl, testConnection]);

  return {
    config,
    updateConfig,
    isConnected,
    isLoading,
    models,
    error,
    testConnection,
    chat,
    generate,
    pullModel,
    deleteModel,
    gpuProfiles: GPU_PROFILES
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
