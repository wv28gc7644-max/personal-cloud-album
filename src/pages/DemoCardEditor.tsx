import React, { useState, useCallback, useMemo, useId } from 'react';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  rectIntersection,
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
  CollisionDetection,
  UniqueIdentifier,
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Download,
  Share2,
  ArrowLeft,
  Layers,
  Check,
  Rows3,
  Columns3,
  Space,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────
interface GranularElement {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: 'element' | 'layout';
}

// All 15 granular elements + 3 layout tools
const ALL_ELEMENTS: GranularElement[] = [
  { id: 'avatar', label: 'Avatar', icon: <User className="w-4 h-4" />, type: 'element' },
  { id: 'username', label: 'Nom utilisateur', icon: <Type className="w-4 h-4" />, type: 'element' },
  { id: 'date', label: 'Date', icon: <Clock className="w-4 h-4" />, type: 'element' },
  { id: 'media', label: 'Zone média', icon: <Image className="w-4 h-4" />, type: 'element' },
  { id: 'title', label: 'Titre', icon: <Type className="w-4 h-4" />, type: 'element' },
  { id: 'tag-1', label: 'Tag Vacances', icon: <Tag className="w-4 h-4" />, type: 'element' },
  { id: 'tag-2', label: 'Tag Été', icon: <Tag className="w-4 h-4" />, type: 'element' },
  { id: 'filesize', label: 'Taille fichier', icon: <Info className="w-4 h-4" />, type: 'element' },
  { id: 'btn-view', label: 'Voir', icon: <Eye className="w-4 h-4" />, type: 'element' },
  { id: 'btn-like', label: "J'aime", icon: <Heart className="w-4 h-4" />, type: 'element' },
  { id: 'btn-download', label: 'Télécharger', icon: <Download className="w-4 h-4" />, type: 'element' },
  { id: 'btn-share', label: 'Partager', icon: <Share2 className="w-4 h-4" />, type: 'element' },
  { id: 'btn-info', label: 'Info', icon: <Info className="w-4 h-4" />, type: 'element' },
  { id: 'duration', label: 'Badge durée', icon: <Clock className="w-4 h-4" />, type: 'element' },
  { id: 'viewcount', label: 'Compteur vues', icon: <Eye className="w-4 h-4" />, type: 'element' },
];

const LAYOUT_TOOLS: GranularElement[] = [
  { id: 'layout-row', label: 'Ligne', icon: <Rows3 className="w-4 h-4" />, type: 'layout' },
  { id: 'layout-col', label: 'Colonne', icon: <Columns3 className="w-4 h-4" />, type: 'layout' },
  { id: 'layout-spacer', label: 'Espace', icon: <Space className="w-4 h-4" />, type: 'layout' },
];

// Items in the card preview (can be elements or layout containers)
interface PreviewItem {
  id: string; // unique instance id
  elementId: string; // references ALL_ELEMENTS or layout type
  type: 'element' | 'row' | 'column' | 'spacer';
  children?: PreviewItem[]; // for row/column containers
}

const DEFAULT_PREVIEW: PreviewItem[] = [
  { id: 'p-avatar', elementId: 'avatar', type: 'element' },
  { id: 'p-username', elementId: 'username', type: 'element' },
  { id: 'p-date', elementId: 'date', type: 'element' },
  { id: 'p-media', elementId: 'media', type: 'element' },
  { id: 'p-title', elementId: 'title', type: 'element' },
  { id: 'p-tag-1', elementId: 'tag-1', type: 'element' },
  { id: 'p-tag-2', elementId: 'tag-2', type: 'element' },
  { id: 'p-btn-view', elementId: 'btn-view', type: 'element' },
  { id: 'p-btn-like', elementId: 'btn-like', type: 'element' },
  { id: 'p-btn-download', elementId: 'btn-download', type: 'element' },
];

