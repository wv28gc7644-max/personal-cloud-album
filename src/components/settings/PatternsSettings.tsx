/**
 * Paramètres des patterns/motifs de fond
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Grid3x3, Eye, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatterns } from '@/hooks/usePatterns';
import { PATTERNS, PATTERN_CATEGORIES, getPatternsByCategory } from '@/data/patterns';

export function PatternsSettings() {
  const { settings, updateSettings, resetSettings } = usePatterns();
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredPatterns = getPatternsByCategory(activeCategory);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5" />
            Motifs de fond
          </CardTitle>
          <CardDescription>
            Personnalisez l'arrière-plan avec des motifs décoratifs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Activer les motifs</Label>
              <p className="text-sm text-muted-foreground">
                Afficher un motif en arrière-plan du site
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {settings.enabled && (
            <>
              {/* Category filter */}
              <div className="flex gap-2 flex-wrap">
                {PATTERN_CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>

              {/* Pattern grid */}
              <ScrollArea className="h-48">
                <div className="grid grid-cols-4 gap-3">
                  {filteredPatterns.map(pattern => (
                    <button
                      key={pattern.id}
                      onClick={() => updateSettings({ patternId: pattern.id })}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 transition-all p-2",
                        "hover:border-primary/50",
                        settings.patternId === pattern.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/30"
                      )}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                            pattern.svg.replace(/currentColor/g, 'hsl(38, 92%, 50%)')
                          )}")`,
                          backgroundRepeat: 'repeat',
                          backgroundSize: '50%',
                          opacity: 0.6
                        }}
                      />
                      {settings.patternId === pattern.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <span className="absolute bottom-1 left-1 right-1 text-xs text-center truncate">
                        {pattern.name}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Opacity */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Opacité</Label>
                  <span className="text-sm text-muted-foreground">{settings.opacity}%</span>
                </div>
                <Slider
                  value={[settings.opacity]}
                  onValueChange={([v]) => updateSettings({ opacity: v })}
                  min={1}
                  max={50}
                  step={1}
                />
              </div>

              {/* Scale */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Échelle</Label>
                  <span className="text-sm text-muted-foreground">{settings.scale.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[settings.scale]}
                  onValueChange={([v]) => updateSettings({ scale: v })}
                  min={0.5}
                  max={3}
                  step={0.1}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>Couleur du motif</Label>
                <div className="flex gap-2">
                  {[
                    'hsl(38, 92%, 50%)',   // Primary (orange)
                    'hsl(262, 83%, 58%)',  // Purple
                    'hsl(217, 91%, 60%)',  // Blue
                    'hsl(142, 71%, 45%)',  // Green
                    'hsl(330, 81%, 60%)',  // Pink
                    'hsl(220, 10%, 50%)'   // Gray
                  ].map(color => (
                    <button
                      key={color}
                      onClick={() => updateSettings({ color })}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        settings.color === color ? "border-white scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Applies to */}
              <div className="space-y-2">
                <Label>Appliquer à</Label>
                <Select
                  value={settings.appliesTo}
                  onValueChange={(v) => updateSettings({ appliesTo: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout le site</SelectItem>
                    <SelectItem value="sidebar">Barre latérale</SelectItem>
                    <SelectItem value="header">En-tête</SelectItem>
                    <SelectItem value="content">Zone de contenu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Reset */}
          <Button variant="outline" className="w-full gap-2" onClick={resetSettings}>
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Prévisualisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="h-32 rounded-lg border relative overflow-hidden"
            style={{
              backgroundColor: 'hsl(220, 20%, 10%)'
            }}
          >
            {settings.enabled && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                    PATTERNS.find(p => p.id === settings.patternId)?.svg.replace(/currentColor/g, settings.color) || ''
                  )}")`,
                  backgroundRepeat: 'repeat',
                  backgroundSize: `${settings.scale * 100}%`,
                  opacity: settings.opacity / 100,
                  mixBlendMode: 'overlay'
                }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                {settings.enabled ? 'Aperçu du motif' : 'Motifs désactivés'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
