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
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { SettingsModule } from '@/types/settings';
import { useSettingsLayoutContext } from './SettingsLayoutProvider';
import { SettingsCategoryComponent } from './SettingsCategory';
import { SettingsTile } from './SettingsTile';
import { SettingsCustomizer } from './SettingsCustomizer';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pencil, Settings2, X } from 'lucide-react';

interface SettingsGridProps {
  onModuleClick: (module: SettingsModule) => void;
  activeModuleId?: string;
}

export function SettingsGrid({ onModuleClick, activeModuleId }: SettingsGridProps) {
  const { 
    config, 
    getAllCategories, 
    getModulesByCategory,
    moveModule,
    reorderModules,
    reorderCategories,
    toggleEditMode,
  } = useSettingsLayoutContext();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const categories = getAllCategories();
  const allCategoryIds = categories.map(c => `cat-${c.id}`);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // If dragging a module over a category
    if (!activeIdStr.startsWith('cat-') && overIdStr.startsWith('category-')) {
      const targetCategoryId = overIdStr.replace('category-', '');
      const activeModule = config.modules.find(m => m.id === activeIdStr);
      
      if (activeModule && activeModule.category !== targetCategoryId) {
        // Move will be handled in dragEnd
      }
    }
  }, [config.modules]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Category reordering
    if (activeIdStr.startsWith('cat-') && overIdStr.startsWith('cat-')) {
      const oldIndex = allCategoryIds.indexOf(activeIdStr);
      const newIndex = allCategoryIds.indexOf(overIdStr);
      
      if (oldIndex !== newIndex) {
        const newOrder = [...allCategoryIds];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, activeIdStr);
        reorderCategories(newOrder.map(id => id.replace('cat-', '')));
      }
      return;
    }

    // Module reordering within same category
    if (!activeIdStr.startsWith('cat-') && !overIdStr.startsWith('cat-')) {
      const activeModule = config.modules.find(m => m.id === activeIdStr);
      const overModule = config.modules.find(m => m.id === overIdStr);
      
      if (activeModule && overModule && activeModule.category === overModule.category) {
        const categoryModules = getModulesByCategory(activeModule.category);
        const moduleIds = categoryModules.map(m => m.id);
        const oldIndex = moduleIds.indexOf(activeIdStr);
        const newIndex = moduleIds.indexOf(overIdStr);
        
        if (oldIndex !== newIndex) {
          const newOrder = [...moduleIds];
          newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, activeIdStr);
          reorderModules(activeModule.category, newOrder);
        }
      } else if (activeModule && overModule && activeModule.category !== overModule.category) {
        // Move module to different category
        const targetCategoryModules = getModulesByCategory(overModule.category);
        const overIndex = targetCategoryModules.findIndex(m => m.id === overIdStr);
        moveModule(activeIdStr, overModule.category, overIndex);
      }
      return;
    }

    // Module dropped on category drop zone
    if (!activeIdStr.startsWith('cat-') && overIdStr.startsWith('category-')) {
      const targetCategoryId = overIdStr.replace('category-', '');
      const activeModule = config.modules.find(m => m.id === activeIdStr);
      
      if (activeModule && activeModule.category !== targetCategoryId) {
        const targetModules = getModulesByCategory(targetCategoryId);
        moveModule(activeIdStr, targetCategoryId, targetModules.length);
      }
    }
  }, [config.modules, allCategoryIds, getModulesByCategory, reorderCategories, reorderModules, moveModule]);

  // Find the active module for drag overlay
  const activeModule = activeId && !activeId.startsWith('cat-') 
    ? config.modules.find(m => m.id === activeId) 
    : null;

  return (
    <div className="relative h-full flex flex-col min-h-0">
      {/* Header with edit button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Paramètres</h2>
        </div>
        <div className="flex items-center gap-2">
          {config.editMode && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-amber-500 border-amber-500/30 bg-amber-500/5"
              onClick={toggleEditMode}
            >
              <X className="h-4 w-4" />
              Terminer
            </Button>
          )}
          <Button
            variant={config.editMode ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setCustomizerOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Personnaliser
          </Button>
        </div>
      </div>

      {/* Edit mode indicator */}
      {config.editMode && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-600 dark:text-amber-400">
          <strong>Mode édition actif</strong> — Glissez les tuiles pour réorganiser. Cliquez sur 
          <span className="inline-flex items-center mx-1 px-1 py-0.5 bg-amber-500/20 rounded">
            <Pencil className="h-3 w-3 mr-1" />
            Personnaliser
          </span>
          pour changer le style ou créer des groupes.
        </div>
      )}

      {/* Categories Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="flex-1 min-h-0">
          <SortableContext items={allCategoryIds} strategy={verticalListSortingStrategy}>
            <div className={cn(
              'space-y-6 pr-4',
              config.orientation === 'vertical' && 'max-w-md'
            )}>
              {categories.map((category) => (
                <SettingsCategoryComponent
                  key={category.id}
                  category={category}
                  modules={getModulesByCategory(category.id)}
                  onModuleClick={onModuleClick}
                  activeModuleId={activeModuleId}
                  isCustom={category.id.startsWith('custom-')}
                />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>

        {/* Drag overlay */}
        <DragOverlay>
          {activeModule && (
            <div className="opacity-80 rotate-3 scale-105">
              <SettingsTile
                module={activeModule}
                isActive={false}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Customizer Sheet */}
      <SettingsCustomizer 
        isOpen={customizerOpen} 
        onOpenChange={setCustomizerOpen} 
      />
    </div>
  );
}
