import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, LayoutGrid, Type, RotateCcw, Eye, Heart, Download, Share, Play, MoreHorizontal,
  Calendar, HardDrive, Upload, FileDown, Grid3X3, List, Columns, Image, Layers, GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Types ---

export type CardViewMode = 'grid' | 'grid-large' | 'list' | 'masonry' | 'media-only' | 'adaptive';

export interface CardElement {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export interface AdvancedCardSettings {
  cardBorderRadius: number;
  cardPadding: number;
  showHeader: boolean;
  headerPadding: number;
  avatarSize: number;
  usernameFontSize: number;
  mediaAspectRatio: 'auto' | '16:9' | '4:3' | '1:1';
  mediaBorderRadius: number;
  showDuration: boolean;
  showViewCount: boolean;
  showMetadata: boolean;
  metadataFontSize: number;
  showTitle: boolean;
  titleFontSize: number;
  titleLineClamp: number;
  showActions: boolean;
  showActionText: boolean;
  actionButtonSize: number;
  actionIconSize: number;
  layoutOrder: 'header-first' | 'media-first';
  sectionGap: number;
  preset: string;
  elements: CardElement[];
}

const DEFAULT_ELEMENTS: CardElement[] = [
  { id: 'header', label: 'En-tête', enabled: true, order: 0 },
  { id: 'media', label: 'Zone média', enabled: true, order: 1 },
  { id: 'title', label: 'Titre', enabled: true, order: 2 },
  { id: 'metadata', label: 'Métadonnées', enabled: true, order: 3 },
  { id: 'duration', label: 'Badge durée', enabled: true, order: 4 },
  { id: 'viewCount', label: 'Compteur de vues', enabled: true, order: 5 },
  { id: 'actions', label: 'Actions', enabled: true, order: 6 },
  { id: 'infoButton', label: 'Bouton Info (i)', enabled: true, order: 7 },
];

const VIEW_MODES: { id: CardViewMode; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: 'grid', label: 'Grille', icon: Grid3X3, desc: 'Cartes en rangées' },
  { id: 'grid-large', label: 'Grande grille', icon: LayoutGrid, desc: '2 colonnes larges' },
  { id: 'list', label: 'Liste', icon: List, desc: 'Vue horizontale' },
  { id: 'masonry', label: 'Mosaïque', icon: Columns, desc: 'Style Pinterest' },
  { id: 'media-only', label: 'Média seul', icon: Image, desc: 'Sans décoration' },
  { id: 'adaptive', label: 'Adaptatif', icon: Layers, desc: 'Ratio original' },
];

const makeDefaultSettings = (): AdvancedCardSettings => ({
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
  preset: 'custom',
  elements: DEFAULT_ELEMENTS,
});

const storageKey = (mode: CardViewMode) => `mediavault-card-settings-${mode}`;

const getSettingsForView = (mode: CardViewMode): AdvancedCardSettings => {
  try {
    const stored = localStorage.getItem(storageKey(mode));
    if (stored) return { ...makeDefaultSettings(), ...JSON.parse(stored) };
  } catch {}
  // Also try legacy key for grid
  if (mode === 'grid') {
    try {
      const legacy = localStorage.getItem('mediavault-advanced-card-settings');
      if (legacy) return { ...makeDefaultSettings(), ...JSON.parse(legacy) };
    } catch {}
  }
  return makeDefaultSettings();
};

const saveSettingsForView = (mode: CardViewMode, settings: AdvancedCardSettings) => {
  localStorage.setItem(storageKey(mode), JSON.stringify(settings));
  // Legacy compat
  if (mode === 'grid') {
    localStorage.setItem('mediavault-advanced-card-settings', JSON.stringify(settings));
  }
  localStorage.setItem('mediavault-card-show-metadata', String(settings.showMetadata));
  localStorage.setItem('mediavault-card-show-title', String(settings.showTitle));
  localStorage.setItem('mediavault-card-show-action-text', String(settings.showActionText));
  localStorage.setItem('mediavault-card-layout-order', settings.layoutOrder);
  window.dispatchEvent(new CustomEvent('mediavault-card-settings-changed'));
};

// --- Sortable Element ---

function SortableElement({ element, onToggle }: { element: CardElement; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: element.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2 p-2 rounded-lg border bg-card text-sm", !element.enabled && "opacity-50")}>
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground"><GripVertical className="w-4 h-4" /></button>
      <span className="flex-1">{element.label}</span>
      <Switch checked={element.enabled} onCheckedChange={() => onToggle(element.id)} />
    </div>
  );
}

// --- Main Component ---

