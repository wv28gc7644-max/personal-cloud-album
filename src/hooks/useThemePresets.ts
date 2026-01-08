import { useState, useCallback, useEffect } from 'react';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts?: ThemeFonts;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

export interface ThemeFonts {
  heading?: string;
  body?: string;
}

// Default theme (current gold/dark)
const DEFAULT_THEME: ThemeColors = {
  background: '220 20% 7%',
  foreground: '40 20% 95%',
  card: '220 18% 10%',
  cardForeground: '40 20% 95%',
  popover: '220 18% 12%',
  popoverForeground: '40 20% 95%',
  primary: '38 92% 50%',
  primaryForeground: '220 20% 7%',
  secondary: '220 15% 15%',
  secondaryForeground: '40 20% 90%',
  muted: '220 15% 18%',
  mutedForeground: '220 10% 55%',
  accent: '38 80% 45%',
  accentForeground: '220 20% 7%',
  destructive: '0 72% 51%',
  destructiveForeground: '40 20% 95%',
  border: '220 15% 18%',
  input: '220 15% 15%',
  ring: '38 92% 50%',
  sidebarBackground: '220 18% 8%',
  sidebarForeground: '40 20% 90%',
  sidebarPrimary: '38 92% 50%',
  sidebarPrimaryForeground: '220 20% 7%',
  sidebarAccent: '220 15% 15%',
  sidebarAccentForeground: '40 20% 90%',
  sidebarBorder: '220 15% 15%',
  sidebarRing: '38 92% 50%',
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Gold Edition',
    description: 'Le thème par défaut avec des accents dorés élégants',
    colors: DEFAULT_THEME,
  },
  {
    id: 'dark-neon',
    name: 'Dark Neon',
    description: 'Un style cyberpunk avec des néons violets et roses',
    colors: {
      background: '260 30% 5%',
      foreground: '280 100% 95%',
      card: '260 25% 8%',
      cardForeground: '280 100% 95%',
      popover: '260 25% 10%',
      popoverForeground: '280 100% 95%',
      primary: '280 100% 60%',
      primaryForeground: '260 30% 5%',
      secondary: '260 20% 15%',
      secondaryForeground: '280 80% 90%',
      muted: '260 20% 12%',
      mutedForeground: '260 15% 50%',
      accent: '320 100% 55%',
      accentForeground: '260 30% 5%',
      destructive: '0 90% 55%',
      destructiveForeground: '280 100% 95%',
      border: '280 50% 20%',
      input: '260 20% 12%',
      ring: '280 100% 60%',
      sidebarBackground: '260 28% 6%',
      sidebarForeground: '280 80% 90%',
      sidebarPrimary: '280 100% 60%',
      sidebarPrimaryForeground: '260 30% 5%',
      sidebarAccent: '260 20% 12%',
      sidebarAccentForeground: '280 80% 90%',
      sidebarBorder: '280 40% 15%',
      sidebarRing: '280 100% 60%',
    },
  },
  {
    id: 'light-minimal',
    name: 'Light Minimal',
    description: 'Un design épuré et lumineux pour une lecture confortable',
    colors: {
      background: '0 0% 98%',
      foreground: '220 15% 15%',
      card: '0 0% 100%',
      cardForeground: '220 15% 15%',
      popover: '0 0% 100%',
      popoverForeground: '220 15% 15%',
      primary: '220 90% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '220 10% 92%',
      secondaryForeground: '220 15% 25%',
      muted: '220 10% 94%',
      mutedForeground: '220 10% 45%',
      accent: '220 80% 55%',
      accentForeground: '0 0% 100%',
      destructive: '0 72% 51%',
      destructiveForeground: '0 0% 100%',
      border: '220 10% 88%',
      input: '220 10% 92%',
      ring: '220 90% 50%',
      sidebarBackground: '220 10% 96%',
      sidebarForeground: '220 15% 20%',
      sidebarPrimary: '220 90% 50%',
      sidebarPrimaryForeground: '0 0% 100%',
      sidebarAccent: '220 10% 90%',
      sidebarAccentForeground: '220 15% 25%',
      sidebarBorder: '220 10% 88%',
      sidebarRing: '220 90% 50%',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Jaune électrique et cyan sur fond noir intense',
    colors: {
      background: '220 40% 4%',
      foreground: '55 100% 90%',
      card: '220 35% 7%',
      cardForeground: '55 100% 90%',
      popover: '220 35% 9%',
      popoverForeground: '55 100% 90%',
      primary: '55 100% 50%',
      primaryForeground: '220 40% 4%',
      secondary: '220 30% 12%',
      secondaryForeground: '55 80% 85%',
      muted: '220 25% 10%',
      mutedForeground: '220 15% 45%',
      accent: '180 100% 45%',
      accentForeground: '220 40% 4%',
      destructive: '0 100% 50%',
      destructiveForeground: '55 100% 90%',
      border: '180 60% 15%',
      input: '220 30% 10%',
      ring: '55 100% 50%',
      sidebarBackground: '220 38% 5%',
      sidebarForeground: '55 80% 85%',
      sidebarPrimary: '55 100% 50%',
      sidebarPrimaryForeground: '220 40% 4%',
      sidebarAccent: '220 25% 10%',
      sidebarAccentForeground: '55 80% 85%',
      sidebarBorder: '180 50% 12%',
      sidebarRing: '55 100% 50%',
    },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Tons bleus apaisants inspirés de l\'océan',
    colors: {
      background: '210 50% 8%',
      foreground: '195 80% 95%',
      card: '210 45% 11%',
      cardForeground: '195 80% 95%',
      popover: '210 45% 13%',
      popoverForeground: '195 80% 95%',
      primary: '195 100% 50%',
      primaryForeground: '210 50% 8%',
      secondary: '210 35% 18%',
      secondaryForeground: '195 60% 88%',
      muted: '210 30% 15%',
      mutedForeground: '210 20% 50%',
      accent: '170 80% 45%',
      accentForeground: '210 50% 8%',
      destructive: '0 72% 51%',
      destructiveForeground: '195 80% 95%',
      border: '195 40% 18%',
      input: '210 35% 15%',
      ring: '195 100% 50%',
      sidebarBackground: '210 48% 9%',
      sidebarForeground: '195 60% 88%',
      sidebarPrimary: '195 100% 50%',
      sidebarPrimaryForeground: '210 50% 8%',
      sidebarAccent: '210 30% 14%',
      sidebarAccentForeground: '195 60% 88%',
      sidebarBorder: '195 35% 15%',
      sidebarRing: '195 100% 50%',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Verts naturels pour une ambiance zen',
    colors: {
      background: '150 30% 6%',
      foreground: '120 30% 92%',
      card: '150 25% 9%',
      cardForeground: '120 30% 92%',
      popover: '150 25% 11%',
      popoverForeground: '120 30% 92%',
      primary: '142 70% 45%',
      primaryForeground: '150 30% 6%',
      secondary: '150 20% 15%',
      secondaryForeground: '120 25% 85%',
      muted: '150 18% 12%',
      mutedForeground: '150 15% 45%',
      accent: '85 60% 50%',
      accentForeground: '150 30% 6%',
      destructive: '0 72% 51%',
      destructiveForeground: '120 30% 92%',
      border: '142 30% 18%',
      input: '150 20% 12%',
      ring: '142 70% 45%',
      sidebarBackground: '150 28% 7%',
      sidebarForeground: '120 25% 85%',
      sidebarPrimary: '142 70% 45%',
      sidebarPrimaryForeground: '150 30% 6%',
      sidebarAccent: '150 18% 12%',
      sidebarAccentForeground: '120 25% 85%',
      sidebarBorder: '142 25% 14%',
      sidebarRing: '142 70% 45%',
    },
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    description: 'Oranges et rouges chaleureux du coucher de soleil',
    colors: {
      background: '15 30% 6%',
      foreground: '30 60% 95%',
      card: '15 25% 9%',
      cardForeground: '30 60% 95%',
      popover: '15 25% 11%',
      popoverForeground: '30 60% 95%',
      primary: '25 95% 53%',
      primaryForeground: '15 30% 6%',
      secondary: '15 20% 15%',
      secondaryForeground: '30 50% 88%',
      muted: '15 18% 12%',
      mutedForeground: '15 15% 48%',
      accent: '350 85% 55%',
      accentForeground: '30 60% 95%',
      destructive: '0 90% 55%',
      destructiveForeground: '30 60% 95%',
      border: '25 40% 18%',
      input: '15 20% 12%',
      ring: '25 95% 53%',
      sidebarBackground: '15 28% 7%',
      sidebarForeground: '30 50% 88%',
      sidebarPrimary: '25 95% 53%',
      sidebarPrimaryForeground: '15 30% 6%',
      sidebarAccent: '15 18% 12%',
      sidebarAccentForeground: '30 50% 88%',
      sidebarBorder: '25 35% 14%',
      sidebarRing: '25 95% 53%',
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Élégance classique en noir et blanc',
    colors: {
      background: '0 0% 5%',
      foreground: '0 0% 95%',
      card: '0 0% 8%',
      cardForeground: '0 0% 95%',
      popover: '0 0% 10%',
      popoverForeground: '0 0% 95%',
      primary: '0 0% 90%',
      primaryForeground: '0 0% 5%',
      secondary: '0 0% 15%',
      secondaryForeground: '0 0% 85%',
      muted: '0 0% 12%',
      mutedForeground: '0 0% 50%',
      accent: '0 0% 70%',
      accentForeground: '0 0% 5%',
      destructive: '0 72% 51%',
      destructiveForeground: '0 0% 95%',
      border: '0 0% 18%',
      input: '0 0% 12%',
      ring: '0 0% 90%',
      sidebarBackground: '0 0% 6%',
      sidebarForeground: '0 0% 85%',
      sidebarPrimary: '0 0% 90%',
      sidebarPrimaryForeground: '0 0% 5%',
      sidebarAccent: '0 0% 12%',
      sidebarAccentForeground: '0 0% 85%',
      sidebarBorder: '0 0% 15%',
      sidebarRing: '0 0% 90%',
    },
  },
];

const STORAGE_KEY = 'mediavault-theme-preset';

export function useThemePresets() {
  const [currentPreset, setCurrentPreset] = useState<ThemePreset>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const preset = THEME_PRESETS.find(p => p.id === parsed.id);
        if (preset) return preset;
        // Custom theme
        if (parsed.id === 'custom') return parsed;
      }
    } catch (e) {
      console.error('Error loading theme preset:', e);
    }
    return THEME_PRESETS[0];
  });

  const [customThemes, setCustomThemes] = useState<ThemePreset[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-custom`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading custom themes:', e);
    }
    return [];
  });

  const applyTheme = useCallback((colors: ThemeColors) => {
    const root = document.documentElement;
    
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--card-foreground', colors.cardForeground);
    root.style.setProperty('--popover', colors.popover);
    root.style.setProperty('--popover-foreground', colors.popoverForeground);
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
    root.style.setProperty('--muted', colors.muted);
    root.style.setProperty('--muted-foreground', colors.mutedForeground);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.accentForeground);
    root.style.setProperty('--destructive', colors.destructive);
    root.style.setProperty('--destructive-foreground', colors.destructiveForeground);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--input', colors.input);
    root.style.setProperty('--ring', colors.ring);
    root.style.setProperty('--sidebar-background', colors.sidebarBackground);
    root.style.setProperty('--sidebar-foreground', colors.sidebarForeground);
    root.style.setProperty('--sidebar-primary', colors.sidebarPrimary);
    root.style.setProperty('--sidebar-primary-foreground', colors.sidebarPrimaryForeground);
    root.style.setProperty('--sidebar-accent', colors.sidebarAccent);
    root.style.setProperty('--sidebar-accent-foreground', colors.sidebarAccentForeground);
    root.style.setProperty('--sidebar-border', colors.sidebarBorder);
    root.style.setProperty('--sidebar-ring', colors.sidebarRing);
  }, []);

  // Apply theme on mount and when preset changes
  useEffect(() => {
    applyTheme(currentPreset.colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPreset));
  }, [currentPreset, applyTheme]);

  // Save custom themes
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-custom`, JSON.stringify(customThemes));
  }, [customThemes]);

  const selectPreset = useCallback((presetId: string) => {
    const preset = THEME_PRESETS.find(p => p.id === presetId) || 
                   customThemes.find(p => p.id === presetId);
    if (preset) {
      setCurrentPreset(preset);
    }
  }, [customThemes]);

  const saveCustomTheme = useCallback((name: string, description: string) => {
    const root = document.documentElement;
    const getVar = (name: string) => getComputedStyle(root).getPropertyValue(name).trim();
    
    const newTheme: ThemePreset = {
      id: `custom-${Date.now()}`,
      name,
      description,
      colors: {
        background: getVar('--background'),
        foreground: getVar('--foreground'),
        card: getVar('--card'),
        cardForeground: getVar('--card-foreground'),
        popover: getVar('--popover'),
        popoverForeground: getVar('--popover-foreground'),
        primary: getVar('--primary'),
        primaryForeground: getVar('--primary-foreground'),
        secondary: getVar('--secondary'),
        secondaryForeground: getVar('--secondary-foreground'),
        muted: getVar('--muted'),
        mutedForeground: getVar('--muted-foreground'),
        accent: getVar('--accent'),
        accentForeground: getVar('--accent-foreground'),
        destructive: getVar('--destructive'),
        destructiveForeground: getVar('--destructive-foreground'),
        border: getVar('--border'),
        input: getVar('--input'),
        ring: getVar('--ring'),
        sidebarBackground: getVar('--sidebar-background'),
        sidebarForeground: getVar('--sidebar-foreground'),
        sidebarPrimary: getVar('--sidebar-primary'),
        sidebarPrimaryForeground: getVar('--sidebar-primary-foreground'),
        sidebarAccent: getVar('--sidebar-accent'),
        sidebarAccentForeground: getVar('--sidebar-accent-foreground'),
        sidebarBorder: getVar('--sidebar-border'),
        sidebarRing: getVar('--sidebar-ring'),
      },
    };
    
    setCustomThemes(prev => [...prev, newTheme]);
    setCurrentPreset(newTheme);
    return newTheme;
  }, []);

  const deleteCustomTheme = useCallback((themeId: string) => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
    if (currentPreset.id === themeId) {
      setCurrentPreset(THEME_PRESETS[0]);
    }
  }, [currentPreset.id]);

  const exportTheme = useCallback((theme?: ThemePreset) => {
    const themeToExport = theme || currentPreset;
    const blob = new Blob([JSON.stringify(themeToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediavault-theme-${themeToExport.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentPreset]);

  const importTheme = useCallback((file: File): Promise<ThemePreset> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as ThemePreset;
          // Validate structure
          if (!imported.id || !imported.name || !imported.colors) {
            throw new Error('Invalid theme structure');
          }
          // Give it a new ID to avoid conflicts
          imported.id = `imported-${Date.now()}`;
          setCustomThemes(prev => [...prev, imported]);
          setCurrentPreset(imported);
          resolve(imported);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setCurrentPreset(THEME_PRESETS[0]);
  }, []);

  return {
    currentPreset,
    presets: THEME_PRESETS,
    customThemes,
    allThemes: [...THEME_PRESETS, ...customThemes],
    selectPreset,
    saveCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    resetToDefault,
    applyTheme,
  };
}
