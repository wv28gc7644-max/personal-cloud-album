import { memo } from 'react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

// macOS-style icon gradients and colors
export const iconStyles: Record<string, {
  gradient: string;
  iconColor: string;
  shadowColor: string;
}> = {
  // System apps
  finder: {
    gradient: 'from-[#1E90FF] via-[#00BFFF] to-[#87CEEB]',
    iconColor: 'text-white',
    shadowColor: 'rgba(30,144,255,0.4)',
  },
  mediavault: {
    gradient: 'from-[#FF6B9D] via-[#C44569] to-[#FF8E72]',
    iconColor: 'text-white',
    shadowColor: 'rgba(196,69,105,0.4)',
  },
  'media-viewer': {
    gradient: 'from-[#667eea] via-[#764ba2] to-[#f953c6]',
    iconColor: 'text-white',
    shadowColor: 'rgba(102,126,234,0.4)',
  },
  settings: {
    gradient: 'from-[#6B7280] via-[#4B5563] to-[#374151]',
    iconColor: 'text-white',
    shadowColor: 'rgba(75,85,99,0.4)',
  },
  appstore: {
    gradient: 'from-[#0EA5E9] via-[#2563EB] to-[#7C3AED]',
    iconColor: 'text-white',
    shadowColor: 'rgba(37,99,235,0.4)',
  },
  launchpad: {
    gradient: 'from-[#374151] via-[#1F2937] to-[#111827]',
    iconColor: 'text-white',
    shadowColor: 'rgba(31,41,55,0.4)',
  },
  terminal: {
    gradient: 'from-[#1a1a1a] via-[#2d2d2d] to-[#404040]',
    iconColor: 'text-[#00FF00]',
    shadowColor: 'rgba(0,0,0,0.5)',
  },
  calculator: {
    gradient: 'from-[#FF9500] via-[#FF7D00] to-[#FF5F00]',
    iconColor: 'text-white',
    shadowColor: 'rgba(255,149,0,0.4)',
  },
  trash: {
    gradient: 'from-[#6B7280] via-[#4B5563] to-[#374151]',
    iconColor: 'text-white',
    shadowColor: 'rgba(75,85,99,0.4)',
  },
  // Web apps
  notes: {
    gradient: 'from-[#FBBF24] via-[#F59E0B] to-[#D97706]',
    iconColor: 'text-white',
    shadowColor: 'rgba(245,158,11,0.4)',
  },
  weather: {
    gradient: 'from-[#38BDF8] via-[#0EA5E9] to-[#0284C7]',
    iconColor: 'text-white',
    shadowColor: 'rgba(14,165,233,0.4)',
  },
  'calendar-app': {
    gradient: 'from-[#EF4444] via-[#DC2626] to-[#B91C1C]',
    iconColor: 'text-white',
    shadowColor: 'rgba(220,38,38,0.4)',
  },
  music: {
    gradient: 'from-[#EC4899] via-[#DB2777] to-[#BE185D]',
    iconColor: 'text-white',
    shadowColor: 'rgba(219,39,119,0.4)',
  },
  // Server apps
  ollama: {
    gradient: 'from-[#10B981] via-[#059669] to-[#047857]',
    iconColor: 'text-white',
    shadowColor: 'rgba(5,150,105,0.4)',
  },
  comfyui: {
    gradient: 'from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9]',
    iconColor: 'text-white',
    shadowColor: 'rgba(124,58,237,0.4)',
  },
  whisper: {
    gradient: 'from-[#06B6D4] via-[#0891B2] to-[#0E7490]',
    iconColor: 'text-white',
    shadowColor: 'rgba(8,145,178,0.4)',
  },
  'stable-diffusion': {
    gradient: 'from-[#F472B6] via-[#EC4899] to-[#DB2777]',
    iconColor: 'text-white',
    shadowColor: 'rgba(236,72,153,0.4)',
  },
};

// Default style for unknown apps
const defaultStyle = {
  gradient: 'from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]',
  iconColor: 'text-white',
  shadowColor: 'rgba(37,99,235,0.4)',
};

