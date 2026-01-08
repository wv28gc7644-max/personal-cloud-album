import { useState, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lightbulb, 
  Thermometer, 
  Droplets, 
  Wind, 
  Power, 
  Lock, 
  Camera, 
  Speaker,
  Sun,
  Moon,
  Zap,
  Gauge,
  Home,
  Plus,
  GripVertical,
  X,
  Settings2,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface HomeWidget {
  id: string;
  type: WidgetType;
  name: string;
  entityId?: string;
  size: 'small' | 'medium' | 'large';
  state?: any;
  visible: boolean;
  order: number;
  room?: string;
  customColor?: string;
}

export type WidgetType = 
  | 'light' 
  | 'switch' 
  | 'temperature' 
  | 'humidity' 
  | 'climate' 
  | 'lock' 
  | 'camera' 
  | 'speaker' 
  | 'energy' 
  | 'scene'
  | 'weather'
  | 'presence';

interface WidgetConfig {
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  hasSlider?: boolean;
  hasToggle?: boolean;
}

const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  light: { 
    icon: Lightbulb, 
    color: 'text-amber-400', 
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    hasSlider: true,
    hasToggle: true
  },
  switch: { 
    icon: Power, 
    color: 'text-blue-400', 
    bgGradient: 'from-blue-500/20 to-cyan-500/10',
    hasToggle: true
  },
  temperature: { 
    icon: Thermometer, 
    color: 'text-red-400', 
    bgGradient: 'from-red-500/20 to-orange-500/10'
  },
  humidity: { 
    icon: Droplets, 
    color: 'text-cyan-400', 
    bgGradient: 'from-cyan-500/20 to-blue-500/10'
  },
  climate: { 
    icon: Wind, 
    color: 'text-teal-400', 
    bgGradient: 'from-teal-500/20 to-green-500/10',
    hasSlider: true,
    hasToggle: true
  },
  lock: { 
    icon: Lock, 
    color: 'text-red-400', 
    bgGradient: 'from-red-500/20 to-pink-500/10',
    hasToggle: true
  },
  camera: { 
    icon: Camera, 
    color: 'text-purple-400', 
    bgGradient: 'from-purple-500/20 to-pink-500/10'
  },
  speaker: { 
    icon: Speaker, 
    color: 'text-green-400', 
    bgGradient: 'from-green-500/20 to-emerald-500/10',
    hasSlider: true,
    hasToggle: true
  },
  energy: { 
    icon: Zap, 
    color: 'text-yellow-400', 
    bgGradient: 'from-yellow-500/20 to-amber-500/10'
  },
  scene: { 
    icon: Sun, 
    color: 'text-orange-400', 
    bgGradient: 'from-orange-500/20 to-red-500/10',
    hasToggle: true
  },
  weather: { 
    icon: Sun, 
    color: 'text-sky-400', 
    bgGradient: 'from-sky-500/20 to-blue-500/10'
  },
  presence: { 
    icon: Home, 
    color: 'text-indigo-400', 
    bgGradient: 'from-indigo-500/20 to-purple-500/10'
  },
};

const STORAGE_KEY = 'mediavault-home-widgets';

export function useHomeWidgets() {
  const [widgets, setWidgets] = useState<HomeWidget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getDefaultWidgets();
  });

  const [editMode, setEditMode] = useState(false);

  const saveWidgets = useCallback((newWidgets: HomeWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
  }, []);

  const addWidget = useCallback((type: WidgetType, name: string, entityId?: string) => {
    const newWidget: HomeWidget = {
      id: `widget-${Date.now()}`,
      type,
      name,
      entityId,
      size: 'medium',
      visible: true,
      order: widgets.length,
    };
    saveWidgets([...widgets, newWidget]);
    toast.success(`Widget "${name}" ajouté`);
  }, [widgets, saveWidgets]);

  const removeWidget = useCallback((id: string) => {
    saveWidgets(widgets.filter(w => w.id !== id));
    toast.success('Widget supprimé');
  }, [widgets, saveWidgets]);

  const updateWidget = useCallback((id: string, updates: Partial<HomeWidget>) => {
    saveWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  }, [widgets, saveWidgets]);

  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    const oldIndex = widgets.findIndex(w => w.id === activeId);
    const newIndex = widgets.findIndex(w => w.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newWidgets = arrayMove(widgets, oldIndex, newIndex).map((w, i) => ({ ...w, order: i }));
      saveWidgets(newWidgets);
    }
  }, [widgets, saveWidgets]);

  const toggleVisibility = useCallback((id: string) => {
    saveWidgets(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  }, [widgets, saveWidgets]);

  return {
    widgets: widgets.filter(w => editMode || w.visible).sort((a, b) => a.order - b.order),
    allWidgets: widgets,
    editMode,
    setEditMode,
    addWidget,
    removeWidget,
    updateWidget,
    reorderWidgets,
    toggleVisibility,
  };
}

