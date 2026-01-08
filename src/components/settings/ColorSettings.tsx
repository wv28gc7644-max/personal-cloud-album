/**
 * Paramètres de personnalisation des couleurs globales
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, RotateCcw, Download, Upload, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
  primaryForeground: string;
}

const COLOR_PRESETS: ColorScheme[] = [
  { id: 'default', name: 'Défaut (Or)', primary: '38 92% 50%', accent: '38 80% 45%', primaryForeground: '220 20% 7%' },
  { id: 'ocean', name: 'Océan', primary: '199 89% 48%', accent: '199 80% 40%', primaryForeground: '220 20% 7%' },
  { id: 'forest', name: 'Forêt', primary: '142 71% 45%', accent: '142 60% 38%', primaryForeground: '220 20% 7%' },
  { id: 'neon', name: 'Néon', primary: '280 87% 55%', accent: '330 81% 60%', primaryForeground: '220 20% 97%' },
  { id: 'midnight', name: 'Minuit', primary: '217 91% 60%', accent: '230 80% 50%', primaryForeground: '220 20% 97%' },
  { id: 'sunset', name: 'Soleil', primary: '25 95% 53%', accent: '38 92% 50%', primaryForeground: '220 20% 7%' },
  { id: 'lavender', name: 'Lavande', primary: '262 83% 58%', accent: '270 70% 50%', primaryForeground: '220 20% 97%' },
  { id: 'mono', name: 'Monochrome', primary: '220 10% 50%', accent: '220 10% 40%', primaryForeground: '220 20% 97%' },
  { id: 'coral', name: 'Corail', primary: '16 85% 65%', accent: '0 72% 51%', primaryForeground: '220 20% 7%' },
  { id: 'emerald', name: 'Émeraude', primary: '160 84% 39%', accent: '174 72% 40%', primaryForeground: '220 20% 7%' }
];

const STORAGE_KEY = 'mediavault-color-settings';

interface ColorSettings {
  schemeId: string;
  customPrimary?: string;
  customAccent?: string;
}

export function ColorSettings() {
  const [settings, setSettings] = useState<ColorSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { schemeId: 'default' };
    } catch {
      return { schemeId: 'default' };
    }
  });

  const [customPrimary, setCustomPrimary] = useState(settings.customPrimary || '#e69500');
  const [customAccent, setCustomAccent] = useState(settings.customAccent || '#cc8400');

  // Appliquer les couleurs
  const applyColors = (scheme: ColorScheme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', scheme.primary);
    root.style.setProperty('--accent', scheme.accent);
    root.style.setProperty('--primary-foreground', scheme.primaryForeground);
    root.style.setProperty('--ring', scheme.primary);
    root.style.setProperty('--sidebar-primary', scheme.primary);
    root.style.setProperty('--sidebar-ring', scheme.primary);
  };

  // Charger au démarrage
  useEffect(() => {
    const scheme = COLOR_PRESETS.find(p => p.id === settings.schemeId) || COLOR_PRESETS[0];
    applyColors(scheme);
  }, [settings.schemeId]);

  const selectScheme = (schemeId: string) => {
    const scheme = COLOR_PRESETS.find(p => p.id === schemeId);
    if (scheme) {
      applyColors(scheme);
      const newSettings = { ...settings, schemeId };
      setSettings(newSettings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      toast.success(`Thème "${scheme.name}" appliqué`);
    }
  };

  const applyCustomColors = () => {
    // Convertir hex en HSL simplifié
    const hexToHsl = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const primaryHsl = hexToHsl(customPrimary);
    const accentHsl = hexToHsl(customAccent);

    const root = document.documentElement;
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--accent', accentHsl);
    root.style.setProperty('--ring', primaryHsl);
    root.style.setProperty('--sidebar-primary', primaryHsl);
    root.style.setProperty('--sidebar-ring', primaryHsl);

    const newSettings = { 
      schemeId: 'custom', 
      customPrimary, 
      customAccent 
    };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    toast.success('Couleurs personnalisées appliquées');
  };

  const resetColors = () => {
    selectScheme('default');
    setCustomPrimary('#e69500');
    setCustomAccent('#cc8400');
  };

  const exportTheme = () => {
    const theme = {
      ...settings,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediavault-theme.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Thème exporté');
  };

  const importTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const theme = JSON.parse(event.target?.result as string);
        if (theme.schemeId) {
          setSettings(theme);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
          if (theme.schemeId === 'custom' && theme.customPrimary) {
            setCustomPrimary(theme.customPrimary);
            setCustomAccent(theme.customAccent || theme.customPrimary);
          }
          selectScheme(theme.schemeId);
          toast.success('Thème importé');
        }
      } catch {
        toast.error('Fichier de thème invalide');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Couleurs globales
          </CardTitle>
          <CardDescription>
            Personnalisez les couleurs principales de l'interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Presets */}
          <div className="space-y-3">
            <Label>Palettes prédéfinies</Label>
            <ScrollArea className="h-48">
              <div className="grid grid-cols-2 gap-3">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => selectScheme(preset.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-left",
                      "hover:border-primary/50",
                      settings.schemeId === preset.id
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: `hsl(${preset.primary})` }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: `hsl(${preset.accent})` }}
                      />
                      {settings.schemeId === preset.id && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Custom colors */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <Label>Couleurs personnalisées</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Couleur primaire</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    placeholder="#e69500"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Couleur accent</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    placeholder="#cc8400"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button onClick={applyCustomColors} className="w-full">
              Appliquer les couleurs personnalisées
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={exportTheme}>
              <Download className="w-4 h-4" />
              Exporter
            </Button>
            <label className="flex-1">
              <Button variant="outline" className="w-full gap-2" asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  Importer
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importTheme}
                className="hidden"
              />
            </label>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={resetColors}>
            <RotateCcw className="w-4 h-4" />
            Réinitialiser par défaut
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Prévisualisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button>Bouton primaire</Button>
              <Button variant="secondary">Secondaire</Button>
              <Button variant="outline">Outline</Button>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-12 h-12 rounded-lg bg-primary" />
              <div className="w-10 h-10 rounded-lg bg-accent" />
              <div className="w-8 h-8 rounded-lg bg-secondary" />
              <div className="w-6 h-6 rounded-lg bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
