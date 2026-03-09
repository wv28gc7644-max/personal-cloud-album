import { memo } from 'react';
import { cn } from '@/lib/utils';

// Import all macOS-style icon images
import finderIcon from '@/assets/icons/finder.png';
import settingsIcon from '@/assets/icons/settings.png';
import appstoreIcon from '@/assets/icons/appstore.png';
import terminalIcon from '@/assets/icons/terminal.png';
import calculatorIcon from '@/assets/icons/calculator.png';
import mediavaultIcon from '@/assets/icons/mediavault.png';
import mediaViewerIcon from '@/assets/icons/media-viewer.png';
import launchpadIcon from '@/assets/icons/launchpad.png';
import trashEmptyIcon from '@/assets/icons/trash-empty.png';
import trashFullIcon from '@/assets/icons/trash-full.png';
import notesIcon from '@/assets/icons/notes.png';
import musicIcon from '@/assets/icons/music.png';
import weatherIcon from '@/assets/icons/weather.png';
import calendarIcon from '@/assets/icons/calendar.png';
import ollamaIcon from '@/assets/icons/ollama.png';
import comfyuiIcon from '@/assets/icons/comfyui.png';
import whisperIcon from '@/assets/icons/whisper.png';
import stableDiffusionIcon from '@/assets/icons/stable-diffusion.png';

// Map app IDs to their icon images
export const appIconMap: Record<string, string> = {
  finder: finderIcon,
  settings: settingsIcon,
  appstore: appstoreIcon,
  terminal: terminalIcon,
  calculator: calculatorIcon,
  mediavault: mediavaultIcon,
  'media-viewer': mediaViewerIcon,
  launchpad: launchpadIcon,
  trash: trashEmptyIcon,
  notes: notesIcon,
  music: musicIcon,
  weather: weatherIcon,
  'calendar-app': calendarIcon,
  ollama: ollamaIcon,
  comfyui: comfyuiIcon,
  whisper: whisperIcon,
  'stable-diffusion': stableDiffusionIcon,
};

interface MacOSIconProps {
  appId: string;
  iconName?: string;
  size?: number;
  className?: string;
}

export const MacOSIcon = memo(({ 
  appId, 
  size = 50, 
  className,
}: MacOSIconProps) => {
  const iconSrc = appIconMap[appId];

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={appId}
        className={cn('object-contain pointer-events-none', className)}
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }

  // Fallback: gradient square with first letter
  return (
    <div
      className={cn(
        'rounded-[22%] flex items-center justify-center',
        'bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8]',
        className
      )}
      style={{ 
        width: size, 
        height: size,
        boxShadow: '0 4px 12px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
        {appId.charAt(0).toUpperCase()}
      </span>
    </div>
  );
});
MacOSIcon.displayName = 'MacOSIcon';

// Special Trash icon that shows full/empty state
export const TrashIcon = memo(({ 
  isEmpty = true, 
  size = 50,
  className,
}: { 
  isEmpty?: boolean; 
  size?: number;
  className?: string;
}) => {
  return (
    <img
      src={isEmpty ? trashEmptyIcon : trashFullIcon}
      alt="Corbeille"
      className={cn('object-contain pointer-events-none', className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
});
TrashIcon.displayName = 'TrashIcon';

// Re-export specific icons for direct use
export const FinderIcon = memo(({ size = 50 }: { size?: number }) => (
  <MacOSIcon appId="finder" size={size} />
));
FinderIcon.displayName = 'FinderIcon';

export const LaunchpadIcon = memo(({ size = 50 }: { size?: number }) => (
  <MacOSIcon appId="launchpad" size={size} />
));
LaunchpadIcon.displayName = 'LaunchpadIcon';
