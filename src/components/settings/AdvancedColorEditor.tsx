import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Pipette, 
  RotateCcw, 
  Copy, 
  Check,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ColorValue {
  h: number;
  s: number;
  l: number;
}

interface ColorVariable {
  name: string;
  label: string;
  value: ColorValue;
  category: 'primary' | 'neutral' | 'accent' | 'state';
}

const DEFAULT_COLORS: ColorVariable[] = [
  // Primary
  { name: '--primary', label: 'Primaire', value: { h: 38, s: 92, l: 50 }, category: 'primary' },
  { name: '--primary-foreground', label: 'Texte primaire', value: { h: 220, s: 20, l: 7 }, category: 'primary' },
  { name: '--accent', label: 'Accent', value: { h: 38, s: 80, l: 45 }, category: 'primary' },
  { name: '--accent-foreground', label: 'Texte accent', value: { h: 220, s: 20, l: 7 }, category: 'primary' },
  { name: '--ring', label: 'Focus ring', value: { h: 38, s: 92, l: 50 }, category: 'primary' },
  
  // Neutral
  { name: '--background', label: 'Arrière-plan', value: { h: 220, s: 20, l: 7 }, category: 'neutral' },
  { name: '--foreground', label: 'Texte', value: { h: 40, s: 20, l: 95 }, category: 'neutral' },
  { name: '--card', label: 'Carte', value: { h: 220, s: 18, l: 10 }, category: 'neutral' },
  { name: '--card-foreground', label: 'Texte carte', value: { h: 40, s: 20, l: 95 }, category: 'neutral' },
  { name: '--muted', label: 'Atténué', value: { h: 220, s: 15, l: 18 }, category: 'neutral' },
  { name: '--muted-foreground', label: 'Texte atténué', value: { h: 220, s: 10, l: 55 }, category: 'neutral' },
  { name: '--border', label: 'Bordure', value: { h: 220, s: 15, l: 18 }, category: 'neutral' },
  { name: '--input', label: 'Input', value: { h: 220, s: 15, l: 15 }, category: 'neutral' },
  
  // State
  { name: '--destructive', label: 'Destructif', value: { h: 0, s: 72, l: 51 }, category: 'state' },
  { name: '--destructive-foreground', label: 'Texte destructif', value: { h: 40, s: 20, l: 95 }, category: 'state' },
];

const GRADIENT_PRESETS = [
  { name: 'Sunset', colors: ['#FF6B6B', '#FFE66D'] },
  { name: 'Ocean', colors: ['#667EEA', '#764BA2'] },
  { name: 'Forest', colors: ['#11998E', '#38EF7D'] },
  { name: 'Fire', colors: ['#F12711', '#F5AF19'] },
  { name: 'Purple Haze', colors: ['#7F00FF', '#E100FF'] },
  { name: 'Midnight', colors: ['#232526', '#414345'] },
  { name: 'Gold', colors: ['#FFD700', '#FFA500'] },
  { name: 'Cyber', colors: ['#00D9FF', '#FF00FF'] },
];

