import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SettingsModule, SettingsLayoutStyle } from '@/types/settings';
import { useSettingsLayoutContext } from './SettingsLayoutProvider';
import { cn } from '@/lib/utils';
import { GripVertical, Eye, EyeOff, Maximize2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettingsTileProps {
  module: SettingsModule;
  onClick?: () => void;
  isActive?: boolean;
}

// Get icon component from string name
function getIcon(iconName: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[iconName];
  return IconComponent || Icons.Settings;
}

// Style variants for different layout styles
const tileStyles: Record<SettingsLayoutStyle, string> = {
  windows11: 'bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:bg-accent/50 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl',
  material: 'bg-card shadow-md hover:shadow-lg border-0 transition-shadow duration-300 rounded-lg',
  minimal: 'bg-transparent hover:bg-muted/30 border-0 transition-colors duration-150 rounded-md',
  dashboard: 'bg-gradient-to-br from-card to-muted/50 border border-border/30 shadow-sm rounded-lg',
  mosaic: 'bg-card border border-border/40 hover:border-primary/50 rounded-md shadow-sm',
  list: 'bg-card/50 hover:bg-muted/50 border-b border-border/30 rounded-none',
  glass: 'bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-lg rounded-2xl',
  neon: 'bg-black/80 border border-primary/50 hover:border-primary hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] rounded-lg transition-all duration-300',
  retro: 'bg-card border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--border))] transition-all duration-150 rounded-none',
  mono: 'bg-transparent hover:bg-muted/20 border-0 rounded-md',
};

const iconContainerStyles: Record<SettingsLayoutStyle, string> = {
  windows11: 'p-3 rounded-xl',
  material: 'p-3 rounded-full',
  minimal: 'p-2 rounded-md',
  dashboard: 'p-3 rounded-lg',
  mosaic: 'p-2 rounded-md',
  list: 'p-2 rounded-md',
  glass: 'p-3 rounded-xl bg-white/10',
  neon: 'p-3 rounded-lg',
  retro: 'p-2 rounded-none border-2 border-current',
  mono: 'p-2',
};

export const SettingsTile = forwardRef<HTMLDivElement, SettingsTileProps>(
  function SettingsTile({ module, onClick, isActive }, ref) {
    const { config } = useSettingsLayoutContext();
    const { style, editMode } = config;
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ 
      id: module.id,
      disabled: !editMode,
    });

    const Icon = getIcon(module.icon);
    const tileStyle = tileStyles[style];
    const iconStyle = iconContainerStyles[style];

    const combinedTransform = CSS.Transform.toString(transform);
    const combinedStyle = {
      transform: combinedTransform,
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 50 : 'auto',
    };

    const sizeClasses = {
      small: 'col-span-1',
      medium: 'col-span-1 md:col-span-1',
      large: 'col-span-1 md:col-span-2',
    };

    return (
      <div
        ref={setNodeRef}
        style={combinedStyle}
        className={cn(
          'group relative cursor-pointer',
          sizeClasses[module.size || 'medium'],
          tileStyle,
          isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
          isDragging && 'cursor-grabbing',
          !module.visible && 'opacity-40'
        )}
        onClick={onClick}
        {...attributes}
      >
        {/* Edit mode controls */}
        {editMode && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                // Toggle visibility - handled by parent
              }}
            >
              {module.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}

        <div className={cn(
          'flex items-center gap-4 p-4',
          style === 'list' && 'py-3',
          style === 'mosaic' && 'p-3',
          style === 'mono' && 'py-2'
        )}>
          {/* Icon */}
          <div 
            className={cn(iconStyle)}
            style={{ 
              backgroundColor: module.iconColor ? `${module.iconColor.replace(')', ', 0.15)')}` : 'hsl(var(--muted))',
            }}
          >
            <Icon 
              className={cn(
                'h-5 w-5',
                style === 'mosaic' && 'h-4 w-4',
                style === 'neon' && 'drop-shadow-[0_0_8px_currentColor]'
              )} 
              style={{ color: module.iconColor || 'hsl(var(--primary))' }}
            />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-medium text-sm truncate',
              style === 'mono' && 'font-mono',
              style === 'neon' && 'text-primary'
            )}>
              {module.name}
            </h3>
            {style !== 'mosaic' && style !== 'mono' && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {module.description}
              </p>
            )}
          </div>

          {/* Chevron/indicator */}
          {style !== 'mono' && (
            <Icons.ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Size indicator in edit mode */}
        {editMode && module.size === 'large' && (
          <div className="absolute bottom-2 left-2">
            <Maximize2 className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }
);
