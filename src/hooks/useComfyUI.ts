import { useState, useCallback, useRef, useEffect } from 'react';

export interface ComfyUIConfig {
  url: string;
  enabled: boolean;
}

export interface GenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  seed?: number;
  batchSize?: number;
}

export interface GenerationProgress {
  status: 'idle' | 'queued' | 'generating' | 'complete' | 'error';
  progress: number;
  currentStep?: number;
  totalSteps?: number;
  previewImage?: string;
}

const DEFAULT_CONFIG: ComfyUIConfig = {
  url: 'http://localhost:8188',
  enabled: false
};

// Basic txt2img workflow for SDXL
const createWorkflow = (params: GenerationParams, clientId: string) => {
  const seed = params.seed ?? Math.floor(Math.random() * 1000000000);
  
  return {
    "3": {
      "inputs": {
        "seed": seed,
        "steps": params.steps || 20,
        "cfg": params.cfg || 7,
        "sampler_name": params.sampler || "euler",
        "scheduler": params.scheduler || "normal",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": {
        "ckpt_name": "sd_xl_base_1.0.safetensors"
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "width": params.width || 1024,
        "height": params.height || 1024,
        "batch_size": params.batchSize || 1
      },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": {
        "text": params.prompt,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": {
        "text": params.negativePrompt || "ugly, blurry, low quality",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "filename_prefix": "ComfyUI",
        "images": ["8", 0]
      },
      "class_type": "SaveImage"
    }
  };
};

export function useComfyUI() {
  const [config, setConfig] = useState<ComfyUIConfig>(() => {
    const saved = localStorage.getItem('comfyui-config');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    status: 'idle',
    progress: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(crypto.randomUUID());

  // Save config
  useEffect(() => {
    localStorage.setItem('comfyui-config', JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback((updates: Partial<ComfyUIConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${config.url}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      setIsConnected(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config.url]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = config.url.replace('http', 'ws');
    wsRef.current = new WebSocket(`${wsUrl}/ws?clientId=${clientIdRef.current}`);
    
    wsRef.current.onopen = () => {
      console.log('ComfyUI WebSocket connecté');
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'progress') {
          setProgress({
            status: 'generating',
            progress: (message.data.value / message.data.max) * 100,
            currentStep: message.data.value,
            totalSteps: message.data.max
          });
        } else if (message.type === 'executing') {
          if (message.data.node === null) {
            setProgress({ status: 'complete', progress: 100 });
          }
        } else if (message.type === 'executed') {
          // Execution complete for a node
          if (message.data.output?.images) {
            const images = message.data.output.images.map((img: any) => 
              `${config.url}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`
            );
            setGeneratedImages(prev => [...prev, ...images]);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };
    
    wsRef.current.onerror = () => {
      setError('Erreur WebSocket');
    };
    
    wsRef.current.onclose = () => {
      console.log('ComfyUI WebSocket déconnecté');
    };
  }, [config.url]);

  const generate = useCallback(async (params: GenerationParams): Promise<string[]> => {
    if (!config.enabled) {
      throw new Error('ComfyUI désactivé');
    }
    
    setIsLoading(true);
    setError(null);
    setProgress({ status: 'queued', progress: 0 });
    setGeneratedImages([]);
    
    try {
      // Connect WebSocket for progress
      connectWebSocket();
      
      const workflow = createWorkflow(params, clientIdRef.current);
      
      const response = await fetch(`${config.url}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: workflow,
          client_id: clientIdRef.current
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ComfyUI: ${response.status}`);
      }
      
      const result = await response.json();
      const promptId = result.prompt_id;
      
      // Poll for completion
      let complete = false;
      while (!complete) {
        await new Promise(r => setTimeout(r, 1000));
        
        const historyRes = await fetch(`${config.url}/history/${promptId}`);
        if (historyRes.ok) {
          const history = await historyRes.json();
          if (history[promptId]) {
            complete = true;
            
            // Extract images from outputs
            const outputs = history[promptId].outputs;
            const images: string[] = [];
            
            for (const nodeId in outputs) {
              if (outputs[nodeId].images) {
                for (const img of outputs[nodeId].images) {
                  images.push(
                    `${config.url}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`
                  );
                }
              }
            }
            
            setGeneratedImages(images);
            setProgress({ status: 'complete', progress: 100 });
            return images;
          }
        }
      }
      
      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de génération';
      setError(message);
      setProgress({ status: 'error', progress: 0 });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config.enabled, config.url, connectWebSocket]);

  const getModels = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(`${config.url}/object_info/CheckpointLoaderSimple`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
    } catch {
      return [];
    }
  }, [config.url]);

  const getSamplers = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(`${config.url}/object_info/KSampler`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.KSampler?.input?.required?.sampler_name?.[0] || [];
    } catch {
      return [];
    }
  }, [config.url]);

  const interrupt = useCallback(async () => {
    try {
      await fetch(`${config.url}/interrupt`, { method: 'POST' });
      setProgress({ status: 'idle', progress: 0 });
    } catch {
      // Ignore errors
    }
  }, [config.url]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    config,
    updateConfig,
    isConnected,
    isLoading,
    progress,
    error,
    generatedImages,
    testConnection,
    generate,
    getModels,
    getSamplers,
    interrupt
  };
}
