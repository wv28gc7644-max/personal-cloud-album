import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface WebhookConfig {
  discord: {
    enabled: boolean;
    webhookUrl: string;
  };
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
}

interface NotificationPayload {
  type: 'image_generated' | 'video_generated' | 'audio_transcribed' | 'workflow_completed' | 'upscale_completed' | 'music_generated';
  title: string;
  description: string;
  imageUrl?: string;
  duration?: number;
}

export function useAINotifications() {
  const [config, setConfig] = useState<WebhookConfig>(() => {
    const saved = localStorage.getItem('mediavault-webhook-config');
    return saved ? JSON.parse(saved) : {
      discord: { enabled: false, webhookUrl: '' },
      telegram: { enabled: false, botToken: '', chatId: '' }
    };
  });

  const updateConfig = useCallback((updates: Partial<WebhookConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('mediavault-webhook-config', JSON.stringify(newConfig));
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
