import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Popular icons for quick access
const POPULAR_ICONS = [
  'Home', 'Images', 'Video', 'Heart', 'Star', 'Settings', 'User', 'Bell',
  'Search', 'Menu', 'Grid', 'List', 'Folder', 'FolderTree', 'File', 'Image',
  'Music', 'Film', 'Camera', 'Mic', 'Download', 'Upload', 'Share', 'Link',
  'Eye', 'Edit', 'Trash', 'Plus', 'Minus', 'Check', 'X', 'Info', 'AlertCircle',
  'Clock', 'Calendar', 'BarChart3', 'Tv', 'QrCode', 'Columns', 'Filter',
  'RefreshCw', 'Sparkles', 'Palette', 'Terminal', 'Play', 'Tags', 'ListMusic',
  'Wrench', 'Zap', 'Shield', 'Lock', 'Unlock', 'Key', 'Mail', 'Phone',
  'Globe', 'Map', 'MapPin', 'Navigation', 'Compass', 'Sun', 'Moon', 'Cloud',
  'CloudRain', 'Umbrella', 'Wind', 'Flame', 'Droplet', 'Leaf', 'Tree',
  'Mountain', 'Waves', 'Anchor', 'Plane', 'Car', 'Bus', 'Train', 'Bike',
  'Rocket', 'Satellite', 'Radio', 'Wifi', 'Bluetooth', 'Battery', 'Power',
  'Cpu', 'HardDrive', 'Database', 'Server', 'Monitor', 'Laptop', 'Smartphone',
  'Tablet', 'Watch', 'Headphones', 'Speaker', 'Volume', 'VolumeX', 'Mic',
  'MicOff', 'Video', 'VideoOff', 'Cast', 'Airplay', 'Gamepad', 'Puzzle',
];

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
  trigger?: React.ReactNode;
}

export function IconPicker({ selectedIcon, onSelectIcon, trigger }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredIcons = search
    ? POPULAR_ICONS.filter(name => 
        name.toLowerCase().includes(search.toLowerCase())
      )
    : POPULAR_ICONS;

  const SelectedIconComponent = (LucideIcons as any)[selectedIcon] || LucideIcons.HelpCircle;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <SelectedIconComponent className="w-4 h-4" />
            <span className="text-xs">{selectedIcon}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder="Rechercher une icône..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-1 p-2">
            <AnimatePresence mode="popLayout">
              {filteredIcons.map((iconName) => {
                const IconComponent = (LucideIcons as any)[iconName];
                if (!IconComponent) return null;
                
                return (
                  <motion.button
                    key={iconName}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onSelectIcon(iconName);
                      setOpen(false);
                    }}
                    className={`
                      p-2 rounded-lg flex items-center justify-center transition-colors
                      ${selectedIcon === iconName 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                      }
                    `}
                    title={iconName}
                  >
                    <IconComponent className="w-5 h-5" />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
          {filteredIcons.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Aucune icône trouvée
            </p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
