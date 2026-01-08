import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type AIEventType = 
  | 'generation_started'
  | 'generation_progress'
  | 'generation_completed'
  | 'generation_failed'
  | 'transcription_completed'
  | 'upscale_completed'
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'model_loaded'
  | 'model_unloaded'
  | 'queue_updated';

export interface AIEvent {
  id: string;
  type: AIEventType;
  title: string;
  message: string;
  progress?: number;
  metadata?: {
    taskId?: string;
    model?: string;
    duration?: number;
    outputUrl?: string;
    error?: string;
    queuePosition?: number;
  };
  timestamp: string;
  read: boolean;
}

export interface AIEventSubscriber {
  id: string;
  types: AIEventType[] | '*';
  callback: (event: AIEvent) => void;
}

interface AIPushNotificationsConfig {
  enabled: boolean;
  soundEnabled: boolean;
  showToast: boolean;
  browserNotifications: boolean;
  eventFilters: {
    [K in AIEventType]?: boolean;
  };
}

const DEFAULT_CONFIG: AIPushNotificationsConfig = {
  enabled: true,
  soundEnabled: true,
  showToast: true,
  browserNotifications: false,
  eventFilters: {
    generation_started: false,
    generation_progress: false,
    generation_completed: true,
    generation_failed: true,
    transcription_completed: true,
    upscale_completed: true,
    workflow_started: false,
    workflow_completed: true,
    workflow_failed: true,
    model_loaded: false,
    model_unloaded: false,
    queue_updated: false,
  },
};

const STORAGE_KEY = 'mediavault-ai-push-notifications';
const EVENTS_KEY = 'mediavault-ai-events';

// Event emitter for internal communication
class AIEventEmitter {
  private subscribers: AIEventSubscriber[] = [];
  private events: AIEvent[] = [];
  private maxEvents = 100;

  constructor() {
    // Load persisted events
    try {
      const saved = localStorage.getItem(EVENTS_KEY);
      if (saved) {
        this.events = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading AI events:', e);
    }
  }

  subscribe(subscriber: AIEventSubscriber) {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter(s => s.id !== subscriber.id);
    };
  }

  emit(event: Omit<AIEvent, 'id' | 'timestamp' | 'read'>) {
    const fullEvent: AIEvent = {
      ...event,
      id: `ai-event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.events.unshift(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Persist events
    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
    } catch (e) {
      console.error('Error saving AI events:', e);
    }

    // Notify subscribers
    this.subscribers.forEach(subscriber => {
      if (subscriber.types === '*' || subscriber.types.includes(event.type)) {
        subscriber.callback(fullEvent);
      }
    });

    // Dispatch custom event for components
    window.dispatchEvent(new CustomEvent('ai-push-event', { detail: fullEvent }));

    return fullEvent;
  }

  getEvents() {
    return this.events;
  }

  markAsRead(eventId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.read = true;
      localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
    }
  }

  markAllAsRead() {
    this.events.forEach(e => e.read = true);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
  }

  clearEvents() {
    this.events = [];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
  }

  getUnreadCount() {
    return this.events.filter(e => !e.read).length;
  }
}

// Singleton instance
const aiEventEmitter = new AIEventEmitter();

// Sound player
const playNotificationSound = (type: AIEventType) => {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different sounds for different events
    if (type.includes('completed')) {
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
    } else if (type.includes('failed')) {
      oscillator.frequency.value = 300;
      oscillator.type = 'square';
    } else {
      oscillator.frequency.value = 600;
      oscillator.type = 'triangle';
    }
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Audio not supported
  }
};

// Show browser notification
const showBrowserNotification = async (event: AIEvent) => {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  
  if (Notification.permission === 'granted') {
    const icon = event.type.includes('completed') ? '✅' : 
                 event.type.includes('failed') ? '❌' : '🔔';
    
    new Notification(`${icon} ${event.title}`, {
      body: event.message,
      icon: '/favicon.ico',
      tag: event.id,
    });
  }
};

export function useAIPushNotifications() {
  const [config, setConfig] = useState<AIPushNotificationsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading AI push config:', e);
    }
    return DEFAULT_CONFIG;
  });

  const [events, setEvents] = useState<AIEvent[]>(aiEventEmitter.getEvents());
  const [unreadCount, setUnreadCount] = useState(aiEventEmitter.getUnreadCount());
  const subscriberIdRef = useRef(`sub-${Date.now()}`);

  // Save config
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = aiEventEmitter.subscribe({
      id: subscriberIdRef.current,
      types: '*',
      callback: (event) => {
        setEvents(aiEventEmitter.getEvents());
        setUnreadCount(aiEventEmitter.getUnreadCount());

        // Check if this event type is enabled
        if (config.eventFilters[event.type] === false) return;
        if (!config.enabled) return;

        // Play sound
        if (config.soundEnabled) {
          playNotificationSound(event.type);
        }

        // Show toast
        if (config.showToast) {
          const isError = event.type.includes('failed');
          const isSuccess = event.type.includes('completed');
          
          if (isError) {
            toast.error(event.title, { description: event.message });
          } else if (isSuccess) {
            toast.success(event.title, { description: event.message });
          } else {
            toast.info(event.title, { description: event.message });
          }
        }

        // Browser notification
        if (config.browserNotifications) {
          showBrowserNotification(event);
        }
      },
    });

    // Listen for window events
    const handleWindowEvent = () => {
      setEvents(aiEventEmitter.getEvents());
      setUnreadCount(aiEventEmitter.getUnreadCount());
    };
    
    window.addEventListener('ai-push-event', handleWindowEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('ai-push-event', handleWindowEvent);
    };
  }, [config]);

  const updateConfig = useCallback((updates: Partial<AIPushNotificationsConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleEventFilter = useCallback((eventType: AIEventType) => {
    setConfig(prev => ({
      ...prev,
      eventFilters: {
        ...prev.eventFilters,
        [eventType]: !prev.eventFilters[eventType],
      },
    }));
  }, []);

  const emitEvent = useCallback((event: Omit<AIEvent, 'id' | 'timestamp' | 'read'>) => {
    return aiEventEmitter.emit(event);
  }, []);

  const markAsRead = useCallback((eventId: string) => {
    aiEventEmitter.markAsRead(eventId);
    setEvents(aiEventEmitter.getEvents());
    setUnreadCount(aiEventEmitter.getUnreadCount());
  }, []);

  const markAllAsRead = useCallback(() => {
    aiEventEmitter.markAllAsRead();
    setEvents(aiEventEmitter.getEvents());
    setUnreadCount(aiEventEmitter.getUnreadCount());
  }, []);

  const clearEvents = useCallback(() => {
    aiEventEmitter.clearEvents();
    setEvents([]);
    setUnreadCount(0);
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Les notifications ne sont pas supportées par ce navigateur');
      return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateConfig({ browserNotifications: true });
      toast.success('Notifications du navigateur activées');
      return true;
    } else {
      toast.error('Permission refusée pour les notifications');
      return false;
    }
  }, [updateConfig]);

  return {
    config,
    events,
    unreadCount,
    updateConfig,
    toggleEventFilter,
    emitEvent,
    markAsRead,
    markAllAsRead,
    clearEvents,
    requestBrowserPermission,
  };
}

// Export the emitter for direct access
export { aiEventEmitter };

// Helper to emit events from anywhere
export const emitAIEvent = (event: Omit<AIEvent, 'id' | 'timestamp' | 'read'>) => {
  return aiEventEmitter.emit(event);
};
