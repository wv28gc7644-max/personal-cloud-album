import { useState, useCallback } from 'react';

interface SearchResult {
  mediaId: string;
  mediaUrl: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  similarity: number;
  title: string;
}

interface SemanticSearchState {
  isSearching: boolean;
  results: SearchResult[];
  isIndexing: boolean;
  indexProgress: number;
  isIndexed: boolean;
}

export const useSemanticSearch = () => {
  const [state, setState] = useState<SemanticSearchState>({
    isSearching: false,
    results: [],
    isIndexing: false,
    indexProgress: 0,
    isIndexed: localStorage.getItem('mediavault-clip-indexed') === 'true'
  });

  const serverUrl = localStorage.getItem('mediavault-local-server-url') || 'http://localhost:3001';

  // Index library with CLIP embeddings
  const indexLibrary = useCallback(async () => {
    setState(prev => ({ ...prev, isIndexing: true, indexProgress: 0 }));

    try {
      const response = await fetch(`${serverUrl}/api/ai/search/index`, {
        method: 'POST'
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(l => l.trim());

          for (const line of lines) {
            try {
              const update = JSON.parse(line);
              if (update.progress !== undefined) {
                setState(prev => ({ ...prev, indexProgress: update.progress }));
              }
            } catch {}
          }
        }

        localStorage.setItem('mediavault-clip-indexed', 'true');
        setState(prev => ({ ...prev, isIndexed: true }));
      }
    } catch (error) {
      console.error('Error indexing library:', error);
    } finally {
      setState(prev => ({ ...prev, isIndexing: false }));
    }
  }, [serverUrl]);

  // Search by text description
  const searchByText = useCallback(async (query: string, limit: number = 50): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    setState(prev => ({ ...prev, isSearching: true }));

    try {
      const response = await fetch(`${serverUrl}/api/ai/search/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit })
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, results: data.results }));
        return data.results;
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setState(prev => ({ ...prev, isSearching: false }));
    }

    return [];
  }, [serverUrl]);

  // Search by image (find similar images)
  const searchByImage = useCallback(async (imageUrl: string, limit: number = 50): Promise<SearchResult[]> => {
    setState(prev => ({ ...prev, isSearching: true }));

    try {
      const response = await fetch(`${serverUrl}/api/ai/search/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, limit })
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, results: data.results }));
        return data.results;
      }
    } catch (error) {
      console.error('Error searching by image:', error);
    } finally {
      setState(prev => ({ ...prev, isSearching: false }));
    }

    return [];
  }, [serverUrl]);

  // Search with filters
  const searchWithFilters = useCallback(async (params: {
    query?: string;
    imageUrl?: string;
    type?: 'image' | 'video' | 'all';
    minSimilarity?: number;
    limit?: number;
  }): Promise<SearchResult[]> => {
    setState(prev => ({ ...prev, isSearching: true }));

    try {
      const response = await fetch(`${serverUrl}/api/ai/search/advanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, results: data.results }));
        return data.results;
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setState(prev => ({ ...prev, isSearching: false }));
    }

    return [];
  }, [serverUrl]);

  // Clear search results
  const clearResults = useCallback(() => {
    setState(prev => ({ ...prev, results: [] }));
  }, []);

  // Check if CLIP is available
  const checkClipAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${serverUrl}/api/ai/search/status`);
      if (response.ok) {
        const data = await response.json();
        return data.clipAvailable === true;
      }
    } catch (error) {
      console.error('Error checking CLIP availability:', error);
    }
    return false;
  }, [serverUrl]);

  return {
    ...state,
    indexLibrary,
    searchByText,
    searchByImage,
    searchWithFilters,
    clearResults,
    checkClipAvailability
  };
};