interface MacOSIconProps {
  appId: string;
  iconName: string;
  size?: number;
  className?: string;
  showShadow?: boolean;
}

export const MacOSIcon = memo(({ 
  appId, 
  iconName, 
  size = 50, 
  className,
  showShadow = true 
}: MacOSIconProps) => {
  const style = iconStyles[appId] || defaultStyle;
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;

  return (
    <div
      className={cn(
        'rounded-[22%] flex items-center justify-center relative overflow-hidden',
        `bg-gradient-to-br ${style.gradient}`,
        className
      )}
      style={{ 
        width: size, 
        height: size,
        boxShadow: showShadow ? `0 4px 12px ${style.shadowColor}, inset 0 1px 0 rgba(255,255,255,0.2)` : undefined,
      }}
    >
      {/* Highlight overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />
      <IconComponent 
        className={cn(style.iconColor, 'relative z-10')} 
        style={{ width: size * 0.5, height: size * 0.5 }} 
      />
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
  const style = iconStyles.trash;
  const IconComponent = isEmpty ? LucideIcons.Trash2 : LucideIcons.Trash;

  return (
    <div
      className={cn(
        'rounded-[22%] flex items-center justify-center relative overflow-hidden',
        `bg-gradient-to-br ${style.gradient}`,
        className
      )}
      style={{ 
        width: size, 
        height: size,
        boxShadow: `0 4px 12px ${style.shadowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />
      <IconComponent 
        className={cn(style.iconColor, 'relative z-10')} 
        style={{ width: size * 0.5, height: size * 0.5 }} 
      />
    </div>
  );
});
TrashIcon.displayName = 'TrashIcon';

// Finder icon with the classic two-face design
export const FinderIcon = memo(({ size = 50 }: { size?: number }) => (
  <div
    className="rounded-[22%] flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1E90FF] via-[#00BFFF] to-[#87CEEB]"
    style={{ 
      width: size, 
      height: size,
      boxShadow: '0 4px 12px rgba(30,144,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    }}
  >
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
      }}
    />
    {/* Simple face design */}
    <svg 
      viewBox="0 0 100 100" 
      className="relative z-10"
      style={{ width: size * 0.7, height: size * 0.7 }}
    >
      {/* Face outline */}
      <rect x="15" y="10" width="70" height="80" rx="8" fill="white" opacity="0.95"/>
      {/* Left eye */}
      <ellipse cx="35" cy="45" rx="8" ry="12" fill="#333"/>
      {/* Right eye */}
      <ellipse cx="65" cy="45" rx="8" ry="12" fill="#333"/>
      {/* Smile */}
      <path d="M 30 70 Q 50 85 70 70" stroke="#333" strokeWidth="4" fill="none" strokeLinecap="round"/>
    </svg>
  </div>
));
FinderIcon.displayName = 'FinderIcon';

// Launchpad icon (grid of small dots)
export const LaunchpadIcon = memo(({ size = 50 }: { size?: number }) => (
  <div
    className="rounded-[22%] flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#374151] via-[#1F2937] to-[#111827]"
    style={{ 
      width: size, 
      height: size,
      boxShadow: '0 4px 12px rgba(31,41,55,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
    }}
  >
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 100%)',
      }}
    />
    {/* Grid of colorful dots */}
    <div className="grid grid-cols-4 gap-[3px] relative z-10" style={{ padding: size * 0.15 }}>
      {[
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#BB8FCE', '#85C1E9', '#F8B500', '#82E0AA',
        '#F1948A', '#AED6F1', '#FAD7A0', '#D7BDE2',
      ].map((color, i) => (
        <div 
          key={i}
          className="rounded-full"
          style={{ 
            width: size * 0.12, 
            height: size * 0.12, 
            backgroundColor: color,
            boxShadow: `0 1px 2px rgba(0,0,0,0.3)`,
          }}
        />
      ))}
    </div>
  </div>
));
LaunchpadIcon.displayName = 'LaunchpadIcon';
