import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3X3, LayoutGrid, Play } from 'lucide-react';

export function GridSettings() {
  const [gridColumns, setGridColumns] = useState(() => {
    const saved = localStorage.getItem('mediavault-admin-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.gridColumns || 3;
    }
    return 3;
  });

  const [cardStyle, setCardStyle] = useState<'twitter' | 'grid' | 'compact'>(() => {
    const saved = localStorage.getItem('mediavault-admin-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.cardStyle || 'twitter';
    }
    return 'twitter';
  });

  const [autoPlay, setAutoPlay] = useState(() => {
    const saved = localStorage.getItem('mediavault-admin-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.autoPlay || false;
    }
    return false;
  });

  const updateSetting = (key: string, value: any) => {
    const saved = localStorage.getItem('mediavault-admin-settings');
    const settings = saved ? JSON.parse(saved) : {};
    settings[key] = value;
    localStorage.setItem('mediavault-admin-settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('mediavault-settings-changed'));
  };

  const handleColumnsChange = (value: number[]) => {
    setGridColumns(value[0]);
    updateSetting('gridColumns', value[0]);
  };

  const handleCardStyleChange = (value: 'twitter' | 'grid' | 'compact') => {
    setCardStyle(value);
    updateSetting('cardStyle', value);
  };

  const handleAutoPlayChange = (checked: boolean) => {
    setAutoPlay(checked);
    updateSetting('autoPlay', checked);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Configuration de la grille
          </CardTitle>
          <CardDescription>Personnalisez l'affichage de la galerie de médias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nombre de colonnes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Nombre de colonnes</Label>
              <span className="text-sm text-muted-foreground">{gridColumns}</span>
            </div>
            <Slider
              value={[gridColumns]}
              onValueChange={handleColumnsChange}
              min={2}
              max={6}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
            </div>
          </div>

          {/* Style de carte */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Style de carte</Label>
                <p className="text-xs text-muted-foreground">Apparence des cartes médias</p>
              </div>
            </div>
            <Select value={cardStyle} onValueChange={handleCardStyleChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="grid">Grille</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-play vidéos */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label htmlFor="auto-play" className="text-sm font-medium cursor-pointer">
                  Lecture automatique des vidéos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Les vidéos démarrent au survol
                </p>
              </div>
            </div>
            <Switch
              id="auto-play"
              checked={autoPlay}
              onCheckedChange={handleAutoPlayChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