// ─── Render each granular element ────────────────────────────────────────
const RenderElement = ({ elementId }: { elementId: string }) => {
  switch (elementId) {
    case 'avatar':
      return (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
      );
    case 'username':
      return <span className="text-xs font-medium text-foreground">Utilisateur</span>;
    case 'date':
      return <span className="text-[10px] text-muted-foreground">Il y a 2h</span>;
    case 'media':
      return (
        <div className="w-full aspect-video bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/20 flex items-center justify-center">
          <Image className="w-10 h-10 text-muted-foreground/40" />
        </div>
      );
    case 'title':
      return <div className="text-sm font-semibold text-foreground">Photo de vacances</div>;
    case 'tag-1':
      return <Badge variant="secondary" className="text-[10px] h-5">Vacances</Badge>;
    case 'tag-2':
      return <Badge variant="secondary" className="text-[10px] h-5">Été</Badge>;
    case 'filesize':
      return <span className="text-[10px] text-muted-foreground">2.4 MB</span>;
    case 'btn-view':
      return <Eye className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />;
    case 'btn-like':
      return <Heart className="w-4 h-4 text-muted-foreground hover:text-red-500 cursor-pointer" />;
    case 'btn-download':
      return <Download className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />;
    case 'btn-share':
      return <Share2 className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />;
    case 'btn-info':
      return <Info className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />;
    case 'duration':
      return <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />02:34</Badge>;
    case 'viewcount':
      return (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Eye className="w-3 h-3" /> 1 247 vues
        </span>
      );
    default:
      return null;
  }
};

// ─── Draggable drawer item ───────────────────────────────────────────────
const DrawerItem = ({ element, isUsed }: { element: GranularElement; isUsed: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drawer-${element.id}`,
    data: { source: 'drawer', elementId: element.id, elementType: element.type },
    disabled: isUsed,
  });
  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.3 : isUsed ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all
        ${isUsed
          ? 'border-dashed border-muted-foreground/30 bg-muted/30 cursor-not-allowed line-through'
          : 'border-border bg-card hover:bg-secondary/50 cursor-grab active:cursor-grabbing shadow-sm hover:shadow'
        }`}
    >
      <span className={isUsed ? 'text-muted-foreground/40' : 'text-primary'}>{element.icon}</span>
      <span className={isUsed ? 'text-muted-foreground/40' : 'text-foreground'}>{element.label}</span>
    </div>
  );
};

