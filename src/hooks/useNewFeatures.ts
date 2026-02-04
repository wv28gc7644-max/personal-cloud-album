import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, getCurrentVersionFeatures, hasNewFeature } from '@/config/versionFeatures';

const STORAGE_KEY = 'mediavault-seen-features';
const VERSION_KEY = 'mediavault-features-version';

interface UseNewFeaturesReturn {
  isNewFeature: (navId: string) => boolean;
  markFeatureAsSeen: (featureId: string) => void;
  markNavAsSeen: (navId: string) => void;
  seenFeatures: string[];
  currentVersion: string;
  unseenCount: number;
}

export const useNewFeatures = (): UseNewFeaturesReturn => {
  const [seenFeatures, setSeenFeatures] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Load seen features from localStorage
  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const storedFeatures = localStorage.getItem(STORAGE_KEY);

    // If version changed, reset seen features
    if (storedVersion !== APP_VERSION) {
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      setSeenFeatures([]);
    } else if (storedFeatures) {
      try {
        setSeenFeatures(JSON.parse(storedFeatures));
      } catch {
        setSeenFeatures([]);
      }
    }
    
    setInitialized(true);
  }, []);

  // Check if a nav item has new features
  const isNewFeature = useCallback((navId: string): boolean => {
    if (!initialized) return false;
    return hasNewFeature(navId, seenFeatures);
  }, [seenFeatures, initialized]);

  // Mark a specific feature as seen
  const markFeatureAsSeen = useCallback((featureId: string) => {
    setSeenFeatures(prev => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Mark all features related to a nav item as seen
  const markNavAsSeen = useCallback((navId: string) => {
    const currentFeatures = getCurrentVersionFeatures();
    const { FEATURE_NAV_MAPPING } = require('@/config/versionFeatures');
    
    const relatedFeatures = currentFeatures.filter(feature => {
      const mappedNavs = FEATURE_NAV_MAPPING[feature] || [];
      return mappedNavs.includes(navId);
    });

    setSeenFeatures(prev => {
      const updated = [...new Set([...prev, ...relatedFeatures])];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Count unseen features
  const unseenCount = getCurrentVersionFeatures().filter(
    f => !seenFeatures.includes(f)
  ).length;

  return {
    isNewFeature,
    markFeatureAsSeen,
    markNavAsSeen,
    seenFeatures,
    currentVersion: APP_VERSION,
    unseenCount
  };
};
