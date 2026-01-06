import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  LayoutGrid, 
  Type, 
  Square, 
  Minimize2, 
  RotateCcw,
  Eye,
  Heart,
  Download,
  Share,
  Play,
  MoreHorizontal,
  Calendar,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface AdvancedCardSettings {
  // Dimensions
  cardBorderRadius: number;
  cardPadding: number;
  
  // Header
  showHeader: boolean;
  headerPadding: number;
  avatarSize: number;
  usernameFontSize: number;
  
  // Media
  mediaAspectRatio: 'auto' | '16:9' | '4:3' | '1:1';
  mediaBorderRadius: number;
  showDuration: boolean;
  showViewCount: boolean;
  
  // Metadata
  showMetadata: boolean;
  metadataFontSize: number;
  
  // Title
  showTitle: boolean;
  titleFontSize: number;
  titleLineClamp: number;
  
  // Actions
  showActions: boolean;
  showActionText: boolean;
  actionButtonSize: number;
  actionIconSize: number;
  
  // Layout
  layoutOrder: 'header-first' | 'media-first';
  sectionGap: number;
  
  // Preset
  preset: 'normal' | 'minimalist' | 'compact' | 'custom';
}

const PRESETS: Record<string, AdvancedCardSettings> = {
  normal: {
    cardBorderRadius: 12,
    cardPadding: 0,
    showHeader: true,
    headerPadding: 16,
    avatarSize: 40,
    usernameFontSize: 14,
    mediaAspectRatio: '16:9',
    mediaBorderRadius: 0,
    showDuration: true,
    showViewCount: true,
    showMetadata: true,
    metadataFontSize: 12,
    showTitle: true,
    titleFontSize: 14,
    titleLineClamp: 2,
    showActions: true,
    showActionText: true,
    actionButtonSize: 32,
    actionIconSize: 16,
    layoutOrder: 'header-first',
    sectionGap: 0,
    preset: 'normal'
  },
  minimalist: {
    cardBorderRadius: 8,
    cardPadding: 0,
    showHeader: false,
    headerPadding: 8,
    avatarSize: 28,
    usernameFontSize: 12,
    mediaAspectRatio: '16:9',
    mediaBorderRadius: 8,
    showDuration: true,
    showViewCount: false,
    showMetadata: false,
    metadataFontSize: 10,
    showTitle: false,
    titleFontSize: 12,
    titleLineClamp: 1,
    showActions: true,
    showActionText: false,
    actionButtonSize: 28,
    actionIconSize: 14,
    layoutOrder: 'media-first',
    sectionGap: 0,
    preset: 'minimalist'
  },
  compact: {
    cardBorderRadius: 6,
    cardPadding: 0,
    showHeader: true,
    headerPadding: 8,
    avatarSize: 24,
    usernameFontSize: 11,
    mediaAspectRatio: '1:1',
    mediaBorderRadius: 0,
    showDuration: true,
    showViewCount: true,
    showMetadata: false,
    metadataFontSize: 10,
    showTitle: true,
    titleFontSize: 11,
    titleLineClamp: 1,
    showActions: true,
    showActionText: false,
    actionButtonSize: 24,
    actionIconSize: 12,
    layoutOrder: 'header-first',
    sectionGap: 0,
    preset: 'compact'
  }
};

const DEFAULT_SETTINGS = PRESETS.normal;