const hslToHex = (h: number, s: number, l: number): string => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): ColorValue => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
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
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export function AdvancedColorEditor() {
  const [colors, setColors] = useState<ColorVariable[]>(() => {
    try {
      const saved = localStorage.getItem('mediavault-custom-colors');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_COLORS;
  });
  
  const [selectedColor, setSelectedColor] = useState<ColorVariable | null>(null);
  const [gradientStart, setGradientStart] = useState('#FF6B6B');
  const [gradientEnd, setGradientEnd] = useState('#FFE66D');
  const [gradientAngle, setGradientAngle] = useState(135);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // Apply colors to CSS
  const applyColors = useCallback(() => {
    const root = document.documentElement;
    colors.forEach(color => {
      root.style.setProperty(color.name, `${color.value.h} ${color.value.s}% ${color.value.l}%`);
    });
  }, [colors]);

  useEffect(() => {
    applyColors();
    localStorage.setItem('mediavault-custom-colors', JSON.stringify(colors));
  }, [colors, applyColors]);

  const updateColor = (name: string, value: ColorValue) => {
    setColors(prev => prev.map(c => c.name === name ? { ...c, value } : c));
  };

  const handleHexChange = (name: string, hex: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      updateColor(name, hexToHsl(hex));
    }
  };

  const copyColor = (color: ColorVariable) => {
    const hex = hslToHex(color.value.h, color.value.s, color.value.l);
    navigator.clipboard.writeText(hex);
    setCopiedColor(color.name);
    setTimeout(() => setCopiedColor(null), 2000);
    toast.success('Couleur copiée !');
  };

  const resetColors = () => {
    setColors(DEFAULT_COLORS);
    toast.success('Couleurs réinitialisées');
  };

  const applyGradientPreset = (preset: typeof GRADIENT_PRESETS[0]) => {
    setGradientStart(preset.colors[0]);
    setGradientEnd(preset.colors[1]);
    
    // Apply gradient colors as primary and accent
    const startHsl = hexToHsl(preset.colors[0]);
    const endHsl = hexToHsl(preset.colors[1]);
    
    updateColor('--primary', startHsl);
    updateColor('--accent', endHsl);
    updateColor('--ring', startHsl);
    
    toast.success(`Gradient "${preset.name}" appliqué`);
  };

  const gradientStyle = `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`;

  const getColorsByCategory = (category: ColorVariable['category']) => 
    colors.filter(c => c.category === category);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Éditeur de couleurs avancé
          </CardTitle>
          <CardDescription>
            Personnalisez chaque couleur de l'interface avec précision
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="colors" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="colors">Couleurs</TabsTrigger>
              <TabsTrigger value="gradients">Gradients</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-6">
              {/* Primary Colors */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Couleurs principales
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {getColorsByCategory('primary').map(color => (
                    <ColorPicker 
                      key={color.name}
                      color={color}
                      onUpdate={updateColor}
                      onCopy={copyColor}
                      onHexChange={handleHexChange}
                      isCopied={copiedColor === color.name}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              {/* Neutral Colors */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Couleurs neutres
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {getColorsByCategory('neutral').map(color => (
                    <ColorPicker 
                      key={color.name}
                      color={color}
                      onUpdate={updateColor}
                      onCopy={copyColor}
                      onHexChange={handleHexChange}
                      isCopied={copiedColor === color.name}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              {/* State Colors */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Sun className="w-4 h-4 text-destructive" />
                  Couleurs d'état
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {getColorsByCategory('state').map(color => (
                    <ColorPicker 
                      key={color.name}
                      color={color}
                      onUpdate={updateColor}
                      onCopy={copyColor}
                      onHexChange={handleHexChange}
                      isCopied={copiedColor === color.name}
                    />
                  ))}
                </div>
              </div>

              <Button variant="outline" onClick={resetColors} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser les couleurs
              </Button>
            </TabsContent>

            <TabsContent value="gradients" className="space-y-6">
              {/* Gradient Preview */}
              <div 
                className="h-32 rounded-xl border"
                style={{ background: gradientStyle }}
              />

              {/* Gradient Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Couleur de départ</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={gradientStart}
                      onChange={(e) => setGradientStart(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={gradientStart}
                      onChange={(e) => setGradientStart(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Couleur de fin</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={gradientEnd}
                      onChange={(e) => setGradientEnd(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={gradientEnd}
                      onChange={(e) => setGradientEnd(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Angle: {gradientAngle}°</Label>
                <Slider
                  value={[gradientAngle]}
                  onValueChange={([v]) => setGradientAngle(v)}
                  min={0}
                  max={360}
                  step={15}
                />
              </div>

              <Separator />

              {/* Gradient Presets */}
              <div className="space-y-3">
                <Label>Presets de gradients</Label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADIENT_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => applyGradientPreset(preset)}
                      className="group relative h-16 rounded-lg border overflow-hidden transition-transform hover:scale-105"
                      style={{ 
                        background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})` 
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-white font-medium">{preset.name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => {
                  const startHsl = hexToHsl(gradientStart);
                  const endHsl = hexToHsl(gradientEnd);
                  updateColor('--primary', startHsl);
                  updateColor('--accent', endHsl);
                  toast.success('Gradient appliqué aux couleurs principales');
                }}
                className="w-full"
              >
                Appliquer comme couleurs principales
              </Button>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="p-6 rounded-xl bg-background border space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Titre d'exemple</h3>
                    <p className="text-sm text-muted-foreground">Description en texte atténué</p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>

                <div className="p-4 rounded-lg bg-card border">
                  <p className="text-card-foreground">Contenu dans une carte</p>
                  <p className="text-sm text-muted-foreground mt-1">Texte secondaire</p>
                </div>

                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Zone atténuée</p>
                </div>

                <Input placeholder="Champ de saisie..." />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Color Picker Component
function ColorPicker({ 
  color, 
  onUpdate, 
  onCopy, 
  onHexChange,
  isCopied 
}: { 
  color: ColorVariable;
  onUpdate: (name: string, value: ColorValue) => void;
  onCopy: (color: ColorVariable) => void;
  onHexChange: (name: string, hex: string) => void;
  isCopied: boolean;
}) {
  const hex = hslToHex(color.value.h, color.value.s, color.value.l);
  
  return (
    <div className="p-3 rounded-lg border bg-card/50 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{color.label}</Label>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => onCopy(color)}
        >
          {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
      
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={hex}
          onChange={(e) => onHexChange(color.name, e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0"
        />
        <Input
          value={hex}
          onChange={(e) => onHexChange(color.name, e.target.value)}
          className="flex-1 h-8 text-xs font-mono"
        />
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">H</span>
          <Slider
            value={[color.value.h]}
            onValueChange={([h]) => onUpdate(color.name, { ...color.value, h })}
            min={0}
            max={360}
            className="flex-1"
          />
          <span className="text-xs w-8 text-right">{color.value.h}°</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">S</span>
          <Slider
            value={[color.value.s]}
            onValueChange={([s]) => onUpdate(color.name, { ...color.value, s })}
            min={0}
            max={100}
            className="flex-1"
          />
          <span className="text-xs w-8 text-right">{color.value.s}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">L</span>
          <Slider
            value={[color.value.l]}
            onValueChange={([l]) => onUpdate(color.name, { ...color.value, l })}
            min={0}
            max={100}
            className="flex-1"
          />
          <span className="text-xs w-8 text-right">{color.value.l}%</span>
        </div>
      </div>
    </div>
  );
}
