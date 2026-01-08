/**
 * Hook pour gérer les patterns du site
 */

import { useState, useEffect, useCallback } from 'react';
import { PATTERNS, getPatternById } from '@/data/patterns';

export interface PatternSettings {
  enabled: boolean;
  patternId: string;
  opacity: number; // 0-100
  scale: number; // 0.5-3
  appliesTo: 'sidebar' | 'header' | 'content' | 'all';
  color: string; // hex or hsl
}

const STORAGE_KEY = 'mediavault-pattern-settings';

const DEFAULT_SETTINGS: PatternSettings = {
  enabled: false,
  patternId: 'dots',
  opacity: 10,
  scale: 1,
  appliesTo: 'all',
  color: 'hsl(38, 92%, 50%)'
};

export const usePatterns = () => {
  const [settings, setSettings] = useState<PatternSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Appliquer les patterns au DOM
  const applyPatterns = useCallback(() => {
    const root = document.documentElement;
    
    // Nettoyer les anciens patterns
    document.querySelectorAll('.mediavault-pattern-layer').forEach(el => el.remove());
    root.style.removeProperty('--pattern-background');

    if (!settings.enabled) return;

    const pattern = getPatternById(settings.patternId);
    if (!pattern) return;

    // Créer le pattern encodé
    const encodedSvg = encodeURIComponent(
      pattern.svg.replace(/currentColor/g, settings.color)
    );
    const patternUrl = `url("data:image/svg+xml,${encodedSvg}")`;
    
    // Appliquer selon la zone
    const createPatternLayer = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return;
      
      const layer = document.createElement('div');
      layer.className = 'mediavault-pattern-layer';
      layer.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background-image: ${patternUrl};
        background-repeat: repeat;
        background-size: ${settings.scale * 100}%;
        opacity: ${settings.opacity / 100};
        mix-blend-mode: overlay;
      `;
      
      const parent = element as HTMLElement;
      if (parent.style.position !== 'relative' && parent.style.position !== 'absolute') {
        parent.style.position = 'relative';
      }
      parent.insertBefore(layer, parent.firstChild);
    };

    if (settings.appliesTo === 'all') {
      root.style.setProperty('--pattern-background', patternUrl);
      root.style.setProperty('--pattern-opacity', (settings.opacity / 100).toString());
      root.style.setProperty('--pattern-scale', `${settings.scale * 100}%`);
    } else if (settings.appliesTo === 'sidebar') {
      createPatternLayer('aside');
    } else if (settings.appliesTo === 'header') {
      createPatternLayer('header');
    } else if (settings.appliesTo === 'content') {
      createPatternLayer('main');
    }
  }, [settings]);

  // Appliquer au changement
  useEffect(() => {
    applyPatterns();
  }, [applyPatterns]);

  // Sauvegarder
  const updateSettings = useCallback((updates: Partial<PatternSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    patterns: PATTERNS
  };
};
