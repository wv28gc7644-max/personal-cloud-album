import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  horizontalListSortingStrategy 
} from '@dnd-kit/sortable';
import { SettingsCategory as SettingsCategoryType, SettingsModule, SettingsLayoutStyle } from '@/types/settings';
import { useSettingsLayoutContext } from './SettingsLayoutProvider';
import { SettingsTile } from './SettingsTile';
import { cn } from '@/lib/utils';
import { GripVertical, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SettingsCategoryProps {
  category: SettingsCategoryType;
  modules: SettingsModule[];
  onModuleClick: (module: SettingsModule) => void;
  activeModuleId?: string;
  isCustom?: boolean;
}

function getIcon(iconName: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[iconName];
  return IconComponent || Icons.Folder;
}

const categoryStyles: Record<SettingsLayoutStyle, string> = {
  windows11: 'bg-muted/30 border border-border/30 rounded-2xl',
  material: 'bg-card shadow-sm rounded-xl',
  minimal: 'border-l-2 border-muted pl-4',
  dashboard: 'bg-gradient-to-r from-muted/20 to-transparent rounded-xl border border-border/20',
  mosaic: 'bg-muted/20 rounded-lg',
  list: 'border-b border-border/30 pb-4',
  glass: 'bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl',
  neon: 'border border-primary/30 rounded-xl bg-black/50',
  retro: 'border-2 border-border bg-card shadow-[3px_3px_0_0_hsl(var(--border))]',
  mono: '',
};

const headerStyles: Record<SettingsLayoutStyle, string> = {
  windows11: 'text-foreground/80',
  material: 'text-foreground',
  minimal: 'text-muted-foreground uppercase text-xs tracking-wide',
  dashboard: 'text-foreground',
  mosaic: 'text-sm',
  list: 'text-foreground/80',
  glass: 'text-white/90',
  neon: 'text-primary',
  retro: 'font-mono',
  mono: 'font-mono text-xs uppercase tracking-widest text-muted-foreground',
};

export function SettingsCategoryComponent({ 
  category, 
  modules, 
  onModuleClick, 
  activeModuleId,
  isCustom = false 
}: SettingsCategoryProps) {
  const { config, deleteCustomGroup } = useSettingsLayoutContext();
  const { style, orientation, editMode } = config;
  const [isOpen, setIsOpen] = useState(true);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `category-${category.id}`,
    data: { type: 'category', categoryId: category.id },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `cat-${category.id}`,
    disabled: !editMode,
  });

  const Icon = getIcon(category.icon);
  const categoryStyle = categoryStyles[style];
  const headerStyle = headerStyles[style];

  const gridClasses = orientation === 'horizontal' 
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
    : 'flex flex-col gap-2';

  const sortingStrategy = orientation === 'horizontal' 
    ? horizontalListSortingStrategy 
    : verticalListSortingStrategy;

  const combinedTransform = CSS.Transform.toString(transform);
  const combinedStyle = {
    transform: combinedTransform,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      style={combinedStyle}
      className={cn(
        'relative',
        categoryStyle,
        isOver && 'ring-2 ring-primary ring-dashed',
        isDragging && 'z-50'
      )}
      {...attributes}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn(
          'flex items-center gap-3 p-4',
          style === 'minimal' && 'px-0 pt-0',
          style === 'mono' && 'px-0'
        )}>
          {/* Drag handle in edit mode */}
          {editMode && (
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* Category icon */}
          {style !== 'mono' && style !== 'minimal' && (
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: category.iconColor 
                  ? `${category.iconColor.replace(')', ', 0.15)')}`
                  : 'hsl(var(--muted))',
              }}
            >
              <Icon 
                className="h-4 w-4" 
                style={{ color: category.iconColor || 'hsl(var(--muted-foreground))' }}
              />
            </div>
          )}

          {/* Category name */}
          <CollapsibleTrigger asChild>
            <button className={cn(
              'flex items-center gap-2 flex-1 text-left font-medium',
              headerStyle
            )}>
              <span>{category.name}</span>
              <span className="text-xs text-muted-foreground">
                ({modules.filter(m => m.visible).length})
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              )}
            </button>
          </CollapsibleTrigger>

          {/* Delete custom group button */}
          {isCustom && editMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => deleteCustomGroup(category.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <CollapsibleContent>
          <div className={cn(
            'px-4 pb-4',
            style === 'minimal' && 'px-0',
            style === 'mono' && 'px-0'
          )}>
            <SortableContext items={modules.map(m => m.id)} strategy={sortingStrategy}>
              <div className={gridClasses}>
                {modules
                  .filter(m => editMode || m.visible)
                  .map((module) => (
                    <SettingsTile
                      key={module.id}
                      module={module}
                      onClick={() => onModuleClick(module)}
                      isActive={activeModuleId === module.id}
                    />
                  ))}
              </div>
            </SortableContext>

            {modules.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg">
                {editMode ? 'Glissez des modules ici' : 'Aucun module'}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
