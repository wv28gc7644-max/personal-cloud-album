import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface AICreation {
  id: string;
  type: 'image' | 'video' | 'music' | 'voice' | 'montage';
  name: string;
  url: string;
  createdAt: Date;
  metadata?: {
    prompt?: string;
    model?: string;
    duration?: number;
    width?: number;
    height?: number;
    genre?: string;
    voiceId?: string;
    [key: string]: unknown;
  };
}

const STORAGE_KEY = 'mediavault-ai-creations';

export function useAICreations() {
  const [creations, setCreations] = useState<AICreation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((c: AICreation) => ({
          ...c,
          createdAt: new Date(c.createdAt)
        }));
      }
    } catch {
      console.error('Failed to load AI creations');
    }
    return [];
  });

  const saveCreation = useCallback(async (creation: Omit<AICreation, 'id' | 'createdAt'>) => {
    const newCreation: AICreation = {
      ...creation,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };

    setCreations(prev => {
      const updated = [newCreation, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Try to save to server if available
    try {
      const serverUrl = localStorage.getItem('mediavault-admin-settings');
      const baseUrl = serverUrl ? JSON.parse(serverUrl).localServerUrl : 'http://localhost:3001';
      
      await fetch(`${baseUrl}/api/ai-creations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCreation)
      });
    } catch {
      // Silent fail - local storage is primary
    }

    toast.success('Création sauvegardée', {
      description: `${creation.name} ajouté à vos créations IA`
    });

    return newCreation;
  }, []);

  const deleteCreation = useCallback((id: string) => {
    setCreations(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast.success('Création supprimée');
  }, []);

  const getCreationsByType = useCallback((type: AICreation['type']) => {
    return creations.filter(c => c.type === type);
  }, [creations]);

  return {
    creations,
    saveCreation,
    deleteCreation,
    getCreationsByType
  };
}
