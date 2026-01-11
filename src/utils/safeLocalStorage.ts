/**
 * Safe localStorage utilities with Zod validation
 * Prevents crashes and unexpected behavior from corrupted/tampered localStorage data
 */
import { z } from 'zod';

// ===================================================================
// Admin Settings Schema & Helpers
// ===================================================================

export const AdminSettingsSchema = z.object({
  gridColumns: z.number().min(1).max(6).optional().default(3),
  cardStyle: z.enum(['twitter', 'grid', 'compact']).optional().default('twitter'),
  theme: z.enum(['dark', 'light', 'system']).optional().default('dark'),
  autoPlay: z.boolean().optional().default(false),
  showMetadata: z.boolean().optional().default(true),
  localServerUrl: z.string().optional().default('http://localhost:3001'),
  serverUrl: z.string().optional(), // Alternative key used in some components
});

export type AdminSettings = z.infer<typeof AdminSettingsSchema>;

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  gridColumns: 3,
  cardStyle: 'twitter',
  theme: 'dark',
  autoPlay: false,
  showMetadata: true,
  localServerUrl: 'http://localhost:3001',
};

export const getAdminSettings = (): AdminSettings => {
  const saved = localStorage.getItem('mediavault-admin-settings');
  if (!saved) return DEFAULT_ADMIN_SETTINGS;
  
  try {
    const parsed = JSON.parse(saved);
    const validated = AdminSettingsSchema.safeParse(parsed);
    if (validated.success) {
      return { ...DEFAULT_ADMIN_SETTINGS, ...validated.data };
    }
    console.warn('Invalid admin settings in localStorage, using defaults');
    return DEFAULT_ADMIN_SETTINGS;
  } catch (e) {
    console.warn('Error parsing admin settings from localStorage:', e);
    return DEFAULT_ADMIN_SETTINGS;
  }
};

export const saveAdminSettings = (settings: Partial<AdminSettings>): void => {
  const current = getAdminSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem('mediavault-admin-settings', JSON.stringify(merged));
};

// ===================================================================
// Local Server URL Helper (centralized)
// ===================================================================

export const getLocalServerUrl = (): string => {
  // 1) Check direct key first (used by ServerSettings)
  const direct = localStorage.getItem('mediavault-server-url');
  if (direct && typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  // 2) Fall back to admin settings
  const settings = getAdminSettings();
  return settings.localServerUrl || settings.serverUrl || 'http://localhost:3001';
};

// ===================================================================
// AI Creations Schema & Helpers
// ===================================================================

export const AICreationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'video', 'audio', 'music', 'voice', 'montage']),
  url: z.string(),
  thumbnail: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  duration: z.number().optional(),
  size: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export type AICreation = z.infer<typeof AICreationSchema>;

export const getAICreations = (): AICreation[] => {
  const saved = localStorage.getItem('ai-creations');
  if (!saved) return [];
  
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    
    // Validate and filter valid items
    return parsed
      .map(item => AICreationSchema.safeParse(item))
      .filter((result): result is z.SafeParseSuccess<AICreation> => result.success)
      .map(result => result.data);
  } catch (e) {
    console.warn('Error parsing AI creations from localStorage:', e);
    return [];
  }
};

export const saveAICreations = (creations: AICreation[]): void => {
  localStorage.setItem('ai-creations', JSON.stringify(creations));
};

// ===================================================================
// Auto Sync Settings Schema & Helpers
// ===================================================================

export const AutoSyncSettingsSchema = z.object({
  enabled: z.boolean().optional().default(false),
  intervalSeconds: z.number().min(10).max(3600).optional().default(60),
});

export type AutoSyncSettings = z.infer<typeof AutoSyncSettingsSchema>;

export const DEFAULT_AUTOSYNC_SETTINGS: AutoSyncSettings = {
  enabled: false,
  intervalSeconds: 60,
};

export const getAutoSyncSettings = (): AutoSyncSettings => {
  const saved = localStorage.getItem('mediavault-autosync-settings');
  if (!saved) return DEFAULT_AUTOSYNC_SETTINGS;
  
  try {
    const parsed = JSON.parse(saved);
    const validated = AutoSyncSettingsSchema.safeParse(parsed);
    if (validated.success) {
      return { ...DEFAULT_AUTOSYNC_SETTINGS, ...validated.data };
    }
    return DEFAULT_AUTOSYNC_SETTINGS;
  } catch {
    return DEFAULT_AUTOSYNC_SETTINGS;
  }
};

// ===================================================================
// Compression Settings Schema & Helpers
// ===================================================================

export const CompressionSettingsSchema = z.object({
  codec: z.enum(['h265', 'av1', 'h264']).optional().default('h265'),
  quality: z.enum(['low', 'medium', 'high', 'lossless']).optional().default('medium'),
  resolution: z.enum(['original', '1080p', '720p', '480p']).optional().default('original'),
  keepOriginal: z.boolean().optional().default(true),
});

export type CompressionSettings = z.infer<typeof CompressionSettingsSchema>;

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  codec: 'h265',
  quality: 'medium',
  resolution: 'original',
  keepOriginal: true,
};

export const getCompressionSettings = (): CompressionSettings => {
  const saved = localStorage.getItem('mediavault-compression-settings');
  if (!saved) return DEFAULT_COMPRESSION_SETTINGS;
  
  try {
    const parsed = JSON.parse(saved);
    const validated = CompressionSettingsSchema.safeParse(parsed);
    if (validated.success) {
      return { ...DEFAULT_COMPRESSION_SETTINGS, ...validated.data };
    }
    return DEFAULT_COMPRESSION_SETTINGS;
  } catch {
    return DEFAULT_COMPRESSION_SETTINGS;
  }
};

// ===================================================================
// Generic Safe Parse Helper
// ===================================================================

/**
 * Safely parse localStorage data with optional schema validation
 * @param key - localStorage key
 * @param defaultValue - default value if parsing fails
 * @param schema - optional Zod schema for validation
 */
export function safeGetLocalStorage<T>(
  key: string,
  defaultValue: T,
  schema?: z.ZodType<T>
): T {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultValue;
  
  try {
    const parsed = JSON.parse(saved);
    
    if (schema) {
      const validated = schema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
      console.warn(`Invalid data for ${key}, using defaults`);
      return defaultValue;
    }
    
    return parsed as T;
  } catch (e) {
    console.warn(`Error parsing ${key} from localStorage:`, e);
    return defaultValue;
  }
}

/**
 * Safely set localStorage data
 */
export function safeSetLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}
