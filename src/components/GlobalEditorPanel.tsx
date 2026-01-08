import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  Download, 
  Upload,
  Palette,
  Type,
  Move,
  Eye,
  EyeOff,
  Maximize2,
  Square,
  Circle,
  Triangle,
  Star,
  Heart,
  Zap,
  Settings,
  Home,
  Image,
  Video,
  Music,
  Folder,
  FileText,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useGlobalEditorContext } from './GlobalEditorProvider';
import { cn } from '@/lib/utils';

const ICON_OPTIONS = [
  { name: 'Home', icon: Home },
  { name: 'Image', icon: Image },
  { name: 'Video', icon: Video },
  { name: 'Music', icon: Music },
  { name: 'Folder', icon: Folder },
  { name: 'FileText', icon: FileText },
  { name: 'Settings', icon: Settings },
  { name: 'Heart', icon: Heart },
  { name: 'Star', icon: Star },
  { name: 'Zap', icon: Zap },
  { name: 'Square', icon: Square },
  { name: 'Circle', icon: Circle },
  { name: 'Triangle', icon: Triangle },
];

const COLOR_PRESETS = [
  { name: 'Primary', value: 'hsl(var(--primary))' },
  { name: 'Secondary', value: 'hsl(var(--secondary))' },
  { name: 'Accent', value: 'hsl(var(--accent))' },
  { name: 'Muted', value: 'hsl(var(--muted))' },
  { name: 'Destructive', value: 'hsl(var(--destructive))' },
  { name: 'Purple', value: 'hsl(270 70% 60%)' },
  { name: 'Blue', value: 'hsl(210 100% 50%)' },
  { name: 'Green', value: 'hsl(142 70% 45%)' },
  { name: 'Orange', value: 'hsl(25 95% 53%)' },
  { name: 'Pink', value: 'hsl(330 80% 60%)' },
];

