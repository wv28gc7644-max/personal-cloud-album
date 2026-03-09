import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOS } from '@/hooks/useOS';
import { defaultWallpapers } from '@/data/osApps';
import { MacOSIcon } from './MacOSIcon';
import { 
  Monitor, Palette, Image, User, Lock, Bell, 
  Accessibility, Keyboard, Mouse, Volume2, 
  Wifi, Bluetooth, Shield, HardDrive, Clock,
  Languages, Share2, Download, Package, Server,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

import wallpaperOcean from '@/assets/wallpapers/default-ocean.jpg';
import wallpaperSunset from '@/assets/wallpapers/sunset-silk.jpg';
import wallpaperAurora from '@/assets/wallpapers/aurora-dark.jpg';

// Settings icons with macOS-style colored backgrounds
import settingsIcon from '@/assets/icons/settings.png';

const wallpaperMap: Record<string, string> = {
  ocean: wallpaperOcean,
  sunset: wallpaperSunset,
  aurora: wallpaperAurora,
};

type PrefSection = 'general' | 'wallpaper' | 'dock' | 'account' | 'security' | 'notifications' | 'display' | 'install';

// macOS-style settings categories with colored icons
const prefCategories: {
  id: PrefSection;
  name: string;
  icon: any;
  iconBg: string;
  iconColor: string;
}[] = [
  { id: 'general', name: 'Général', icon: Monitor, iconBg: 'bg-[#8E8E93]', iconColor: 'text-white' },
  { id: 'wallpaper', name: 'Fond d\'écran', icon: Image, iconBg: 'bg-[#30B0C7]', iconColor: 'text-white' },
  { id: 'dock', name: 'Bureau et Dock', icon: HardDrive, iconBg: 'bg-[#1C1C1E]', iconColor: 'text-white' },
  { id: 'display', name: 'Apparence', icon: Palette, iconBg: 'bg-[#BF5AF2]', iconColor: 'text-white' },
  { id: 'account', name: 'Utilisateurs', icon: User, iconBg: 'bg-[#007AFF]', iconColor: 'text-white' },
  { id: 'security', name: 'Confidentialité et sécurité', icon: Shield, iconBg: 'bg-[#007AFF]', iconColor: 'text-white' },
  { id: 'notifications', name: 'Notifications', icon: Bell, iconBg: 'bg-[#FF3B30]', iconColor: 'text-white' },
  { id: 'install', name: 'Installation locale', icon: Package, iconBg: 'bg-[#34C759]', iconColor: 'text-white' },
];

const SettingsRow = memo(({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) => (
  <div className="flex items-center justify-between py-2 min-h-[36px]">
    <div className="flex-1">
      <span className="text-[13px]">{label}</span>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
    </div>
    {children}
  </div>
));
SettingsRow.displayName = 'SettingsRow';

const SettingsGroup = memo(({ children, title }: { children: React.ReactNode; title?: string }) => (
  <div className="mb-4">
    {title && <h3 className="text-[11px] uppercase text-muted-foreground font-medium mb-1.5 px-3">{title}</h3>}
    <div className="rounded-[10px] bg-card/60 border border-border/40 divide-y divide-border/40 px-3">
      {children}
    </div>
  </div>
));
SettingsGroup.displayName = 'SettingsGroup';

const WallpaperSection = memo(() => {
  const { settings, updateSettings } = useOS();

  return (
    <div className="space-y-4">
      <h2 className="text-[22px] font-semibold px-1">Fond d'écran</h2>
      <div className="grid grid-cols-3 gap-3">
        {defaultWallpapers.map(wp => {
          const src = wallpaperMap[wp.id] || wp.src;
          return (
            <button
              key={wp.id}
              className={cn(
                'relative rounded-xl overflow-hidden aspect-video border-2 transition-all',
                settings.wallpaper === src
                  ? 'border-primary ring-2 ring-primary/30 scale-[1.02]'
                  : 'border-transparent hover:border-white/20'
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
    <div className="space-y-4">
      <h2 className="text-[22px] font-semibold px-1">Bureau et Dock</h2>
      
      <SettingsGroup>
        <SettingsRow label="Taille du Dock">
          <select
            className="bg-muted/50 rounded-md px-2 py-1 text-[13px] border border-border/50"
            value={settings.dockSize}
            onChange={(e) => updateSettings({ dockSize: e.target.value as any })}
          >
            <option value="small">Petit</option>
            <option value="medium">Moyen</option>
            <option value="large">Grand</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Grossissement">
          <Switch
            checked={settings.dockMagnification}
            onCheckedChange={(v) => updateSettings({ dockMagnification: v })}
          />
        </SettingsRow>
        <SettingsRow label="Position sur l'écran">
          <select
            className="bg-muted/50 rounded-md px-2 py-1 text-[13px] border border-border/50"
            value={settings.dockPosition}
            onChange={(e) => updateSettings({ dockPosition: e.target.value as any })}
          >
            <option value="bottom">En bas</option>
            <option value="left">À gauche</option>
            <option value="right">À droite</option>
          </select>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow label="Masquer/afficher automatiquement le Dock">
          <Switch
            checked={settings.autoHideDock}
            onCheckedChange={(v) => updateSettings({ autoHideDock: v })}
          />
        </SettingsRow>
        <SettingsRow label="Afficher les icônes sur le Bureau">
          <Switch
            checked={settings.showDesktopIcons}
            onCheckedChange={(v) => updateSettings({ showDesktopIcons: v })}
          />
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
});
DockSection.displayName = 'DockSection';

const DisplaySection = memo(() => {
  const { settings, updateSettings } = useOS();

  const accentColors = [
    { id: 'blue', color: '#007AFF' },
    { id: 'purple', color: '#BF5AF2' },
    { id: 'pink', color: '#FF2D55' },
    { id: 'red', color: '#FF3B30' },
    { id: 'orange', color: '#FF9500' },
    { id: 'yellow', color: '#FFCC00' },
    { id: 'green', color: '#34C759' },
    { id: 'graphite', color: '#8E8E93' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-[22px] font-semibold px-1">Apparence</h2>
      
      <SettingsGroup>
        <div className="py-3">
          <span className="text-[13px] font-medium">Apparence</span>
          <div className="flex gap-3 mt-3">
            {(['light', 'dark', 'auto'] as const).map(mode => (
              <button
                key={mode}
                className={cn(
                  'flex flex-col items-center gap-2 p-2 rounded-xl transition-all w-24',
                  settings.appearance === mode
                    ? 'ring-2 ring-primary'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => updateSettings({ appearance: mode })}
              >
                <div className={cn(
                  'w-16 h-10 rounded-md border border-border/50',
                  mode === 'light' ? 'bg-white' : mode === 'dark' ? 'bg-[#1C1C1E]' : 'bg-gradient-to-r from-white to-[#1C1C1E]'
                )} />
                <span className="text-[12px]">
                  {mode === 'light' ? 'Clair' : mode === 'dark' ? 'Sombre' : 'Auto'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Couleur d'accentuation">
        <div className="py-3">
          <div className="flex gap-[10px]">
            {accentColors.map(ac => (
              <button
                key={ac.id}
                className={cn(
                  'w-[22px] h-[22px] rounded-full transition-transform',
                  settings.accentColor === ac.id && 'ring-[2px] ring-white ring-offset-2 ring-offset-background scale-110'
                )}
                style={{ backgroundColor: ac.color }}
                onClick={() => updateSettings({ accentColor: ac.id })}
              />
            ))}
          </div>
        </div>
      </SettingsGroup>
    </div>
  );
});
DisplaySection.displayName = 'DisplaySection';

const AccountSection = memo(() => {
  const { settings, updateSettings } = useOS();

  return (
    <div className="space-y-4">
      <h2 className="text-[22px] font-semibold px-1">Utilisateurs et groupes</h2>
      
      {/* User card */}
      <SettingsGroup>
        <div className="py-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-semibold">
            {(settings.userName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <Input
              className="text-[15px] bg-transparent border-none p-0 h-auto font-medium"
              value={settings.userName || ''}
              onChange={(e) => updateSettings({ userName: e.target.value })}
              placeholder="Utilisateur"
            />
            <p className="text-[11px] text-muted-foreground">Administrateur</p>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Sécurité">
        <SettingsRow label="Exiger un mot de passe" description="Au réveil ou à l'écran de verrouillage">
          <Switch
            checked={settings.requirePassword || false}
            onCheckedChange={(v) => updateSettings({ requirePassword: v })}
          />
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
});
AccountSection.displayName = 'AccountSection';

const GeneralSection = memo(() => {
  return (
    <div className="space-y-4">
      <h2 className="text-[22px] font-semibold px-1">Général</h2>
      
      <SettingsGroup>
        <div className="py-3 flex items-center gap-3">
          <img src={settingsIcon} alt="CloudOS" className="w-16 h-16" />
          <div>
            <h3 className="font-semibold text-[15px]">CloudOS</h3>
            <p className="text-[13px] text-muted-foreground">Version 2.0.0</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Système d'exploitation web personnel</p>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="À propos">
        <SettingsRow label="Processeur">
          <span className="text-[13px] text-muted-foreground">Web Runtime</span>
        </SettingsRow>
        <SettingsRow label="Mémoire">
          <span className="text-[13px] text-muted-foreground">{navigator.hardwareConcurrency || 4} cœurs</span>
        </SettingsRow>
        <SettingsRow label="Navigateur">
          <span className="text-[13px] text-muted-foreground">{navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Safari'}</span>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
});
GeneralSection.displayName = 'GeneralSection';

const InstallSection = memo(() => {
  const handleDownloadInstaller = () => {
    const installerContent = `@echo off
title CloudOS - Installation locale
echo ==========================================
echo   CloudOS - Installation locale
echo ==========================================
echo.
if not exist "%USERPROFILE%\\CloudOS" mkdir "%USERPROFILE%\\CloudOS"
if not exist "%USERPROFILE%\\CloudOS\\data" mkdir "%USERPROFILE%\\CloudOS\\data"
if not exist "%USERPROFILE%\\CloudOS\\media" mkdir "%USERPROFILE%\\CloudOS\\media"
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [!] Node.js non detecte. Installation...
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
)
cd /d "%USERPROFILE%\\CloudOS"
echo {"name":"cloudos-server","version":"1.0.0","private":true,"scripts":{"start":"node server.cjs"}} > package.json
call npm install express cors sharp
echo @echo off > "Lancer CloudOS.bat"
echo cd /d "%USERPROFILE%\\CloudOS" >> "Lancer CloudOS.bat"
echo node server.cjs >> "Lancer CloudOS.bat"
echo Installation terminee !
pause
`;
    const blob = new Blob([installerContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'installer-cloudos.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-[22px] font-semibold px-1">Installation locale</h2>
      
      <SettingsGroup>
        <div className="py-3">
          <p className="text-[13px] text-muted-foreground mb-3">
            Déployez CloudOS sur votre machine locale.
          </p>
          <div className="space-y-2">
            <button
              onClick={handleDownloadInstaller}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[13px] font-medium"
            >
              <Download className="w-4 h-4" />
              Télécharger l'installateur
            </button>
            <button
              onClick={() => { const a = document.createElement('a'); a.href = '/server.cjs'; a.download = 'server.cjs'; a.click(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-[13px] font-medium"
            >
              <Server className="w-4 h-4" />
              Télécharger server.cjs
            </button>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Instructions">
        <div className="py-3">
          <ol className="text-[13px] text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Téléchargez les fichiers ci-dessus</li>
            <li>Exécutez le script d'installation</li>
            <li>Placez <code className="px-1 py-0.5 rounded bg-muted text-foreground text-[11px]">server.cjs</code> dans le dossier CloudOS</li>
            <li>Lancez avec <code className="px-1 py-0.5 rounded bg-muted text-foreground text-[11px]">Lancer CloudOS.bat</code></li>
          </ol>
        </div>
      </SettingsGroup>
    </div>
  );
});
InstallSection.displayName = 'InstallSection';

export const SystemPreferences = memo(() => {
  const [activeSection, setActiveSection] = useState<PrefSection>('general');

  const renderSection = () => {
    switch (activeSection) {
      case 'general': return <GeneralSection />;
      case 'wallpaper': return <WallpaperSection />;
      case 'dock': return <DockSection />;
      case 'display': return <DisplaySection />;
      case 'account': return <AccountSection />;
      case 'install': return <InstallSection />;
      default: return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
          Section en cours de développement
        </div>
      );
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* macOS-style sidebar */}
      <div 
        className="w-[220px] shrink-0 overflow-y-auto py-2 px-2"
        style={{
          background: 'rgba(30,30,35,0.15)',
          borderRight: '0.5px solid rgba(128,128,128,0.2)',
        }}
      >
        {/* Search (placeholder) */}
        <div className="mb-2 px-1">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 text-muted-foreground text-[12px]">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="2"/>
              <path d="m21 21-4.3-4.3" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Rechercher
          </div>
        </div>

        <div className="space-y-[1px]">
          {prefCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                className={cn(
                  'w-full flex items-center gap-[8px] px-2 py-[6px] rounded-[6px] text-[13px] transition-colors',
                  activeSection === cat.id
                    ? 'bg-primary/15 text-foreground'
                    : 'hover:bg-muted/50 text-foreground/80'
                )}
                onClick={() => setActiveSection(cat.id)}
              >
                <div className={cn(
                  'w-[22px] h-[22px] rounded-[5px] flex items-center justify-center shrink-0',
                  cat.iconBg
                )}>
                  <Icon className={cn('w-[13px] h-[13px]', cat.iconColor)} />
                </div>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        {renderSection()}
      </div>
    </div>
  );
});
SystemPreferences.displayName = 'SystemPreferences';
