import React, { useState } from 'react';
import { useSettingsLayoutContext } from './SettingsLayoutProvider';
import { SettingsLayoutStyle } from '@/types/settings';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Pencil,
  RotateCcw,
  Layout,
  LayoutList,
  Grid3X3,
  Plus,
  Check,
  Palette,
  Sparkles,
  Square,
  LayoutGrid,
  Rows3,
  Monitor,
  Glasses,
  Zap,
  Terminal,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsCustomizerProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface StylePreset {
  id: SettingsLayoutStyle;
  name: string;
  description: string;
  icon: React.ReactNode;
  preview: string; // CSS class for preview
}

const STYLE_PRESETS: StylePreset[] = [
  { 
    id: 'windows11', 
    name: 'Windows 11 Modern', 
    description: 'Tuiles avec icônes colorées et effets de survol subtils',
    icon: <Monitor className="h-4 w-4" />,
    preview: 'bg-card/80 border border-border/50 rounded-xl shadow-sm'
  },
  { 
    id: 'material', 
    name: 'Material Design', 
    description: 'Cards avec ombres et animations fluides',
    icon: <Square className="h-4 w-4" />,
    preview: 'bg-card shadow-md rounded-lg'
  },
  { 
    id: 'minimal', 
    name: 'Minimaliste', 
    description: 'Épuré, focus sur le contenu',
    icon: <Type className="h-4 w-4" />,
    preview: 'bg-transparent hover:bg-muted/30 rounded-md'
  },
  { 
    id: 'dashboard', 
    name: 'Dashboard Pro', 
    description: 'Style tableau de bord professionnel',
    icon: <LayoutGrid className="h-4 w-4" />,
    preview: 'bg-gradient-to-br from-card to-muted/50 border rounded-lg'
  },
  { 
    id: 'mosaic', 
    name: 'Mosaïque Compacte', 
    description: 'Tuiles compactes, haute densité',
    icon: <Grid3X3 className="h-4 w-4" />,
    preview: 'bg-card border border-border/40 rounded-md'
  },
  { 
    id: 'list', 
    name: 'Liste Verticale', 
    description: 'Présentation en liste traditionnelle',
    icon: <Rows3 className="h-4 w-4" />,
    preview: 'bg-card/50 border-b border-border/30'
  },
  { 
    id: 'glass', 
    name: 'Glassmorphism', 
    description: 'Effet verre dépoli moderne',
    icon: <Glasses className="h-4 w-4" />,
    preview: 'bg-white/5 backdrop-blur border border-white/10 rounded-2xl'
  },
  { 
    id: 'neon', 
    name: 'Néon / Cyberpunk', 
    description: 'Style futuriste avec effets lumineux',
    icon: <Zap className="h-4 w-4" />,
    preview: 'bg-black/80 border border-primary/50 rounded-lg'
  },
  { 
    id: 'retro', 
    name: 'Retro / Pixel', 
    description: 'Ombres décalées, style rétro',
    icon: <Terminal className="h-4 w-4" />,
    preview: 'bg-card border-2 shadow-[4px_4px_0_0_hsl(var(--border))]'
  },
  { 
    id: 'mono', 
    name: 'Mono (Texte)', 
    description: 'Police mono, icônes minimalistes',
    icon: <Type className="h-4 w-4" />,
    preview: 'bg-transparent font-mono'
  },
];

export function SettingsCustomizer({ isOpen, onOpenChange }: SettingsCustomizerProps) {
  const { 
    config, 
    setStyle, 
    setOrientation, 
    toggleEditMode, 
    setEditMode,
    resetToDefaults,
    createCustomGroup 
  } = useSettingsLayoutContext();
  
  const [newGroupName, setNewGroupName] = useState('');
  const [showGroupInput, setShowGroupInput] = useState(false);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Entrez un nom pour le groupe');
      return;
    }
    createCustomGroup(newGroupName, 'Folder', []);
    setNewGroupName('');
    setShowGroupInput(false);
    toast.success(`Groupe "${newGroupName}" créé`);
  };

  const handleReset = () => {
    resetToDefaults();
    toast.success('Paramètres réinitialisés');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Personnaliser les paramètres
          </SheetTitle>
          <SheetDescription>
            Choisissez le style et l'organisation de vos paramètres
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="px-6 space-y-6">
            {/* Edit Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Pencil className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label className="font-medium">Mode édition</Label>
                  <p className="text-xs text-muted-foreground">
                    Réorganisez par glisser-déposer
                  </p>
                </div>
              </div>
              <Switch 
                checked={config.editMode} 
                onCheckedChange={setEditMode}
              />
            </div>

            <Separator />

            {/* Orientation */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Disposition</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={config.orientation === 'horizontal' ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setOrientation('horizontal')}
                >
                  <Layout className="h-4 w-4" />
                  Grille
                </Button>
                <Button
                  variant={config.orientation === 'vertical' ? 'default' : 'outline'}
                  className="justify-start gap-2"
                  onClick={() => setOrientation('vertical')}
                >
                  <LayoutList className="h-4 w-4" />
                  Colonne
                </Button>
              </div>
            </div>

            <Separator />

            {/* Style Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Style des tuiles
              </Label>
              <div className="space-y-2">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setStyle(preset.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                      config.style === preset.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 flex items-center justify-center',
                      preset.preview
                    )}>
                      {preset.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{preset.name}</span>
                        {config.style === preset.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Create Custom Group */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Groupes personnalisés</Label>
              {showGroupInput ? (
                <div className="flex gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Nom du groupe"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  />
                  <Button size="icon" onClick={handleCreateGroup}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setShowGroupInput(true)}
                >
                  <Plus className="h-4 w-4" />
                  Créer un groupe
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Créez vos propres catégories et glissez-y des modules
              </p>
            </div>

            <Separator />

            {/* Reset */}
            <Button 
              variant="outline" 
              className="w-full gap-2 text-destructive hover:text-destructive"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser tout
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