export function GlobalEditorPanel() {
  const {
    isEditMode,
    selectedElement,
    canUndo,
    canRedo,
    setEditMode,
    selectElement,
    updateElementProperty,
    getElementProperties,
    undo,
    redo,
    resetElement,
    resetAll,
    exportConfig,
    importConfig,
  } = useGlobalEditorContext();

  const [iconSectionOpen, setIconSectionOpen] = useState(true);
  const [sizeSectionOpen, setSizeSectionOpen] = useState(true);
  const [colorSectionOpen, setColorSectionOpen] = useState(true);

  if (!isEditMode) return null;

  const currentProps = selectedElement ? getElementProperties(selectedElement.id) : {};

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importConfig(file);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        className="fixed right-0 top-0 h-screen w-80 bg-background border-l border-border shadow-xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Éditeur Global</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setEditMode(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="p-2 border-b border-border flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={undo} 
            disabled={!canUndo}
            title="Annuler"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={redo} 
            disabled={!canRedo}
            title="Rétablir"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={resetAll}
            title="Réinitialiser tout"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={exportConfig}
            title="Exporter"
          >
            <Download className="w-4 h-4" />
          </Button>
          <label>
            <Button 
              variant="ghost" 
              size="icon" 
              asChild
              title="Importer"
            >
              <span>
                <Upload className="w-4 h-4" />
              </span>
            </Button>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleFileImport}
            />
          </label>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {selectedElement ? (
              <>
                {/* Selected Element Info */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{selectedElement.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                      {selectedElement.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedElement.selector}</p>
                </div>

                <Tabs defaultValue="style" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
                    <TabsTrigger value="layout" className="flex-1">Layout</TabsTrigger>
                  </TabsList>

                  <TabsContent value="style" className="space-y-4 mt-4">
                    {/* Icon Selection */}
                    {selectedElement.type === 'icon' && (
                      <Collapsible open={iconSectionOpen} onOpenChange={setIconSectionOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50">
                          <span className="text-sm font-medium">Icône</span>
                          <ChevronDown className={cn("w-4 h-4 transition-transform", iconSectionOpen && "rotate-180")} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-3">
                          <div className="grid grid-cols-5 gap-2">
                            {ICON_OPTIONS.map(({ name, icon: Icon }) => (
                              <button
                                key={name}
                                onClick={() => updateElementProperty(selectedElement.id, 'icon', name)}
                                className={cn(
                                  "p-2 rounded-lg border transition-all hover:border-primary",
                                  currentProps.icon === name 
                                    ? "border-primary bg-primary/10" 
                                    : "border-border"
                                )}
                              >
                                <Icon className="w-4 h-4 mx-auto" />
                              </button>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Size Controls */}
                    <Collapsible open={sizeSectionOpen} onOpenChange={setSizeSectionOpen}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50">
                        <span className="text-sm font-medium">Taille</span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", sizeSectionOpen && "rotate-180")} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-3">
                        {selectedElement.type === 'icon' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Taille icône</Label>
                              <span className="text-xs text-muted-foreground">{currentProps.iconSize || 20}px</span>
                            </div>
                            <Slider
                              value={[currentProps.iconSize || 20]}
                              onValueChange={([v]) => updateElementProperty(selectedElement.id, 'iconSize', v)}
                              min={12}
                              max={48}
                              step={2}
                            />
                          </div>
                        )}
                        {selectedElement.type === 'text' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Taille police</Label>
                              <span className="text-xs text-muted-foreground">{currentProps.fontSize || 14}px</span>
                            </div>
                            <Slider
                              value={[currentProps.fontSize || 14]}
                              onValueChange={([v]) => updateElementProperty(selectedElement.id, 'fontSize', v)}
                              min={10}
                              max={32}
                              step={1}
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Rayon bordure</Label>
                            <span className="text-xs text-muted-foreground">{currentProps.borderRadius || 0}px</span>
                          </div>
                          <Slider
                            value={[currentProps.borderRadius || 0]}
                            onValueChange={([v]) => updateElementProperty(selectedElement.id, 'borderRadius', v)}
                            min={0}
                            max={24}
                            step={1}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Color Controls */}
                    <Collapsible open={colorSectionOpen} onOpenChange={setColorSectionOpen}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50">
                        <span className="text-sm font-medium">Couleurs</span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform", colorSectionOpen && "rotate-180")} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Couleur</Label>
                          <div className="grid grid-cols-5 gap-2">
                            {COLOR_PRESETS.map(({ name, value }) => (
                              <button
                                key={name}
                                onClick={() => updateElementProperty(selectedElement.id, 'color', value)}
                                className={cn(
                                  "w-full aspect-square rounded-lg border-2 transition-all",
                                  currentProps.color === value 
                                    ? "border-foreground scale-110" 
                                    : "border-transparent hover:border-muted-foreground"
                                )}
                                style={{ backgroundColor: value }}
                                title={name}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Fond</Label>
                          <div className="grid grid-cols-5 gap-2">
                            <button
                              onClick={() => updateElementProperty(selectedElement.id, 'backgroundColor', 'transparent')}
                              className={cn(
                                "w-full aspect-square rounded-lg border-2 transition-all bg-transparent",
                                currentProps.backgroundColor === 'transparent' 
                                  ? "border-foreground" 
                                  : "border-border"
                              )}
                              title="Transparent"
                            >
                              <X className="w-3 h-3 mx-auto text-muted-foreground" />
                            </button>
                            {COLOR_PRESETS.slice(0, 4).map(({ name, value }) => (
                              <button
                                key={name}
                                onClick={() => updateElementProperty(selectedElement.id, 'backgroundColor', value)}
                                className={cn(
                                  "w-full aspect-square rounded-lg border-2 transition-all",
                                  currentProps.backgroundColor === value 
                                    ? "border-foreground scale-110" 
                                    : "border-transparent hover:border-muted-foreground"
                                )}
                                style={{ backgroundColor: value }}
                                title={name}
                              />
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </TabsContent>

                  <TabsContent value="layout" className="space-y-4 mt-4">
                    {/* Visibility */}
                    <div className="flex items-center justify-between p-2">
                      <Label className="text-sm">Visible</Label>
                      <Switch
                        checked={currentProps.visible !== false}
                        onCheckedChange={(v) => updateElementProperty(selectedElement.id, 'visible', v)}
                      />
                    </div>

                    {/* Spacing */}
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Padding</Label>
                          <span className="text-xs text-muted-foreground">{currentProps.padding || 0}px</span>
                        </div>
                        <Slider
                          value={[currentProps.padding || 0]}
                          onValueChange={([v]) => updateElementProperty(selectedElement.id, 'padding', v)}
                          min={0}
                          max={32}
                          step={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Margin</Label>
                          <span className="text-xs text-muted-foreground">{currentProps.margin || 0}px</span>
                        </div>
                        <Slider
                          value={[currentProps.margin || 0]}
                          onValueChange={([v]) => updateElementProperty(selectedElement.id, 'margin', v)}
                          min={0}
                          max={32}
                          step={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Gap</Label>
                          <span className="text-xs text-muted-foreground">{currentProps.gap || 0}px</span>
                        </div>
                        <Slider
                          value={[currentProps.gap || 0]}
                          onValueChange={([v]) => updateElementProperty(selectedElement.id, 'gap', v)}
                          min={0}
                          max={24}
                          step={2}
                        />
                      </div>
                    </div>

                    {/* Order */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Ordre</Label>
                        <span className="text-xs text-muted-foreground">{currentProps.order || 0}</span>
                      </div>
                      <Slider
                        value={[currentProps.order || 0]}
                        onValueChange={([v]) => updateElementProperty(selectedElement.id, 'order', v)}
                        min={-10}
                        max={10}
                        step={1}
                      />
                    </div>

                    {/* Reset Element */}
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => resetElement(selectedElement.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Réinitialiser cet élément
                    </Button>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Move className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Cliquez sur un élément pour le modifier</p>
                <p className="text-xs mt-2">Les éléments modifiables ont un contour bleu au survol</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
          Mode édition actif • Appuyez sur Échap pour quitter
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