export const CardDesignEditor = () => {
  const [selectedView, setSelectedView] = useState<CardViewMode>('grid');
  const [settings, setSettings] = useState<AdvancedCardSettings>(() => getSettingsForView('grid'));
  const [previewTab, setPreviewTab] = useState<'image' | 'video'>('image');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Load settings when view changes
  useEffect(() => {
    setSettings(getSettingsForView(selectedView));
  }, [selectedView]);

  // Save on change
  useEffect(() => {
    saveSettingsForView(selectedView, settings);
  }, [settings, selectedView]);

  const updateSetting = <K extends keyof AdvancedCardSettings>(key: K, value: AdvancedCardSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value, preset: 'custom' }));
  };

  const toggleElement = (id: string) => {
    setSettings(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, enabled: !el.enabled } : el),
      // Sync boolean flags
      ...(id === 'header' ? { showHeader: !prev.elements.find(e => e.id === 'header')?.enabled } : {}),
      ...(id === 'title' ? { showTitle: !prev.elements.find(e => e.id === 'title')?.enabled } : {}),
      ...(id === 'metadata' ? { showMetadata: !prev.elements.find(e => e.id === 'metadata')?.enabled } : {}),
      ...(id === 'actions' ? { showActions: !prev.elements.find(e => e.id === 'actions')?.enabled } : {}),
      ...(id === 'duration' ? { showDuration: !prev.elements.find(e => e.id === 'duration')?.enabled } : {}),
      ...(id === 'viewCount' ? { showViewCount: !prev.elements.find(e => e.id === 'viewCount')?.enabled } : {}),
    }));
  };

  const handleElementDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSettings(prev => {
      const oldIdx = prev.elements.findIndex(e => e.id === active.id);
      const newIdx = prev.elements.findIndex(e => e.id === over.id);
      return { ...prev, elements: arrayMove(prev.elements, oldIdx, newIdx).map((el, i) => ({ ...el, order: i })) };
    });
  };

  const resetSettings = () => {
    setSettings(makeDefaultSettings());
    toast.success('Paramètres réinitialisés');
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mediavault-design-${selectedView}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Preset exporté');
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as AdvancedCardSettings;
        if (typeof imported.cardBorderRadius === 'number') {
          setSettings({ ...makeDefaultSettings(), ...imported, preset: 'custom' });
          toast.success('Preset importé');
        } else throw new Error('Invalid');
      } catch { toast.error("Erreur d'import"); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const getAspectRatioClass = () => {
    switch (settings.mediaAspectRatio) {
      case '1:1': return 'aspect-square';
      case '4:3': return 'aspect-[4/3]';
      default: return 'aspect-video';
    }
  };

  // --- Preview ---
  const PreviewCard = () => (
    <div className="bg-card border border-border/50 overflow-hidden transition-all" style={{ borderRadius: settings.cardBorderRadius, padding: settings.cardPadding }}>
      {settings.layoutOrder === 'header-first' && settings.showHeader && (
        <div className="flex items-start gap-3" style={{ padding: settings.headerPadding, paddingBottom: settings.headerPadding * 0.75 }}>
          <div className="rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold" style={{ width: settings.avatarSize, height: settings.avatarSize, fontSize: settings.avatarSize * 0.35 }}>MV</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground" style={{ fontSize: settings.usernameFontSize }}>MediaVault</span>
              <span className="text-muted-foreground" style={{ fontSize: settings.usernameFontSize * 0.9 }}>·</span>
              <span className="text-muted-foreground" style={{ fontSize: settings.usernameFontSize * 0.9 }}>2h</span>
            </div>
            {settings.showTitle && (
              <p className="text-foreground mt-1" style={{ fontSize: settings.titleFontSize, display: '-webkit-box', WebkitLineClamp: settings.titleLineClamp, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>Exemple de titre de média</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="opacity-50" style={{ width: settings.actionButtonSize, height: settings.actionButtonSize }}>
            <MoreHorizontal style={{ width: settings.actionIconSize, height: settings.actionIconSize }} />
          </Button>
        </div>
      )}
      <div className={cn("relative bg-muted/50", getAspectRatioClass())} style={{ borderRadius: settings.mediaBorderRadius }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {previewTab === 'video' ? (
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center"><Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" /></div>
          ) : (
            <div className="text-muted-foreground text-sm">Aperçu Image</div>
          )}
        </div>
        {settings.showDuration && previewTab === 'video' && <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white font-medium">2:34</div>}
        {settings.showViewCount && <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white font-medium flex items-center gap-1"><Eye className="w-3 h-3" />42</div>}
      </div>
      {settings.layoutOrder === 'media-first' && settings.showHeader && (
        <div className="flex items-start gap-3" style={{ padding: settings.headerPadding }}>
          <div className="rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold" style={{ width: settings.avatarSize, height: settings.avatarSize, fontSize: settings.avatarSize * 0.35 }}>MV</div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-foreground" style={{ fontSize: settings.usernameFontSize }}>MediaVault</span>
            {settings.showTitle && <p className="text-foreground mt-1" style={{ fontSize: settings.titleFontSize }}>Exemple de titre</p>}
          </div>
        </div>
      )}
      {settings.showMetadata && (
        <div className="flex items-center gap-4 text-muted-foreground border-b border-border/30" style={{ padding: `${settings.headerPadding * 0.5}px ${settings.headerPadding}px`, fontSize: settings.metadataFontSize }}>
          <span className="flex items-center gap-1"><Calendar style={{ width: settings.metadataFontSize, height: settings.metadataFontSize }} />25 déc. 2024</span>
          <span className="flex items-center gap-1"><HardDrive style={{ width: settings.metadataFontSize, height: settings.metadataFontSize }} />2.4 MB</span>
          <span className="uppercase font-medium text-primary/80">{previewTab === 'video' ? 'Vidéo' : 'Photo'}</span>
        </div>
      )}
      {settings.showActions && (
        <div className="flex items-center justify-between px-2 py-1">
          <Button variant="ghost" className="flex-1 gap-1 text-muted-foreground" style={{ height: settings.actionButtonSize }}><Eye style={{ width: settings.actionIconSize, height: settings.actionIconSize }} />{settings.showActionText && <span style={{ fontSize: settings.actionIconSize * 0.75 }}>Voir</span>}</Button>
          <Button variant="ghost" className="flex-1 gap-1 text-muted-foreground" style={{ height: settings.actionButtonSize }}><Heart style={{ width: settings.actionIconSize, height: settings.actionIconSize }} />{settings.showActionText && <span style={{ fontSize: settings.actionIconSize * 0.75 }}>J'aime</span>}</Button>
          <Button variant="ghost" className="flex-1 gap-1 text-muted-foreground" style={{ height: settings.actionButtonSize }}><Download style={{ width: settings.actionIconSize, height: settings.actionIconSize }} /></Button>
          <Button variant="ghost" className="flex-1 gap-1 text-muted-foreground" style={{ height: settings.actionButtonSize }}><Share style={{ width: settings.actionIconSize, height: settings.actionIconSize }} /></Button>
        </div>
      )}
    </div>
  );

  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 h-full min-h-[600px]">
      {/* Banner prototype */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="w-4 h-4 text-primary" />
          <span>Testez 6 concepts différents de personnalisation de carte</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/demo-card-editor')} className="gap-2">
          <Layers className="w-4 h-4" />
          Tester les prototypes
        </Button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
      {/* Left - Preview */}
      <div className="w-1/2 flex-shrink-0 sticky top-0 self-start">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Eye className="w-5 h-5" />Prévisualisation</span>
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'image' | 'video')}>
                <TabsList className="h-8">
                  <TabsTrigger value="image" className="text-xs px-3">Image</TabsTrigger>
                  <TabsTrigger value="video" className="text-xs px-3">Vidéo</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardTitle>
            <CardDescription>Vue : {VIEW_MODES.find(v => v.id === selectedView)?.label}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="w-full max-w-sm"><PreviewCard /></div>
          </CardContent>
        </Card>
      </div>

      {/* Right - Settings */}
      <div className="w-1/2 flex flex-col min-h-0 pr-2">
        {/* View selector - Fixed */}
        <div className="shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" />Vues</CardTitle>
              <CardDescription>Chaque vue a ses propres réglages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {VIEW_MODES.map(vm => (
                  <Button
                    key={vm.id}
                    variant={selectedView === vm.id ? 'default' : 'outline'}
                    className="h-auto py-3 flex-col gap-1 text-xs"
                    onClick={() => setSelectedView(vm.id)}
                  >
                    <vm.icon className="w-5 h-5" />
                    <span className="font-medium">{vm.label}</span>
                    <span className="opacity-70 text-[10px]">{vm.desc}</span>
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                <Button variant="outline" size="sm" onClick={exportSettings} className="flex-1"><FileDown className="w-4 h-4 mr-1" />Exporter</Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1"><Upload className="w-4 h-4 mr-1" />Importer</Button>
                <input ref={fileInputRef} type="file" accept=".json" onChange={importSettings} className="hidden" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Constructor + Detailed settings - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Element Constructor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Layers className="w-5 h-5" />Constructeur</CardTitle>
              <CardDescription>Glissez pour réordonner, activez/désactivez chaque élément</CardDescription>
            </CardHeader>
            <CardContent>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleElementDragEnd}>
                <SortableContext items={settings.elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {settings.elements.map(el => (
                      <SortableElement key={el.id} element={el} onToggle={toggleElement} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Type className="w-5 h-5" />Personnalisation avancée</span>
                <Button variant="ghost" size="sm" onClick={resetSettings}><RotateCcw className="w-4 h-4 mr-2" />Réinitialiser</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Card */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Carte</h4>
                <div className="space-y-2">
                  <Label className="text-xs">Coins arrondis: {settings.cardBorderRadius}px</Label>
                  <Slider value={[settings.cardBorderRadius]} onValueChange={([v]) => updateSetting('cardBorderRadius', v)} min={0} max={24} step={1} />
                </div>
              </div>

              {/* Header */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">En-tête</h4>
                  <Switch checked={settings.showHeader} onCheckedChange={(v) => updateSetting('showHeader', v)} />
                </div>
                {settings.showHeader && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Taille avatar: {settings.avatarSize}px</Label>
                      <Slider value={[settings.avatarSize]} onValueChange={([v]) => updateSetting('avatarSize', v)} min={20} max={60} step={2} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Taille police: {settings.usernameFontSize}px</Label>
                      <Slider value={[settings.usernameFontSize]} onValueChange={([v]) => updateSetting('usernameFontSize', v)} min={10} max={20} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Padding: {settings.headerPadding}px</Label>
                      <Slider value={[settings.headerPadding]} onValueChange={([v]) => updateSetting('headerPadding', v)} min={4} max={24} step={2} />
                    </div>
                  </div>
                )}
              </div>

              {/* Media */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Zone média</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Ratio d'aspect</Label>
                    <Select value={settings.mediaAspectRatio} onValueChange={(v) => updateSetting('mediaAspectRatio', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Slider value={[settings.mediaBorderRadius]} onValueChange={([v]) => updateSetting('mediaBorderRadius', v)} min={0} max={24} step={1} />
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

              {/* Title */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Titre</h4>
                  <Switch checked={settings.showTitle} onCheckedChange={(v) => updateSetting('showTitle', v)} />
                </div>
                {settings.showTitle && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Taille police: {settings.titleFontSize}px</Label>
                      <Slider value={[settings.titleFontSize]} onValueChange={([v]) => updateSetting('titleFontSize', v)} min={10} max={24} step={1} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Lignes max: {settings.titleLineClamp}</Label>
                      <Slider value={[settings.titleLineClamp]} onValueChange={([v]) => updateSetting('titleLineClamp', v)} min={1} max={4} step={1} />
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Métadonnées</h4>
                  <Switch checked={settings.showMetadata} onCheckedChange={(v) => updateSetting('showMetadata', v)} />
                </div>
                {settings.showMetadata && (
                  <div className="space-y-2">
                    <Label className="text-xs">Taille police: {settings.metadataFontSize}px</Label>
                    <Slider value={[settings.metadataFontSize]} onValueChange={([v]) => updateSetting('metadataFontSize', v)} min={8} max={16} step={1} />
                  </div>
                )}
              </div>

              {/* Actions */}
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
                        <Slider value={[settings.actionButtonSize]} onValueChange={([v]) => updateSetting('actionButtonSize', v)} min={20} max={48} step={2} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Taille icônes: {settings.actionIconSize}px</Label>
                        <Slider value={[settings.actionIconSize]} onValueChange={([v]) => updateSetting('actionIconSize', v)} min={10} max={24} step={1} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Layout */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Disposition</h4>
                <div className="space-y-2">
                  <Label className="text-xs">Ordre des éléments</Label>
                  <Select value={settings.layoutOrder} onValueChange={(v) => updateSetting('layoutOrder', v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
      </div>
      </div>
    </div>
  );
};

// Hook for consuming settings (used by media cards)
export const useAdvancedCardSettings = (): AdvancedCardSettings => {
  const [settings, setSettings] = useState<AdvancedCardSettings>(() => {
    try {
      const stored = localStorage.getItem('mediavault-advanced-card-settings');
      if (stored) return { ...makeDefaultSettings(), ...JSON.parse(stored) };
    } catch {}
    return makeDefaultSettings();
  });

  useEffect(() => {
    const handleChange = () => {
      try {
        const stored = localStorage.getItem('mediavault-advanced-card-settings');
        if (stored) setSettings({ ...makeDefaultSettings(), ...JSON.parse(stored) });
      } catch {}
    };
    window.addEventListener('mediavault-card-settings-changed', handleChange);
    return () => window.removeEventListener('mediavault-card-settings-changed', handleChange);
  }, []);

  return settings;
};
