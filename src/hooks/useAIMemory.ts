import { useState, useCallback, useEffect } from 'react';

export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    timestamp: number;
    type: 'conversation' | 'fact' | 'preference' | 'context';
    source?: string;
    importance?: number;
  };
}

export interface AICharacter {
  id: string;
  name: string;
  avatar?: string;
  personality: string;
  systemPrompt: string;
  voiceSettings?: {
    pitch: number;
    rate: number;
    voice?: string;
  };
  memories: MemoryEntry[];
  createdAt: number;
  lastInteraction?: number;
}

const STORAGE_KEY = 'ai-memory-store';
const CHARACTERS_KEY = 'ai-characters-store';

export function useAIMemory() {
  const [memories, setMemories] = useState<MemoryEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [characters, setCharacters] = useState<AICharacter[]>(() => {
    const saved = localStorage.getItem(CHARACTERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeCharacter, setActiveCharacter] = useState<AICharacter | null>(null);

  // Persist memories
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  }, [memories]);

  // Persist characters
  useEffect(() => {
    localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
  }, [characters]);

  // Add a memory entry
  const addMemory = useCallback((
    content: string,
    type: MemoryEntry['metadata']['type'] = 'conversation',
    metadata?: Partial<MemoryEntry['metadata']>
  ) => {
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      content,
      metadata: {
        timestamp: Date.now(),
        type,
        importance: 1,
        ...metadata
      }
    };

    setMemories(prev => [...prev, entry]);
    return entry;
  }, []);

  // Search memories by keyword (simple search, no embeddings)
  const searchMemories = useCallback((query: string, limit = 10): MemoryEntry[] => {
    const queryLower = query.toLowerCase();
    
    return memories
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .sort((a, b) => {
        // Sort by importance and recency
        const importanceA = a.metadata.importance || 1;
        const importanceB = b.metadata.importance || 1;
        const scoreA = importanceA * 1000 + (a.metadata.timestamp / 1000000);
        const scoreB = importanceB * 1000 + (b.metadata.timestamp / 1000000);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }, [memories]);

  // Get recent memories
  const getRecentMemories = useCallback((limit = 20): MemoryEntry[] => {
    return memories
      .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
      .slice(0, limit);
  }, [memories]);

  // Delete a memory
  const deleteMemory = useCallback((id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  }, []);

  // Clear all memories
  const clearMemories = useCallback(() => {
    setMemories([]);
  }, []);

  // Character management
  const createCharacter = useCallback((data: Omit<AICharacter, 'id' | 'memories' | 'createdAt'>) => {
    const character: AICharacter = {
      ...data,
      id: crypto.randomUUID(),
      memories: [],
      createdAt: Date.now()
    };
    
    setCharacters(prev => [...prev, character]);
    return character;
  }, []);

  const updateCharacter = useCallback((id: string, updates: Partial<AICharacter>) => {
    setCharacters(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);

  const deleteCharacter = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    if (activeCharacter?.id === id) {
      setActiveCharacter(null);
    }
  }, [activeCharacter]);

  const addCharacterMemory = useCallback((characterId: string, content: string) => {
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      content,
      metadata: {
        timestamp: Date.now(),
        type: 'conversation',
        importance: 1
      }
    };

    setCharacters(prev => prev.map(c => 
      c.id === characterId 
        ? { ...c, memories: [...c.memories, entry], lastInteraction: Date.now() }
        : c
    ));
  }, []);

  // Get context for AI (recent memories + relevant memories)
  const getContextForPrompt = useCallback((query: string): string => {
    const recent = getRecentMemories(5);
    const relevant = searchMemories(query, 5);
    
    // Combine and deduplicate
    const combined = [...recent];
    for (const mem of relevant) {
      if (!combined.find(m => m.id === mem.id)) {
        combined.push(mem);
      }
    }
    
    if (combined.length === 0) return '';
    
    const context = combined
      .slice(0, 10)
      .map(m => `[${new Date(m.metadata.timestamp).toLocaleDateString()}] ${m.content}`)
      .join('\n');
    
    return `\n\n--- Mémoire contextuelle ---\n${context}\n---\n`;
  }, [getRecentMemories, searchMemories]);

  return {
    // Memories
    memories,
    addMemory,
    searchMemories,
    getRecentMemories,
    deleteMemory,
    clearMemories,
    getContextForPrompt,
    
    // Characters
    characters,
    activeCharacter,
    setActiveCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    addCharacterMemory
  };
}