function getDefaultWidgets(): HomeWidget[] {
  return [
    { id: 'widget-1', type: 'light', name: 'Salon', size: 'medium', visible: true, order: 0, state: { on: true, brightness: 80 } },
    { id: 'widget-2', type: 'temperature', name: 'Température', size: 'small', visible: true, order: 1, state: { value: 21.5 } },
    { id: 'widget-3', type: 'humidity', name: 'Humidité', size: 'small', visible: true, order: 2, state: { value: 45 } },
    { id: 'widget-4', type: 'energy', name: 'Consommation', size: 'medium', visible: true, order: 3, state: { current: 1250, daily: 12.5 } },
    { id: 'widget-5', type: 'scene', name: 'Mode Nuit', size: 'small', visible: true, order: 4, state: { active: false } },
    { id: 'widget-6', type: 'lock', name: 'Porte entrée', size: 'small', visible: true, order: 5, state: { locked: true } },
  ];
}

// Sortable Widget Component
function SortableWidget({ 
  widget, 
  editMode, 
  onRemove, 
  onToggle, 
  onBrightness,
  onToggleVisibility 
}: { 
  widget: HomeWidget;
  editMode: boolean;
  onRemove: () => void;
  onToggle: () => void;
  onBrightness: (value: number) => void;
  onToggleVisibility: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = WIDGET_CONFIGS[widget.type];
  const Icon = config.icon;
  const isOn = widget.state?.on ?? widget.state?.active ?? widget.state?.locked;

  const sizeClasses = {
    small: 'col-span-1 row-span-1',
    medium: 'col-span-1 row-span-1 sm:col-span-2',
    large: 'col-span-2 row-span-2',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[widget.size],
        isDragging && 'z-50 opacity-80',
        !widget.visible && 'opacity-50'
      )}
    >
      <div
        className={cn(
          "relative h-full min-h-[120px] rounded-2xl border p-4 transition-all",
          "bg-gradient-to-br",
          config.bgGradient,
          isOn ? "border-primary/30 shadow-lg shadow-primary/10" : "border-border",
          editMode && "ring-2 ring-dashed ring-primary/30"
        )}
      >
        {/* Edit Mode Controls */}
        {editMode && (
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <button
              onClick={onToggleVisibility}
              className="p-1 rounded-full bg-background/80 hover:bg-background"
            >
              {widget.visible ? 
                <Eye className="w-3.5 h-3.5" /> : 
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </button>
            <button
              onClick={onRemove}
              className="p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Drag Handle */}
        {editMode && (
          <div 
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 p-1 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {/* Widget Content */}
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-start justify-between">
            <div className={cn(
              "p-2 rounded-xl",
              isOn ? "bg-primary/20" : "bg-muted"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                isOn ? config.color : "text-muted-foreground"
              )} />
            </div>
            
            {config.hasToggle && !editMode && (
              <Switch
                checked={isOn}
                onCheckedChange={onToggle}
                className="scale-90"
              />
            )}
          </div>

          <div className="mt-auto">
            <p className="text-sm font-medium truncate">{widget.name}</p>
            
            {/* State Display */}
            {widget.type === 'temperature' && (
              <p className="text-2xl font-bold">{widget.state?.value}°C</p>
            )}
            {widget.type === 'humidity' && (
              <p className="text-2xl font-bold">{widget.state?.value}%</p>
            )}
            {widget.type === 'energy' && (
              <p className="text-xl font-bold">{widget.state?.current}W</p>
            )}
            {widget.type === 'light' && isOn && (
              <p className="text-xs text-muted-foreground">{widget.state?.brightness}%</p>
            )}
            {widget.type === 'lock' && (
              <p className="text-xs text-muted-foreground">
                {widget.state?.locked ? 'Verrouillé' : 'Déverrouillé'}
              </p>
            )}
          </div>

          {/* Brightness Slider */}
          {config.hasSlider && isOn && !editMode && (
            <div className="mt-2">
              <Slider
                value={[widget.state?.brightness || 50]}
                onValueChange={([v]) => onBrightness(v)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Widget Grid Component
export function HomeWidgetGrid() {
  const {
    widgets,
    editMode,
    setEditMode,
    addWidget,
    removeWidget,
    updateWidget,
    reorderWidgets,
    toggleVisibility,
  } = useHomeWidgets();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderWidgets(active.id as string, over.id as string);
    }
  };

  const handleToggle = (widget: HomeWidget) => {
    const stateKey = widget.type === 'lock' ? 'locked' : 
                     widget.type === 'scene' ? 'active' : 'on';
    updateWidget(widget.id, { 
      state: { ...widget.state, [stateKey]: !widget.state?.[stateKey] } 
    });
  };

  const handleBrightness = (widget: HomeWidget, value: number) => {
    updateWidget(widget.id, { 
      state: { ...widget.state, brightness: value } 
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Ma Maison
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode(!editMode)}
          >
            <Settings2 className="w-4 h-4 mr-1" />
            {editMode ? 'Terminé' : 'Éditer'}
          </Button>
          {editMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addWidget('light', 'Nouvelle lampe')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Widget
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {widgets.map(widget => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  editMode={editMode}
                  onRemove={() => removeWidget(widget.id)}
                  onToggle={() => handleToggle(widget)}
                  onBrightness={(v) => handleBrightness(widget, v)}
                  onToggleVisibility={() => toggleVisibility(widget.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Home className="w-12 h-12 mb-4 opacity-20" />
            <p>Aucun widget configuré</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setEditMode(true);
                addWidget('light', 'Ma première lampe');
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter un widget
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