const getStoredSettings = (): AdvancedCardSettings => {
  try {
    const stored = localStorage.getItem('mediavault-advanced-card-settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {}
  return DEFAULT_SETTINGS;
};

export const CardDesignEditor = () => {
  const [settings, setSettings] = useState<AdvancedCardSettings>(getStoredSettings);
  const [previewTab, setPreviewTab] = useState<'image' | 'video'>('image');

  useEffect(() => {
    localStorage.setItem('mediavault-advanced-card-settings', JSON.stringify(settings));
    // Also update legacy settings for backward compatibility
    localStorage.setItem('mediavault-card-show-metadata', String(settings.showMetadata));
    localStorage.setItem('mediavault-card-show-title', String(settings.showTitle));
    localStorage.setItem('mediavault-card-show-action-text', String(settings.showActionText));
    localStorage.setItem('mediavault-card-layout-order', settings.layoutOrder);
    window.dispatchEvent(new CustomEvent('mediavault-card-settings-changed'));
  }, [settings]);

  const updateSetting = <K extends keyof AdvancedCardSettings>(key: K, value: AdvancedCardSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value, preset: 'custom' as const }));
  };

  const applyPreset = (presetName: 'normal' | 'minimalist' | 'compact') => {
    setSettings(PRESETS[presetName]);
    toast.success(`Preset "${presetName}" appliqué`);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.success('Paramètres réinitialisés');
  };

  const getAspectRatioClass = () => {
    switch (settings.mediaAspectRatio) {
      case '1:1': return 'aspect-square';
      case '4:3': return 'aspect-[4/3]';
      default: return 'aspect-video';
    }
  };

  // Preview card component
  const PreviewCard = () => (
    <div 
      className="bg-card border border-border/50 overflow-hidden transition-all"
      style={{ 
        borderRadius: settings.cardBorderRadius,
        padding: settings.cardPadding
      }}
    >
      {settings.layoutOrder === 'header-first' && settings.showHeader && (
        <div className="flex items-start gap-3" style={{ padding: settings.headerPadding, paddingBottom: settings.headerPadding * 0.75 }}>
          <div 
            className="rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold"
            style={{ 
              width: settings.avatarSize, 
              height: settings.avatarSize,
              fontSize: settings.avatarSize * 0.35
            }}
          >
            MV
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground" style={{ fontSize: settings.usernameFontSize }}>MediaVault</span>
              <span className="text-muted-foreground" style={{ fontSize: settings.usernameFontSize * 0.9 }}>@mediavault</span>
              <span className="text-muted-foreground" style={{ fontSize: settings.usernameFontSize * 0.9 }}>·</span>
              <span className="text-muted-foreground" style={{ fontSize: settings.usernameFontSize * 0.9 }}>2h</span>
            </div>
            {settings.showTitle && (
              <p 
                className="text-foreground mt-1"
                style={{ 
                  fontSize: settings.titleFontSize,
                  display: '-webkit-box',
                  WebkitLineClamp: settings.titleLineClamp,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                Exemple de titre de média
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="opacity-50" style={{ width: settings.actionButtonSize, height: settings.actionButtonSize }}>
            <MoreHorizontal style={{ width: settings.actionIconSize, height: settings.actionIconSize }} />
          </Button>
        </div>
      )}

      {/* Media preview */}
      <div 
        className={cn("relative bg-muted/50", getAspectRatioClass())}
        style={{ borderRadius: settings.mediaBorderRadius }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {previewTab === 'video' ? (
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">Aperçu Image</div>
          )}
        </div>
        
        {/* Duration badge */}
        {settings.showDuration && previewTab === 'video' && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white font-medium">
            2:34
          </div>
        )}
        
        {/* View count badge */}
        {settings.showViewCount && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white font-medium flex items-center gap-1">
            <Eye className="w-3 h-3" />
            42
          </div>
        )}
      </div>

      {settings.layoutOrder === 'media-first' && settings.showHeader && (
        <div className="flex items-start gap-3" style={{ padding: settings.headerPadding }}>
          <div 
            className="rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold"
            style={{ 
              width: settings.avatarSize, 
              height: settings.avatarSize,
              fontSize: settings.avatarSize * 0.35
            }}
          >
            MV
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground" style={{ fontSize: settings.usernameFontSize }}>MediaVault</span>
              <span className="text-muted-foreground" style={{ fontSize: settings.usernameFontSize * 0.9 }}>@mediavault</span>
            </div>
            {settings.showTitle && (
              <p className="text-foreground mt-1" style={{ fontSize: settings.titleFontSize }}>
                Exemple de titre
              </p>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      {settings.showMetadata && (
        <div 
          className="flex items-center gap-4 text-muted-foreground border-b border-border/30"
          style={{ 
            padding: `${settings.headerPadding * 0.5}px ${settings.headerPadding}px`,
            fontSize: settings.metadataFontSize 
          }}
        >
          <span className="flex items-center gap-1">
            <Calendar style={{ width: settings.metadataFontSize, height: settings.metadataFontSize }} />
            25 déc. 2024
          </span>
          <span className="flex items-center gap-1">
            <HardDrive style={{ width: settings.metadataFontSize, height: settings.metadataFontSize }} />
            2.4 MB
          </span>
          <span className="uppercase font-medium text-primary/80">
            {previewTab === 'video' ? 'Vidéo' : 'Photo'}
          </span>
        </div>
      )}

      {/* Actions */}
      {settings.showActions && (
        <div className="flex items-center justify-between px-2 py-1">
          <Button variant="ghost" className="flex-1 gap-1 text-muted-foreground" style={{ height: settings.actionButtonSize }}>
            <Eye style={{ width: settings.actionIconSize, height: settings.actionIconSize }} />
            {settings.showActionText && <span style={{ fontSize: settings.actionIconSize * 0.75 }}>Voir</span>}
          </Button>
          <Button variant="ghost" className="flex-1 gap-1 text-muted-foreground" style={{ height: settings.actionButtonSize }}>
            <Heart style={{ width: settings.actionIconSize, height: settings.actionIconSize }} />
            {settings.showActionText && <span style={{ fontSize: settings.actionIconSize * 0.75 }}>J'aime</span>}
          </Button>
          <Button variant="ghost" className="flex-1 gap-1 text-muted-foreground" style={{ height: settings.actionButtonSize }}>
            <Download style={{ width: settings.actionIconSize, height: settings.actionIconSize }} />
          </Button>
          <Button variant="ghost" className="flex-1 gap-1 text-muted-foreground" style={{ height: settings.actionButtonSize }}>
            <Share style={{ width: settings.actionIconSize, height: settings.actionIconSize }} />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Presets de design
          </CardTitle>
          <CardDescription>Choisissez un style prédéfini ou personnalisez</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant={settings.preset === 'normal' ? 'default' : 'outline'}
              className="h-auto py-4 flex-col gap-2"
              onClick={() => applyPreset('normal')}
            >
              <LayoutGrid className="w-6 h-6" />
              <span>Normal</span>
              <span className="text-xs opacity-70">Tous les éléments</span>
            </Button>
            <Button 
              variant={settings.preset === 'minimalist' ? 'default' : 'outline'}
              className="h-auto py-4 flex-col gap-2"
              onClick={() => applyPreset('minimalist')}
            >
              <Minimize2 className="w-6 h-6" />
              <span>Minimaliste</span>
              <span className="text-xs opacity-70">Épuré</span>
            </Button>
            <Button 
              variant={settings.preset === 'compact' ? 'default' : 'outline'}
              className="h-auto py-4 flex-col gap-2"
              onClick={() => applyPreset('compact')}
            >
              <Square className="w-6 h-6" />
              <span>Compact</span>
              <span className="text-xs opacity-70">Plus de cartes</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Prévisualisation en direct
            </span>
            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'image' | 'video')}>
              <TabsList className="h-8">
                <TabsTrigger value="image" className="text-xs px-3">Image</TabsTrigger>
                <TabsTrigger value="video" className="text-xs px-3">Vidéo</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm mx-auto">
            <PreviewCard />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Personnalisation avancée
            </span>
            <Button variant="ghost" size="sm" onClick={resetSettings}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Card Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Carte</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Coins arrondis: {settings.cardBorderRadius}px</Label>
                <Slider 
                  value={[settings.cardBorderRadius]} 
                  onValueChange={([v]) => updateSetting('cardBorderRadius', v)}
                  min={0} max={24} step={1}
                />
              </div>
            </div>
          </div>

          {/* Header Settings */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">En-tête</h4>
              <Switch checked={settings.showHeader} onCheckedChange={(v) => updateSetting('showHeader', v)} />
            </div>
            {settings.showHeader && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Taille avatar: {settings.avatarSize}px</Label>
                  <Slider 
                    value={[settings.avatarSize]} 
                    onValueChange={([v]) => updateSetting('avatarSize', v)}
                    min={20} max={60} step={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Taille police: {settings.usernameFontSize}px</Label>
                  <Slider 
                    value={[settings.usernameFontSize]} 
                    onValueChange={([v]) => updateSetting('usernameFontSize', v)}
                    min={10} max={20} step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Padding: {settings.headerPadding}px</Label>
                  <Slider 
                    value={[settings.headerPadding]} 
                    onValueChange={([v]) => updateSetting('headerPadding', v)}
                    min={4} max={24} step={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Media Settings */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Zone média</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Ratio d'aspect</Label>
                <Select value={settings.mediaAspectRatio} onValueChange={(v) => updateSetting('mediaAspectRatio', v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="1:1">1:1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Coins arrondis: {settings.mediaBorderRadius}px</Label>
                <Slider 
                  value={[settings.mediaBorderRadius]} 
                  onValueChange={([v]) => updateSetting('mediaBorderRadius', v)}
                  min={0} max={24} step={1}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={settings.showDuration} onCheckedChange={(v) => updateSetting('showDuration', v)} />
                <Label className="text-xs">Durée vidéo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={settings.showViewCount} onCheckedChange={(v) => updateSetting('showViewCount', v)} />
                <Label className="text-xs">Compteur vues</Label>
              </div>
            </div>
          </div>

          {/* Title Settings */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Titre</h4>
              <Switch checked={settings.showTitle} onCheckedChange={(v) => updateSetting('showTitle', v)} />
            </div>
            {settings.showTitle && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Taille police: {settings.titleFontSize}px</Label>
                  <Slider 
                    value={[settings.titleFontSize]} 
                    onValueChange={([v]) => updateSetting('titleFontSize', v)}
                    min={10} max={24} step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Lignes max: {settings.titleLineClamp}</Label>
                  <Slider 
                    value={[settings.titleLineClamp]} 
                    onValueChange={([v]) => updateSetting('titleLineClamp', v)}
                    min={1} max={4} step={1}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Metadata Settings */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Métadonnées</h4>
              <Switch checked={settings.showMetadata} onCheckedChange={(v) => updateSetting('showMetadata', v)} />
            </div>
            {settings.showMetadata && (
              <div className="space-y-2">
                <Label className="text-xs">Taille police: {settings.metadataFontSize}px</Label>
                <Slider 
                  value={[settings.metadataFontSize]} 
                  onValueChange={([v]) => updateSetting('metadataFontSize', v)}
                  min={8} max={16} step={1}
                />
              </div>
            )}
          </div>

          {/* Actions Settings */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Actions</h4>
              <Switch checked={settings.showActions} onCheckedChange={(v) => updateSetting('showActions', v)} />
            </div>
            {settings.showActions && (
              <>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.showActionText} onCheckedChange={(v) => updateSetting('showActionText', v)} />
                  <Label className="text-xs">Afficher le texte des boutons</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Taille boutons: {settings.actionButtonSize}px</Label>
                    <Slider 
                      value={[settings.actionButtonSize]} 
                      onValueChange={([v]) => updateSetting('actionButtonSize', v)}
                      min={20} max={48} step={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Taille icônes: {settings.actionIconSize}px</Label>
                    <Slider 
                      value={[settings.actionIconSize]} 
                      onValueChange={([v]) => updateSetting('actionIconSize', v)}
                      min={10} max={24} step={1}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Layout Settings */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Disposition</h4>
            <div className="space-y-2">
              <Label className="text-xs">Ordre des éléments</Label>
              <Select value={settings.layoutOrder} onValueChange={(v) => updateSetting('layoutOrder', v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header-first">En-tête en haut</SelectItem>
                  <SelectItem value="media-first">Média en haut</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const useAdvancedCardSettings = (): AdvancedCardSettings => {
  const [settings, setSettings] = useState<AdvancedCardSettings>(() => {
    try {
      const stored = localStorage.getItem('mediavault-advanced-card-settings');
      if (stored) {
        return { ...PRESETS.normal, ...JSON.parse(stored) };
      }
    } catch (e) {}
    return PRESETS.normal;
  });

  useEffect(() => {
    const handleChange = () => {
      try {
        const stored = localStorage.getItem('mediavault-advanced-card-settings');
        if (stored) {
          setSettings({ ...PRESETS.normal, ...JSON.parse(stored) });
        }
      } catch (e) {}
    };

    window.addEventListener('mediavault-card-settings-changed', handleChange);
    return () => window.removeEventListener('mediavault-card-settings-changed', handleChange);
  }, []);

  return settings;
};