// ─── Sortable preview item ───────────────────────────────────────────────
const SortablePreviewItem = ({ item, onRemoveFromPreview }: { item: PreviewItem; onRemoveFromPreview: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, over } = useSortable({
    id: item.id,
    data: { source: 'preview', item },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (item.type === 'spacer') {
    return (
      <div ref={setNodeRef} style={style} className="group relative">
        <div
          {...attributes}
          {...listeners}
          className="h-4 bg-muted/40 border border-dashed border-muted-foreground/20 rounded flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted/60"
        >
          <span className="text-[9px] text-muted-foreground/50 hidden group-hover:block">espace</span>
        </div>
      </div>
    );
  }

  if (item.type === 'row' || item.type === 'column') {
    return (
      <div ref={setNodeRef} style={style} className="group relative">
        <div
          className={`border border-dashed border-primary/30 rounded-lg p-1.5 min-h-[32px] ${
            item.type === 'row' ? 'flex flex-wrap gap-1.5 items-center' : 'flex flex-col gap-1.5'
          }`}
        >
          <div
            {...attributes}
            {...listeners}
            className="absolute -top-2 -left-2 w-5 h-5 bg-primary/10 border border-primary/30 rounded flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
          >
            {item.type === 'row' ? <Rows3 className="w-3 h-3 text-primary" /> : <Columns3 className="w-3 h-3 text-primary" />}
          </div>
          {item.children && item.children.length > 0 ? (
            item.children.map(child => (
              <div key={child.id} className="px-1.5 py-1">
                <RenderElement elementId={child.elementId} />
              </div>
            ))
          ) : (
            <span className="text-[9px] text-muted-foreground/50 px-2">
              {item.type === 'row' ? 'Ligne vide' : 'Colonne vide'}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        {...attributes}
        {...listeners}
        className="px-2.5 py-1.5 rounded-md hover:bg-secondary/40 cursor-grab active:cursor-grabbing transition-colors flex items-center gap-1.5"
      >
        <RenderElement elementId={item.elementId} />
        <GripVertical className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
      </div>
    </div>
  );
};

// ─── Drop indicator ──────────────────────────────────────────────────────
const DropIndicator = () => (
  <div className="h-0.5 bg-primary rounded-full mx-2 animate-pulse" />
);

// ─── Preview zone (droppable) ────────────────────────────────────────────
const PreviewZone = ({ items, overIndex, onRemoveFromPreview }: {
  items: PreviewItem[];
  overIndex: number | null;
  onRemoveFromPreview: (id: string) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'preview-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-2xl border-2 transition-all duration-200 ${
        isOver ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10' : 'border-transparent'
      }`}
    >
      <Card className="w-72 overflow-hidden bg-card border border-border shadow-xl">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground/50 text-xs">
              Glissez des éléments ici
            </div>
          ) : (
            items.map((item, idx) => (
              <React.Fragment key={item.id}>
                {overIndex === idx && <DropIndicator />}
                <SortablePreviewItem item={item} onRemoveFromPreview={onRemoveFromPreview} />
              </React.Fragment>
            ))
          )}
          {overIndex !== null && overIndex >= items.length && <DropIndicator />}
        </SortableContext>
      </Card>
    </div>
  );
};

// ─── Drawer zone (droppable, catches items dragged out of preview) ──────
const DrawerZone = ({ children }: { children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'drawer-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 transition-all duration-200 p-4 ${
        isOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-card/50'
      }`}
    >
      {children}
    </div>
  );
};

// ─── Drag overlay ────────────────────────────────────────────────────────
const DragOverlayContent = ({ elementId }: { elementId: string | null }) => {
  if (!elementId) return null;
  const el = ALL_ELEMENTS.find(e => e.id === elementId);
  if (!el) {
    // Layout tool
    const tool = LAYOUT_TOOLS.find(t => t.id === elementId);
    if (!tool) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary bg-card shadow-xl text-sm">
        <span className="text-primary">{tool.icon}</span>
        <span className="text-foreground">{tool.label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary bg-card shadow-xl text-sm">
      <span className="text-primary">{el.icon}</span>
      <span className="text-foreground">{el.label}</span>
    </div>
  );
};

// ─── Layout tool draggable ───────────────────────────────────────────────
const LayoutToolItem = ({ tool }: { tool: GranularElement }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drawer-${tool.id}`,
    data: { source: 'drawer', elementId: tool.id, elementType: 'layout' },
  });
  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-sm cursor-grab active:cursor-grabbing hover:bg-primary/10 transition-colors"
    >
      <span className="text-primary">{tool.icon}</span>
      <span className="text-foreground">{tool.label}</span>
    </div>
  );
};

// ─── Main bidirectional engine ───────────────────────────────────────────
let instanceCounter = 0;
const genId = () => `pi-${++instanceCounter}-${Date.now()}`;

const useBidirectionalEngine = () => {
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>(() => DEFAULT_PREVIEW.map(p => ({ ...p })));
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Which element IDs are already in the preview
  const usedElementIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (items: PreviewItem[]) => {
      for (const item of items) {
        if (item.type === 'element') ids.add(item.elementId);
        if (item.children) collect(item.children);
      }
    };
    collect(previewItems);
    return ids;
  }, [previewItems]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.elementId) {
      setActiveElementId(data.elementId);
    } else if (data?.item) {
      setActiveElementId(data.item.elementId);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverIndex(null);
      return;
    }
    // Find index in preview
    const idx = previewItems.findIndex(i => i.id === over.id);
    setOverIndex(idx >= 0 ? idx : (over.id === 'preview-zone' ? previewItems.length : null));
  }, [previewItems]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveElementId(null);
    setOverIndex(null);

    const activeData = active.data.current;

    // Case 1: Dragging from drawer to preview
    if (activeData?.source === 'drawer') {
      const elementId = activeData.elementId as string;
      const isLayout = activeData.elementType === 'layout';

      // Only add if dropped on preview-zone or on an item inside preview
      if (!over) return;
      const droppedOnPreview = over.id === 'preview-zone' || previewItems.some(i => i.id === over.id);
      if (!droppedOnPreview) return;

      // For elements, check if already used
      if (!isLayout && usedElementIds.has(elementId)) return;

      const newItem: PreviewItem = isLayout
        ? {
            id: genId(),
            elementId,
            type: elementId === 'layout-row' ? 'row' : elementId === 'layout-col' ? 'column' : 'spacer',
            children: [],
          }
        : { id: genId(), elementId, type: 'element' };

      setPreviewItems(prev => {
        const targetIdx = prev.findIndex(i => i.id === over.id);
        if (targetIdx >= 0) {
          const copy = [...prev];
          copy.splice(targetIdx, 0, newItem);
          return copy;
        }
        return [...prev, newItem];
      });
      return;
    }

    // Case 2: Dragging within preview (reorder) or out of preview (remove)
    if (activeData?.source === 'preview') {
      const activeItem = activeData.item as PreviewItem;

      // Dropped on drawer or outside -> remove from preview
      if (!over || over.id === 'drawer-zone') {
        setPreviewItems(prev => prev.filter(i => i.id !== activeItem.id));
        return;
      }

      // Reorder within preview
      if (over.id !== active.id) {
        setPreviewItems(prev => {
          const oldIdx = prev.findIndex(i => i.id === active.id);
          const newIdx = prev.findIndex(i => i.id === over.id);
          if (oldIdx >= 0 && newIdx >= 0) {
            return arrayMove(prev, oldIdx, newIdx);
          }
          return prev;
        });
      }
    }
  }, [previewItems, usedElementIds]);

  const removeFromPreview = useCallback((itemId: string) => {
    setPreviewItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  return {
    previewItems,
    activeElementId,
    overIndex,
    usedElementIds,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    removeFromPreview,
  };
};

// ─── Concept layouts ─────────────────────────────────────────────────────
// Each concept wraps the same engine with different visual arrangement

const ConceptFinder = () => {
  const engine = useBidirectionalEngine();

  return (
    <DndContext
      sensors={engine.sensors}
      collisionDetection={pointerWithin}
      onDragStart={engine.handleDragStart}
      onDragOver={engine.handleDragOver}
      onDragEnd={engine.handleDragEnd}
    >
      <div className="space-y-6">
        {/* Drawer as toolbar on top */}
        <DrawerZone>
          <p className="text-xs text-muted-foreground mb-3 text-center">
            Glissez un élément vers la carte pour l'ajouter. Glissez-le hors de la carte pour le retirer.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {ALL_ELEMENTS.map(el => (
              <DrawerItem key={el.id} element={el} isUsed={engine.usedElementIds.has(el.id)} />
            ))}
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider self-center mr-2">Outils</span>
            {LAYOUT_TOOLS.map(tool => (
              <LayoutToolItem key={tool.id} tool={tool} />
            ))}
          </div>
        </DrawerZone>

        {/* Preview */}
        <div className="flex justify-center">
          <PreviewZone
            items={engine.previewItems}
            overIndex={engine.overIndex}
            onRemoveFromPreview={engine.removeFromPreview}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent elementId={engine.activeElementId} />
      </DragOverlay>
    </DndContext>
  );
};

const ConceptBuilder = () => {
  const engine = useBidirectionalEngine();

  return (
    <DndContext
      sensors={engine.sensors}
      collisionDetection={pointerWithin}
      onDragStart={engine.handleDragStart}
      onDragOver={engine.handleDragOver}
      onDragEnd={engine.handleDragEnd}
    >
      <div className="flex gap-6 items-start">
        {/* Preview on left */}
        <div className="flex-1 flex justify-center">
          <PreviewZone
            items={engine.previewItems}
            overIndex={engine.overIndex}
            onRemoveFromPreview={engine.removeFromPreview}
          />
        </div>

        {/* Drawer on right */}
        <div className="w-56 shrink-0">
          <DrawerZone>
            <p className="text-xs text-muted-foreground mb-3">Tiroir d'éléments</p>
            <div className="space-y-1.5">
              {ALL_ELEMENTS.map(el => (
                <DrawerItem key={el.id} element={el} isUsed={engine.usedElementIds.has(el.id)} />
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Outils</span>
              {LAYOUT_TOOLS.map(tool => (
                <LayoutToolItem key={tool.id} tool={tool} />
              ))}
            </div>
          </DrawerZone>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent elementId={engine.activeElementId} />
      </DragOverlay>
    </DndContext>
  );
};

const ConceptStack = () => {
  const engine = useBidirectionalEngine();

  return (
    <DndContext
      sensors={engine.sensors}
      collisionDetection={pointerWithin}
      onDragStart={engine.handleDragStart}
      onDragOver={engine.handleDragOver}
      onDragEnd={engine.handleDragEnd}
    >
      <div className="max-w-lg mx-auto space-y-6">
        {/* Preview centered */}
        <div className="flex justify-center">
          <PreviewZone
            items={engine.previewItems}
            overIndex={engine.overIndex}
            onRemoveFromPreview={engine.removeFromPreview}
          />
        </div>

        {/* Drawer as floating dock at bottom */}
        <DrawerZone>
          <div className="flex flex-wrap gap-2 justify-center">
            {ALL_ELEMENTS.map(el => (
              <DrawerItem key={el.id} element={el} isUsed={engine.usedElementIds.has(el.id)} />
            ))}
            <div className="w-full h-px bg-border my-1" />
            {LAYOUT_TOOLS.map(tool => (
              <LayoutToolItem key={tool.id} tool={tool} />
            ))}
          </div>
        </DrawerZone>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent elementId={engine.activeElementId} />
      </DragOverlay>
    </DndContext>
  );
};

const ConceptSplit = () => {
  const engine = useBidirectionalEngine();

  return (
    <DndContext
      sensors={engine.sensors}
      collisionDetection={pointerWithin}
      onDragStart={engine.handleDragStart}
      onDragOver={engine.handleDragOver}
      onDragEnd={engine.handleDragEnd}
    >
      <div className="grid grid-cols-[220px_1fr_220px] gap-4 min-h-[500px]">
        {/* Left drawer */}
        <DrawerZone>
          <p className="text-xs font-medium text-muted-foreground mb-3">Éléments</p>
          <ScrollArea className="h-[460px]">
            <div className="space-y-1.5 pr-2">
              {ALL_ELEMENTS.map(el => (
                <DrawerItem key={el.id} element={el} isUsed={engine.usedElementIds.has(el.id)} />
              ))}
            </div>
          </ScrollArea>
        </DrawerZone>

        {/* Center preview */}
        <div className="flex items-start justify-center pt-6">
          <PreviewZone
            items={engine.previewItems}
            overIndex={engine.overIndex}
            onRemoveFromPreview={engine.removeFromPreview}
          />
        </div>

        {/* Right tools */}
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Outils de layout</p>
          <div className="space-y-1.5">
            {LAYOUT_TOOLS.map(tool => (
              <LayoutToolItem key={tool.id} tool={tool} />
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              Glissez un élément hors de la carte pour le retirer. Réordonnez en glissant dans la carte.
            </p>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent elementId={engine.activeElementId} />
      </DragOverlay>
    </DndContext>
  );
};

const ConceptDirect = () => {
  const engine = useBidirectionalEngine();

  return (
    <DndContext
      sensors={engine.sensors}
      collisionDetection={pointerWithin}
      onDragStart={engine.handleDragStart}
      onDragOver={engine.handleDragOver}
      onDragEnd={engine.handleDragEnd}
    >
      <div className="max-w-md mx-auto space-y-4">
        <p className="text-xs text-muted-foreground text-center">
          Survolez la carte pour réordonner. Glissez hors de la carte pour retirer. Ajoutez depuis le tiroir ci-dessous.
        </p>

        {/* Preview */}
        <div className="flex justify-center">
          <PreviewZone
            items={engine.previewItems}
            overIndex={engine.overIndex}
            onRemoveFromPreview={engine.removeFromPreview}
          />
        </div>

        {/* Minimalist drawer */}
        <DrawerZone>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {ALL_ELEMENTS.filter(el => !engine.usedElementIds.has(el.id)).map(el => (
              <DrawerItem key={el.id} element={el} isUsed={false} />
            ))}
            {ALL_ELEMENTS.every(el => engine.usedElementIds.has(el.id)) && (
              <span className="text-xs text-muted-foreground italic">Tous les éléments sont dans la carte</span>
            )}
          </div>
          <div className="flex gap-2 mt-2 pt-2 border-t border-border justify-center">
            {LAYOUT_TOOLS.map(tool => (
              <LayoutToolItem key={tool.id} tool={tool} />
            ))}
          </div>
        </DrawerZone>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent elementId={engine.activeElementId} />
      </DragOverlay>
    </DndContext>
  );
};

const ConceptMacOS = () => {
  const engine = useBidirectionalEngine();

  return (
    <DndContext
      sensors={engine.sensors}
      collisionDetection={pointerWithin}
      onDragStart={engine.handleDragStart}
      onDragOver={engine.handleDragOver}
      onDragEnd={engine.handleDragEnd}
    >
      <div className="space-y-6">
        {/* macOS-style toolbar */}
        <DrawerZone>
          <div className="bg-secondary/30 backdrop-blur-sm rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Glissez les éléments vers la carte. Retirez-les en les faisant glisser ici.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {ALL_ELEMENTS.map(el => {
                const isUsed = engine.usedElementIds.has(el.id);
                return (
                  <DrawerItem key={el.id} element={el} isUsed={isUsed} />
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Mise en page</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="flex gap-2 justify-center mt-2">
              {LAYOUT_TOOLS.map(tool => (
                <LayoutToolItem key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </DrawerZone>

        {/* Preview */}
        <div className="flex justify-center">
          <PreviewZone
            items={engine.previewItems}
            overIndex={engine.overIndex}
            onRemoveFromPreview={engine.removeFromPreview}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent elementId={engine.activeElementId} />
      </DragOverlay>
    </DndContext>
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
            Card Designer — Drag & Drop bidirectionnel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Glissez les éléments du tiroir vers la carte, et hors de la carte pour les retirer. Chaque élément est indépendant.
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
            <ConceptFinder />
            <ChooseButton onClick={() => handleChoose('Finder')} />
          </TabsContent>

          <TabsContent value="2" className="space-y-4">
            <ConceptBuilder />
            <ChooseButton onClick={() => handleChoose('Builder')} />
          </TabsContent>

          <TabsContent value="3" className="space-y-4">
            <ConceptStack />
            <ChooseButton onClick={() => handleChoose('Stack')} />
          </TabsContent>

          <TabsContent value="4" className="space-y-4">
            <ConceptSplit />
            <ChooseButton onClick={() => handleChoose('Split')} />
          </TabsContent>

          <TabsContent value="5" className="space-y-4">
            <ConceptDirect />
            <ChooseButton onClick={() => handleChoose('Direct')} />
          </TabsContent>

          <TabsContent value="6" className="space-y-4">
            <ConceptMacOS />
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
