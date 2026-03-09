import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { defaultWallpapers } from '@/data/osApps';
import { 
  Monitor, Palette, Image, User, Lock, Bell, 
  Accessibility, Keyboard, Mouse, Volume2, 
  Wifi, Bluetooth, Shield, HardDrive, Clock,
  Languages, Share2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

import wallpaperOcean from '@/assets/wallpapers/default-ocean.jpg';
import wallpaperSunset from '@/assets/wallpapers/sunset-silk.jpg';
import wallpaperAurora from '@/assets/wallpapers/aurora-dark.jpg';

const wallpaperMap: Record<string, string> = {
  ocean: wallpaperOcean,
  sunset: wallpaperSunset,
  aurora: wallpaperAurora,
};

type PrefSection = 'general' | 'wallpaper' | 'dock' | 'account' | 'security' | 'notifications' | 'display';

const prefCategories = [
  { id: 'general' as PrefSection, name: 'Général', icon: Monitor },
  { id: 'wallpaper' as PrefSection, name: 'Fond d\'écran', icon: Image },
  { id: 'dock' as PrefSection, name: 'Dock', icon: HardDrive },
  { id: 'display' as PrefSection, name: 'Apparence', icon: Palette },
  { id: 'account' as PrefSection, name: 'Comptes', icon: User },
  { id: 'security' as PrefSection, name: 'Sécurité', icon: Shield },
  { id: 'notifications' as PrefSection, name: 'Notifications', icon: Bell },
];

const WallpaperSection = memo(() => {
  const { settings, updateSettings } = useOS();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Fond d'écran</h2>
      <div className="grid grid-cols-3 gap-4">
        {defaultWallpapers.map(wp => {
          const src = wallpaperMap[wp.id] || wp.src;
          return (
            <button
              key={wp.id}
              className={cn(
                'relative rounded-xl overflow-hidden aspect-video border-2 transition-all',
                settings.wallpaper === src
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent hover:border-white/30'
              )}
              onClick={() => updateSettings({ wallpaper: src, wallpaperName: wp.name })}
            >
              <img src={src} alt={wp.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                <span className="text-white text-xs font-medium">{wp.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
WallpaperSection.displayName = 'WallpaperSection';

const DockSection = memo(() => {
  const { settings, updateSettings } = useOS();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dock</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Taille</span>
          <select
            className="bg-muted rounded-lg px-3 py-1.5 text-sm"
            value={settings.dockSize}
            onChange={(e) => updateSettings({ dockSize: e.target.value as any })}
          >
            <option value="small">Petit</option>
            <option value="medium">Moyen</option>
            <option value="large">Grand</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Grossissement</span>
          <Switch
            checked={settings.dockMagnification}
            onCheckedChange={(v) => updateSettings({ dockMagnification: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Masquer automatiquement</span>
          <Switch
            checked={settings.autoHideDock}
            onCheckedChange={(v) => updateSettings({ autoHideDock: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Position</span>
          <select
            className="bg-muted rounded-lg px-3 py-1.5 text-sm"
            value={settings.dockPosition}
            onChange={(e) => updateSettings({ dockPosition: e.target.value as any })}
          >
            <option value="bottom">En bas</option>
            <option value="left">À gauche</option>
            <option value="right">À droite</option>
          </select>
        </div>
      </div>
    </div>
  );
});
DockSection.displayName = 'DockSection';

const DisplaySection = memo(() => {
  const { settings, updateSettings } = useOS();

  const accentColors = [
    { id: 'blue', color: 'bg-blue-500' },
    { id: 'purple', color: 'bg-purple-500' },
    { id: 'pink', color: 'bg-pink-500' },
    { id: 'red', color: 'bg-red-500' },
    { id: 'orange', color: 'bg-orange-500' },
    { id: 'yellow', color: 'bg-yellow-500' },
    { id: 'green', color: 'bg-green-500' },
    { id: 'gray', color: 'bg-gray-500' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Apparence</h2>
      
      <div className="space-y-4">
        <div>
          <span className="text-sm font-medium">Apparence</span>
          <div className="flex gap-3 mt-2">
            {(['light', 'dark', 'auto'] as const).map(mode => (
              <button
                key={mode}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm transition-all',
                  settings.appearance === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
                onClick={() => updateSettings({ appearance: mode })}
              >
                {mode === 'light' ? 'Clair' : mode === 'dark' ? 'Sombre' : 'Automatique'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium">Couleur d'accent</span>
          <div className="flex gap-2 mt-2">
            {accentColors.map(ac => (
              <button
                key={ac.id}
                className={cn(
                  'w-8 h-8 rounded-full transition-transform',
                  ac.color,
                  settings.accentColor === ac.id && 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110'
                )}
                onClick={() => updateSettings({ accentColor: ac.id })}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Afficher les icônes du bureau</span>
          <Switch
            checked={settings.showDesktopIcons}
            onCheckedChange={(v) => updateSettings({ showDesktopIcons: v })}
          />
        </div>
      </div>
    </div>
  );
});
DisplaySection.displayName = 'DisplaySection';

const AccountSection = memo(() => {
  const { settings, updateSettings } = useOS();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Comptes</h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Nom d'utilisateur</label>
          <Input
            className="mt-1"
            value={settings.userName || ''}
            onChange={(e) => updateSettings({ userName: e.target.value })}
            placeholder="Utilisateur"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Exiger un mot de passe</span>
            <p className="text-xs text-muted-foreground">Au réveil ou à l'écran de verrouillage</p>
          </div>
          <Switch
            checked={settings.requirePassword || false}
            onCheckedChange={(v) => updateSettings({ requirePassword: v })}
          />
        </div>
      </div>
    </div>
  );
});
AccountSection.displayName = 'AccountSection';

const GeneralSection = memo(() => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Général</h2>
      <div className="space-y-4">
        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-3">
            <Monitor className="w-10 h-10 text-primary" />
            <div>
              <h3 className="font-medium">CloudOS</h3>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Système d'exploitation web personnel. Gérez vos applications, fichiers et préférences depuis une interface unifiée.
        </p>
      </div>
    </div>
  );
});
GeneralSection.displayName = 'GeneralSection';

export const SystemPreferences = memo(() => {
  const [activeSection, setActiveSection] = useState<PrefSection>('general');

  const renderSection = () => {
    switch (activeSection) {
      case 'general': return <GeneralSection />;
      case 'wallpaper': return <WallpaperSection />;
      case 'dock': return <DockSection />;
      case 'display': return <DisplaySection />;
      case 'account': return <AccountSection />;
      default: return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Section en cours de développement
        </div>
      );
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-56 bg-muted/50 border-r border-border p-2 space-y-0.5 overflow-y-auto">
        {prefCategories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                activeSection === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              )}
              onClick={() => setActiveSection(cat.id)}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {renderSection()}
      </div>
    </div>
  );
});
SystemPreferences.displayName = 'SystemPreferences';
