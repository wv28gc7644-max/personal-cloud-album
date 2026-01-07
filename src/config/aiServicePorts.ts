/**
 * AI Service Port Configuration
 * Maps each service to its possible ports (Windows scripts vs Docker)
 */

export interface AIServicePortConfig {
  id: string;
  name: string;
  ports: number[]; // First = Windows/BAT default, Second = Docker default
  healthEndpoint: string;
  capabilities: string[];
  installPath?: string;
}

export const AI_SERVICE_CONFIGS: AIServicePortConfig[] = [
  {
    id: 'ollama',
    name: 'Ollama (LLM)',
    ports: [11434],
    healthEndpoint: '/api/tags',
    capabilities: ['Chat', 'Génération de texte', 'Embeddings'],
  },
  {
    id: 'comfyui',
    name: 'ComfyUI (Images)',
    ports: [8188],
    healthEndpoint: '/system_stats',
    capabilities: ['Génération d\'images', 'Inpainting', 'ControlNet', 'AnimateDiff'],
    installPath: 'ComfyUI'
  },
  {
    id: 'whisper',
    name: 'Whisper (STT)',
    ports: [9000],
    healthEndpoint: '/health',
    capabilities: ['Transcription audio', 'Détection de langue'],
    installPath: 'whisper-api'
  },
  {
    id: 'xtts',
    name: 'XTTS (TTS)',
    ports: [8020],
    healthEndpoint: '/health',
    capabilities: ['Synthèse vocale', 'Clonage de voix'],
    installPath: 'xtts-api'
  },
  {
    id: 'musicgen',
    name: 'MusicGen',
    ports: [9001, 8030], // Windows BAT, then Docker
    healthEndpoint: '/health',
    capabilities: ['Génération musicale'],
    installPath: 'musicgen-api'
  },
  {
    id: 'demucs',
    name: 'Demucs',
    ports: [9002, 8040], // Windows BAT, then Docker
    healthEndpoint: '/health',
    capabilities: ['Séparation de stems audio'],
    installPath: 'demucs-api'
  },
  {
    id: 'clip',
    name: 'CLIP (Analyse)',
    ports: [9003, 8060], // Windows BAT, then Docker
    healthEndpoint: '/health',
    capabilities: ['Analyse d\'images', 'Recherche sémantique'],
    installPath: 'clip-api'
  },
  {
    id: 'esrgan',
    name: 'ESRGAN (Upscale)',
    ports: [9004, 8070], // Windows BAT, then Docker
    healthEndpoint: '/health',
    capabilities: ['Upscaling d\'images', 'Super-résolution'],
    installPath: 'esrgan-api'
  }
];

// Helper to get port mode label
export const getPortModeLabel = (serviceId: string, detectedPort: number): string | null => {
  const config = AI_SERVICE_CONFIGS.find(c => c.id === serviceId);
  if (!config || config.ports.length <= 1) return null;
  
  const portIndex = config.ports.indexOf(detectedPort);
  if (portIndex === 0) return 'Windows';
  if (portIndex === 1) return 'Docker';
  return 'Custom';
};

// Get all candidate ports for a service
export const getServicePorts = (serviceId: string): number[] => {
  const config = AI_SERVICE_CONFIGS.find(c => c.id === serviceId);
  return config?.ports || [];
};

// Get health endpoint for a service
export const getHealthEndpoint = (serviceId: string): string => {
  const config = AI_SERVICE_CONFIGS.find(c => c.id === serviceId);
  return config?.healthEndpoint || '/health';
};
