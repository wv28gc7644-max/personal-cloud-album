import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useContextMenuConfig, ContextMenuItem } from '@/hooks/useContextMenuConfig';
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Minus, RotateCcw, MousePointerClick, Eye, Info, Download, Save, Heart, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  ContextMenu, ContextMenuContent, ContextMenuItem as CtxMenuItem, ContextMenuSeparator, ContextMenuTrigger 
} from '@/components/ui/context-menu';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye, Info, Download, Save, Heart, Copy, Trash2,
};

function SortableItem({ item, onToggle, onRemoveSeparator }: { 
  item: ContextMenuItem; 
  onToggle: (id: string) => void;
  onRemoveSeparator: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  if (item.type === 'separator') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-1 group">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] text-muted-foreground uppercase">Séparateur</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onRemoveSeparator(item.id)}>
          <Minus className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  const IconComp = ICON_MAP[item.icon];

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-3 p-2 rounded-lg border bg-card", !item.enabled && "opacity-50")}>
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="w-4 h-4" />
      </button>
      {IconComp && <IconComp className="w-4 h-4 text-muted-foreground" />}
      <span className="flex-1 text-sm">{item.label}</span>
      <Switch checked={item.enabled} onCheckedChange={() => onToggle(item.id)} />
    </div>
  );
}

export function ContextMenuSettings() {
  const { items, reorder, toggleAction, addSeparator, removeSeparator, reset } = useContextMenuConfig();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    reorder(arrayMove(items, oldIndex, newIndex));
  };

  const lastActionId = [...items].reverse().find(i => i.type === 'action')?.id;

  // Build preview items
  const enabledItems = items.filter(i => i.type === 'separator' || (i.type === 'action' && i.enabled));

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        {/* Left: drag-and-drop list */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Actions du menu</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => lastActionId && addSeparator(lastActionId)}>
                <Plus className="w-3 h-3 mr-1" />
                Séparateur
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Réinitialiser
              </Button>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {items.map(item => (
                  <SortableItem key={item.id} item={item} onToggle={toggleAction} onRemoveSeparator={removeSeparator} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: preview */}
        <div className="w-64 shrink-0">
          <h3 className="font-medium mb-4">Aperçu</h3>
          <div className="border rounded-lg bg-popover p-1 shadow-md">
            {enabledItems.map((item, idx) => {
              if (item.type === 'separator') {
                return <div key={item.id} className="my-1 border-t border-border" />;
              }
              const IconComp = ICON_MAP[item.icon];
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-sm text-popover-foreground hover:bg-accent cursor-default",
                    item.id === 'delete' && "text-destructive"
                  )}
                >
                  {IconComp && <IconComp className="w-4 h-4" />}
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
