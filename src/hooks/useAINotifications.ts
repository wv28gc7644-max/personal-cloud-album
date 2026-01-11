import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

// ===================================================================
// Webhook Config Schema with Zod Validation
// ===================================================================

const WebhookConfigSchema = z.object({
  discord: z.object({
    enabled: z.boolean().optional().default(false),
    webhookUrl: z.string().optional().default(''),
  }).optional().default({ enabled: false, webhookUrl: '' }),
  telegram: z.object({
    enabled: z.boolean().optional().default(false),
    botToken: z.string().optional().default(''),
    chatId: z.string().optional().default(''),
  }).optional().default({ enabled: false, botToken: '', chatId: '' }),
});

type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  discord: { enabled: false, webhookUrl: '' },
  telegram: { enabled: false, botToken: '', chatId: '' },
};

/**
 * Safely get webhook config from localStorage with Zod validation
 */
const getWebhookConfig = (): WebhookConfig => {
  const saved = localStorage.getItem('mediavault-webhook-config');
  if (!saved) return DEFAULT_WEBHOOK_CONFIG;
  
  try {
    const parsed = JSON.parse(saved);
    const validated = WebhookConfigSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    console.warn('Invalid webhook config in localStorage, using defaults');
    return DEFAULT_WEBHOOK_CONFIG;
  } catch (e) {
    console.warn('Error parsing webhook config from localStorage:', e);
    return DEFAULT_WEBHOOK_CONFIG;
  }
};

/**
 * Safely save webhook config to localStorage
 */
const saveWebhookConfig = (config: WebhookConfig): void => {
  try {
    localStorage.setItem('mediavault-webhook-config', JSON.stringify(config));
  } catch (e) {
    console.error('Error saving webhook config to localStorage:', e);
  }
};

interface NotificationPayload {
  type: 'image_generated' | 'video_generated' | 'audio_transcribed' | 'workflow_completed' | 'upscale_completed' | 'music_generated';
  title: string;
  description: string;
  imageUrl?: string;
  duration?: number;
}

export function useAINotifications() {
  const [config, setConfig] = useState<WebhookConfig>(() => getWebhookConfig());

  const updateConfig = useCallback((updates: Partial<WebhookConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveWebhookConfig(newConfig);
  }, [config]);

  const sendDiscordNotification = useCallback(async (payload: NotificationPayload) => {
    if (!config.discord.enabled || !config.discord.webhookUrl) return;

    const typeEmojis = {
      image_generated: '🖼️',
      video_generated: '🎬',
      audio_transcribed: '🎤',
      workflow_completed: '✅',
      upscale_completed: '🔍',
      music_generated: '🎵'
    };

    const embed = {
      title: `${typeEmojis[payload.type]} ${payload.title}`,
      description: payload.description,
      color: 5814783, // Blue color
      timestamp: new Date().toISOString(),
      footer: { text: 'MediaVault AI' }
    };

    if (payload.imageUrl) {
      (embed as any).image = { url: payload.imageUrl };
    }

    try {
      await fetch(config.discord.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });
    } catch (error) {
      console.error('Discord notification failed:', error);
    }
  }, [config.discord]);

  const sendTelegramNotification = useCallback(async (payload: NotificationPayload) => {
    if (!config.telegram.enabled || !config.telegram.botToken || !config.telegram.chatId) return;

    const typeEmojis = {
      image_generated: '🖼️',
      video_generated: '🎬',
      audio_transcribed: '🎤',
      workflow_completed: '✅',
      upscale_completed: '🔍',
      music_generated: '🎵'
    };

    const message = `${typeEmojis[payload.type]} *${payload.title}*\n\n${payload.description}`;

    try {
      const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegram.chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      // Send image if available
      if (payload.imageUrl) {
        const photoUrl = `https://api.telegram.org/bot${config.telegram.botToken}/sendPhoto`;
        await fetch(photoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.telegram.chatId,
            photo: payload.imageUrl
          })
        });
      }
    } catch (error) {
      console.error('Telegram notification failed:', error);
    }
  }, [config.telegram]);

  const sendNotification = useCallback(async (payload: NotificationPayload) => {
    const promises = [];
    
    if (config.discord.enabled) {
      promises.push(sendDiscordNotification(payload));
    }
    
    if (config.telegram.enabled) {
      promises.push(sendTelegramNotification(payload));
    }
    
    await Promise.allSettled(promises);
  }, [config, sendDiscordNotification, sendTelegramNotification]);

  const testDiscord = useCallback(async () => {
    if (!config.discord.webhookUrl) {
      toast.error('URL du webhook Discord requise');
      return;
    }

    try {
      await sendDiscordNotification({
        type: 'workflow_completed',
        title: 'Test de notification',
        description: 'Si vous voyez ce message, les notifications Discord fonctionnent ! 🎉'
      });
      toast.success('Notification Discord envoyée !');
    } catch {
      toast.error('Échec de l\'envoi Discord');
    }
  }, [config.discord.webhookUrl, sendDiscordNotification]);

  const testTelegram = useCallback(async () => {
    if (!config.telegram.botToken || !config.telegram.chatId) {
      toast.error('Token et Chat ID Telegram requis');
      return;
    }

    try {
      await sendTelegramNotification({
        type: 'workflow_completed',
        title: 'Test de notification',
        description: 'Si vous voyez ce message, les notifications Telegram fonctionnent ! 🎉'
      });
      toast.success('Notification Telegram envoyée !');
    } catch {
      toast.error('Échec de l\'envoi Telegram');
    }
  }, [config.telegram, sendTelegramNotification]);

  return {
    config,
    updateConfig,
    sendNotification,
    testDiscord,
    testTelegram
  };
}
