import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Palette, 
  Check, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Moon,
  Sun,
  Waves,
  Trees,
  Sunset,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemePresets, ThemePreset } from '@/hooks/useThemePresets';
import { toast } from 'sonner';

const PRESET_ICONS: Record<string, React.ElementType> = {
  'default': Sparkles,
  'dark-neon': Moon,
  'light-minimal': Sun,
  'cyberpunk': Sparkles,
  'ocean-breeze': Waves,
  'forest-green': Trees,
  'sunset-warm': Sunset,
  'monochrome': Circle,
};

export function ThemePresetsPanel() {
  const {
    currentPreset,
    presets,
    customThemes,
    selectPreset,
    saveCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    resetToDefault,
  } = useThemePresets();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveCustomTheme = () => {
    if (!newThemeName.trim()) {
      toast.error('Veuillez entrer un nom pour le thème');
      return;
    }
    saveCustomTheme(newThemeName, newThemeDescription);
    toast.success(`Thème "${newThemeName}" sauvegardé !`);
    setSaveDialogOpen(false);
    setNewThemeName('');
    setNewThemeDescription('');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const theme = await importTheme(file);
      toast.success(`Thème "${theme.name}" importé !`);
    } catch (err) {
      toast.error('Erreur lors de l\'import du thème');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (theme: ThemePreset) => {
    deleteCustomTheme(theme.id);
    toast.success(`Thème "${theme.name}" supprimé`);
  };

  const getPreviewColors = (preset: ThemePreset) => {
    const colors = preset.colors;
    return {
      bg: `hsl(${colors.background})`,
      primary: `hsl(${colors.primary})`,
      accent: `hsl(${colors.accent})`,
      muted: `hsl(${colors.muted})`,
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Thèmes prédéfinis
          </CardTitle>
          <CardDescription>
            Choisissez un thème ou créez le vôtre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-2 gap-3">
              {presets.map((preset) => {
                const Icon = PRESET_ICONS[preset.id] || Palette;
                const colors = getPreviewColors(preset);
                const isActive = currentPreset.id === preset.id;

                return (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset.id)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all text-left group",
                      "hover:scale-[1.02] hover:shadow-lg",
                      isActive 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-border hover:border-primary/50"
                    )}
                    style={{ backgroundColor: colors.bg }}
                  >
                    {/* Preview dots */}
                    <div className="flex gap-1.5 mb-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: colors.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: colors.accent }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: colors.muted }}
                      />
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" style={{ color: colors.primary }} />
                      <span 
                        className="font-medium text-sm"
                        style={{ color: `hsl(${preset.colors.foreground})` }}
                      >
                        {preset.name}
                      </span>
                    </div>
                    <p 
                      className="text-xs opacity-70 line-clamp-2"
                      style={{ color: `hsl(${preset.colors.mutedForeground})` }}
                    >
                      {preset.description}
                    </p>

                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {customThemes.length > 0 && (
              <>
                <Separator className="my-6" />
                <Label className="text-sm font-medium mb-3 block">Thèmes personnalisés</Label>
                <div className="grid grid-cols-2 gap-3">
                  {customThemes.map((theme) => {
                    const colors = getPreviewColors(theme);
                    const isActive = currentPreset.id === theme.id;

                    return (
                      <div
                        key={theme.id}
                        className={cn(
                          "relative p-4 rounded-xl border-2 transition-all group",
                          isActive 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50"
                        )}
                        style={{ backgroundColor: colors.bg }}
                      >
                        <button
                          onClick={() => selectPreset(theme.id)}
                          className="w-full text-left"
                        >
                          <div className="flex gap-1.5 mb-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: colors.primary }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: colors.accent }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: colors.muted }}
                            />
                          </div>

                          <span 
                            className="font-medium text-sm block mb-1"
                            style={{ color: `hsl(${theme.colors.foreground})` }}
                          >
                            {theme.name}
                          </span>
                          <p 
                            className="text-xs opacity-70 line-clamp-2"
                            style={{ color: `hsl(${theme.colors.mutedForeground})` }}
                          >
                            {theme.description}
                          </p>
                        </button>

                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportTheme(theme);
                            }}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(theme);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        {isActive && (
                          <div className="absolute top-2 right-2 group-hover:hidden">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Sauvegarder actuel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sauvegarder le thème actuel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme-name">Nom du thème</Label>
                    <Input
                      id="theme-name"
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="Mon thème personnalisé"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="theme-desc">Description (optionnel)</Label>
                    <Input
                      id="theme-desc"
                      value={newThemeDescription}
                      onChange={(e) => setNewThemeDescription(e.target.value)}
                      placeholder="Description du thème..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSaveCustomTheme}>
                    Sauvegarder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => exportTheme()}
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter thème
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importer thème
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetToDefault();
                toast.success('Thème réinitialisé');
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prévisualisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-background border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-medium text-foreground">Titre exemple</div>
                <div className="text-sm text-muted-foreground">Sous-titre en couleur atténuée</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="secondary">Secondary</Button>
              <Button size="sm" variant="outline">Outline</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
