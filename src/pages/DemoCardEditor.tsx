import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  GripVertical,
  Image,
  Type,
  User,
  Heart,
  Info,
  Clock,
  Eye,
  Tag,
  X,
  Settings,
  ChevronDown,
  Check,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────
interface CardElement {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const DEFAULT_ELEMENTS: CardElement[] = [
  { id: 'header', label: 'En-tête', icon: <User className="w-4 h-4" />, enabled: true },
  { id: 'media', label: 'Zone média', icon: <Image className="w-4 h-4" />, enabled: true },
  { id: 'title', label: 'Titre', icon: <Type className="w-4 h-4" />, enabled: true },
  { id: 'metadata', label: 'Métadonnées', icon: <Tag className="w-4 h-4" />, enabled: true },
  { id: 'actions', label: 'Actions', icon: <Heart className="w-4 h-4" />, enabled: true },
  { id: 'duration', label: 'Badge durée', icon: <Clock className="w-4 h-4" />, enabled: false },
  { id: 'viewcount', label: 'Compteur vues', icon: <Eye className="w-4 h-4" />, enabled: false },
  { id: 'infobutton', label: 'Bouton Info', icon: <Info className="w-4 h-4" />, enabled: false },
];

// ─── Shared Preview Card ─────────────────────────────────────────────────
const PreviewElement = ({ el }: { el: CardElement }) => {
  switch (el.id) {
    case 'header':
      return (
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs font-medium text-foreground">Utilisateur</div>
            <div className="text-[10px] text-muted-foreground">Il y a 2h</div>
          </div>
        </div>
      );
    case 'media':
      return (
        <div className="w-full aspect-video bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/20 flex items-center justify-center relative overflow-hidden">
          <Image className="w-10 h-10 text-muted-foreground/40" />
          <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Photo de vacances</span>
        </div>
      );
    case 'title':
      return (
        <div className="px-3 py-1.5">
          <div className="text-sm font-semibold text-foreground">Photo de vacances</div>
        </div>
      );
    case 'metadata':
      return (
        <div className="px-3 py-1 flex gap-1 flex-wrap">
          <Badge variant="secondary" className="text-[10px] h-5">Vacances</Badge>
          <Badge variant="secondary" className="text-[10px] h-5">Été</Badge>
          <span className="text-[10px] text-muted-foreground ml-auto">2.4 MB</span>
        </div>
      );
    case 'actions':
      return (
        <div className="px-3 py-2 flex items-center gap-3">
          <Heart className="w-4 h-4 text-muted-foreground hover:text-red-500 cursor-pointer" />
          <Eye className="w-4 h-4 text-muted-foreground" />
          <Info className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
      );
    case 'duration':
      return (
        <div className="px-3 py-1">
          <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />02:34</Badge>
        </div>
      );
    case 'viewcount':
      return (
        <div className="px-3 py-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Eye className="w-3 h-3" /> 1 247 vues
        </div>
      );
    case 'infobutton':
      return (
        <div className="px-3 py-1">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1">
            <Info className="w-3 h-3" /> Détails
          </Button>
        </div>
      );
    default:
      return null;
  }
};

const CardPreview = ({ elements, className = '' }: { elements: CardElement[]; className?: string }) => (
  <Card className={`w-64 overflow-hidden bg-card border border-border shadow-lg ${className}`}>
    {elements.filter(e => e.enabled).map(el => (
      <PreviewElement key={el.id} el={el} />
    ))}
  </Card>
);

// ─── Sortable Item (shared) ──────────────────────────────────────────────
const SortableItem = ({ el, onToggle, onRemove, variant = 'default' }: {
  el: CardElement;
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
  variant?: 'default' | 'compact' | 'stack';
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  if (variant === 'stack') {
    return (
      <div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-2 rounded-lg border bg-card ${el.enabled ? 'border-border' : 'border-dashed border-muted-foreground/30 opacity-50'}`}>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-muted-foreground">{el.icon}</span>
        <span className="text-sm flex-1 text-foreground">{el.label}</span>
        {onToggle && <Switch checked={el.enabled} onCheckedChange={() => onToggle(el.id)} className="scale-75" />}
        {onRemove && el.enabled && (
          <button onClick={() => onRemove(el.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-2 rounded-lg border bg-card border-border ${!el.enabled ? 'opacity-40' : ''}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <span className="text-muted-foreground">{el.icon}</span>
      <span className="text-sm flex-1 text-foreground">{el.label}</span>
      {onToggle && <Switch checked={el.enabled} onCheckedChange={() => onToggle(el.id)} className="scale-75" />}
    </div>
  );
};

// ─── Hook for element management ─────────────────────────────────────────
const useElementManager = () => {
  const [elements, setElements] = useState<CardElement[]>(() => DEFAULT_ELEMENTS.map(e => ({ ...e })));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setElements(prev => {
        const oldIdx = prev.findIndex(e => e.id === active.id);
        const newIdx = prev.findIndex(e => e.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }, []);

  const toggleElement = useCallback((id: string) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e));
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, enabled: false } : e));
  }, []);

  return { elements, setElements, sensors, handleDragEnd, toggleElement, removeElement };
};

// ═══════════════════════════════════════════════════════════════════════════
// CONCEPT 1 — Finder Style
// ═══════════════════════════════════════════════════════════════════════════
const Concept1Finder = () => {
  const { elements, sensors, handleDragEnd, toggleElement } = useElementManager();
  const enabled = elements.filter(e => e.enabled);
  const disabled = elements.filter(e => !e.enabled);

  return (
    <div className="space-y-6">
      {/* Palette */}
      <div className="bg-secondary/50 rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground mb-3 text-center">
          Faites glisser les éléments pour les réordonner. Désactivez-les pour les retirer de la carte.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {elements.map(el => (
                <SortableItem key={el.id} el={el} onToggle={toggleElement} variant="compact" />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {disabled.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-4 mb-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Éléments désactivés</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {disabled.map(el => (
                <Button key={el.id} variant="outline" size="sm" className="text-xs gap-1 opacity-50" onClick={() => toggleElement(el.id)}>
                  {el.icon} {el.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        <CardPreview elements={elements} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONCEPT 2 — Builder Canvas
// ═══════════════════════════════════════════════════════════════════════════
const Concept2Builder = () => {
  const { elements, sensors, handleDragEnd, toggleElement } = useElementManager();

  return (
    <div className="flex gap-6 items-start">
      {/* Preview */}
      <div className="flex-1 flex justify-center">
        <CardPreview elements={elements} className="w-72" />
      </div>

      {/* Catalog */}
      <div className="w-64 space-y-1">
        <p className="text-xs text-muted-foreground mb-3">Catalogue d'éléments</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {elements.map(el => (
              <SortableItem key={el.id} el={el} onToggle={toggleElement} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONCEPT 3 — Stack Constructor
// ═══════════════════════════════════════════════════════════════════════════
const Concept3Stack = () => {
  const { elements, sensors, handleDragEnd, toggleElement, removeElement } = useElementManager();
  const enabled = elements.filter(e => e.enabled);
  const disabled = elements.filter(e => !e.enabled);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <p className="text-xs text-muted-foreground text-center">Empilez vos éléments. Glissez pour réordonner, ✕ pour retirer.</p>

      {/* Stack */}
      <Card className="p-3 space-y-1.5 bg-card">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={enabled.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {enabled.map(el => (
              <SortableItem key={el.id} el={el} onRemove={removeElement} variant="stack" />
            ))}
          </SortableContext>
        </DndContext>
      </Card>

      {/* Dock */}
      {disabled.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center p-3 bg-secondary/30 rounded-xl border border-dashed border-border">
          {disabled.map(el => (
            <Button key={el.id} variant="ghost" size="sm" className="text-xs gap-1 border border-dashed border-muted-foreground/30" onClick={() => toggleElement(el.id)}>
              {el.icon} {el.label}
            </Button>
          ))}
        </div>
      )}

      {/* Preview */}
      <div className="flex justify-center pt-2">
        <CardPreview elements={elements} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONCEPT 4 — Split Panels
// ═══════════════════════════════════════════════════════════════════════════
const Concept4Split = () => {
  const { elements, sensors, handleDragEnd, toggleElement } = useElementManager();
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  const sel = elements.find(e => e.id === selectedEl);

  return (
    <div className="grid grid-cols-[200px_1fr_220px] gap-4 min-h-[400px]">
      {/* Left: Elements list */}
      <div className="border rounded-xl p-3 bg-card space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-2">Éléments</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {elements.map(el => (
              <div key={el.id} onClick={() => setSelectedEl(el.id)} className={`cursor-pointer rounded-lg transition ${selectedEl === el.id ? 'ring-2 ring-primary' : ''}`}>
                <SortableItem el={el} onToggle={toggleElement} variant="compact" />
              </div>
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Center: Preview */}
      <div className="flex items-start justify-center pt-6">
        <CardPreview elements={elements} className="w-72" />
      </div>

      {/* Right: Inspector */}
      <div className="border rounded-xl p-4 bg-card">
        <p className="text-xs font-medium text-muted-foreground mb-3">Inspecteur</p>
        {sel ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{sel.icon}</span>
              <span className="text-sm font-medium text-foreground">{sel.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Visible</span>
              <Switch checked={sel.enabled} onCheckedChange={() => toggleElement(sel.id)} />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Opacité</span>
              <Slider defaultValue={[100]} max={100} step={1} />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Padding</span>
              <Slider defaultValue={[12]} max={32} step={2} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sélectionnez un élément pour voir ses propriétés</p>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONCEPT 5 — Direct Interactive
// ═══════════════════════════════════════════════════════════════════════════
const DirectElement = ({ el, onRemove }: { el: CardElement; onRemove: (id: string) => void }) => {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <PreviewElement el={el} />
      {hovered && (
        <div className="absolute top-0 right-0 flex gap-0.5 p-1 z-10">
          <button {...attributes} {...listeners} className="p-1 bg-card/90 border rounded shadow-sm cursor-grab active:cursor-grabbing hover:bg-secondary">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </button>
          <button className="p-1 bg-card/90 border rounded shadow-sm hover:bg-secondary">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </button>
          <button onClick={() => onRemove(el.id)} className="p-1 bg-card/90 border rounded shadow-sm hover:bg-destructive/10">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
};

const Concept5Direct = () => {
  const { elements, sensors, handleDragEnd, toggleElement, removeElement } = useElementManager();
  const enabled = elements.filter(e => e.enabled);
  const disabled = elements.filter(e => !e.enabled);

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <p className="text-xs text-muted-foreground text-center">Survolez un élément pour le déplacer, configurer ou supprimer.</p>
      <Card className="w-72 mx-auto overflow-hidden border border-border shadow-lg">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={enabled.map(e => e.id)} strategy={verticalListSortingStrategy}>
            {enabled.map(el => (
              <DirectElement key={el.id} el={el} onRemove={removeElement} />
            ))}
          </SortableContext>
        </DndContext>
      </Card>
      {disabled.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {disabled.map(el => (
            <Button key={el.id} variant="outline" size="sm" className="text-xs gap-1" onClick={() => toggleElement(el.id)}>
              {el.icon} {el.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONCEPT 6 — macOS Toolbar + Live
// ═══════════════════════════════════════════════════════════════════════════
const Concept6MacOS = () => {
  const { elements, sensors, handleDragEnd, toggleElement } = useElementManager();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      {/* macOS-style toolbar */}
      <div className="bg-secondary/40 backdrop-blur-sm rounded-2xl p-5 border border-border shadow-inner">
        <p className="text-xs text-muted-foreground mb-4 text-center">
          Glissez les éléments pour personnaliser votre carte. Les modifications sont visibles en temps réel.
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-wrap gap-2 justify-center">
              {elements.map(el => (
                <MacToolbarItem key={el.id} el={el} onToggle={toggleElement} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex items-center justify-center mt-4 gap-2">
          <div className="h-px w-16 bg-border" />
          <span className="text-[10px] text-muted-foreground">jeu par défaut</span>
          <div className="h-px w-16 bg-border" />
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        <CardPreview elements={elements} className="w-72" />
      </div>

      {/* Advanced toggle */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowAdvanced(!showAdvanced)}>
          <Settings className="w-3.5 h-3.5" />
          {showAdvanced ? 'Masquer' : 'Avancé'}
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {showAdvanced && (
        <div className="bg-card border rounded-xl p-4 space-y-3 max-w-sm mx-auto">
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Rayon des coins</span>
            <Slider defaultValue={[12]} max={24} step={1} />
          </div>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Espacement interne</span>
            <Slider defaultValue={[0]} max={16} step={2} />
          </div>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Ratio média</span>
            <div className="flex gap-2">
              {['Auto', '16:9', '4:3', '1:1'].map(r => (
                <Button key={r} variant="outline" size="sm" className="text-xs flex-1">{r}</Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MacToolbarItem = ({ el, onToggle }: { el: CardElement; onToggle: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onToggle(el.id)}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-grab active:cursor-grabbing transition-all min-w-[72px]
        ${el.enabled
          ? 'bg-card border border-border shadow-sm hover:shadow-md'
          : 'bg-transparent border border-dashed border-muted-foreground/30 opacity-50 hover:opacity-70'
        }`}
    >
      <span className={el.enabled ? 'text-primary' : 'text-muted-foreground'}>{el.icon}</span>
      <span className="text-[10px] text-foreground whitespace-nowrap">{el.label}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
const DemoCardEditor = () => {
  const handleChoose = (concept: string) => {
    toast.success(`Concept "${concept}" sélectionné ! Dis-moi le numéro dans le chat.`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="gap-1 mb-4" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Démo — Card Designer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Teste les 6 concepts ci-dessous, puis dis-moi lequel tu préfères.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="1" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary/30 p-1.5 rounded-xl mb-6">
            {[
              { v: '1', l: '1 — Finder' },
              { v: '2', l: '2 — Builder' },
              { v: '3', l: '3 — Stack' },
              { v: '4', l: '4 — Split' },
              { v: '5', l: '5 — Direct' },
              { v: '6', l: '6 — macOS+' },
            ].map(t => (
              <TabsTrigger key={t.v} value={t.v} className="flex-1 min-w-[100px] text-xs sm:text-sm">
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="1" className="space-y-4">
            <Concept1Finder />
            <ChooseButton onClick={() => handleChoose('Finder')} />
          </TabsContent>

          <TabsContent value="2" className="space-y-4">
            <Concept2Builder />
            <ChooseButton onClick={() => handleChoose('Builder')} />
          </TabsContent>

          <TabsContent value="3" className="space-y-4">
            <Concept3Stack />
            <ChooseButton onClick={() => handleChoose('Stack')} />
          </TabsContent>

          <TabsContent value="4" className="space-y-4">
            <Concept4Split />
            <ChooseButton onClick={() => handleChoose('Split')} />
          </TabsContent>

          <TabsContent value="5" className="space-y-4">
            <Concept5Direct />
            <ChooseButton onClick={() => handleChoose('Direct')} />
          </TabsContent>

          <TabsContent value="6" className="space-y-4">
            <Concept6MacOS />
            <ChooseButton onClick={() => handleChoose('macOS+')} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ChooseButton = ({ onClick }: { onClick: () => void }) => (
  <div className="flex justify-center pt-4">
    <Button onClick={onClick} className="gap-2" variant="glow">
      <Check className="w-4 h-4" /> Je choisis celui-ci
    </Button>
  </div>
);

export default DemoCardEditor;
