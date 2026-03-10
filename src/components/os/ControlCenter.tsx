import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, Bluetooth, Moon, Sun, Volume2, VolumeX, Airplay, Monitor, Smartphone, Music } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useOS } from '@/hooks/useOS';

interface ControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const CCTile = memo(({ 
  icon: Icon, 
  label, 
  sublabel, 
  active = false, 
  onClick,
  className,
}: { 
  icon: any; 
  label: string; 
  sublabel?: string; 
  active?: boolean; 
  onClick?: () => void;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left',
      active 
        ? 'bg-[#007AFF]/80 text-white' 
        : 'bg-white/8 hover:bg-white/12 text-white/80',
      className
    )}
    style={{
      backdropFilter: 'blur(10px)',
    }}
  >
    <Icon className="w-[18px] h-[18px] shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="text-[12px] font-medium truncate">{label}</div>
      {sublabel && <div className="text-[10px] opacity-60 truncate">{sublabel}</div>}
    </div>
  </button>
));
CCTile.displayName = 'CCTile';

const CCSmallTile = memo(({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  active?: boolean; 
  onClick?: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all',
      active 
        ? 'bg-[#007AFF]/80 text-white' 
        : 'bg-white/8 hover:bg-white/12 text-white/60'
    )}
  >
    <Icon className="w-[18px] h-[18px]" />
    <span className="text-[9px]">{label}</span>
  </button>
));
CCSmallTile.displayName = 'CCSmallTile';

export const ControlCenter = memo(({ isOpen, onClose }: ControlCenterProps) => {
  const { settings, updateSettings } = useOS();
  const [wifiOn, setWifiOn] = useState(true);
  const [btOn, setBtOn] = useState(true);
  const [volume, setVolume] = useState([75]);
  const [brightness, setBrightness] = useState([80]);
  const [focusOn, setFocusOn] = useState(false);

  const isDark = settings.appearance === 'dark' || (settings.appearance === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[15000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute top-[30px] right-[10px] w-[320px] rounded-2xl overflow-hidden p-3"
            style={{
              background: 'rgba(40,40,47,0.72)',
              backdropFilter: 'blur(60px) saturate(200%)',
              WebkitBackdropFilter: 'blur(60px) saturate(200%)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.12)',
            }}
            initial={{ opacity: 0, scale: 0.92, y: -8, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Network row */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <CCTile 
                icon={Wifi} 
                label="Wi-Fi" 
                sublabel={wifiOn ? 'Connecté' : 'Désactivé'}
                active={wifiOn} 
                onClick={() => setWifiOn(!wifiOn)} 
              />
              <CCTile 
                icon={Bluetooth} 
                label="Bluetooth" 
                sublabel={btOn ? 'Activé' : 'Désactivé'}
                active={btOn} 
                onClick={() => setBtOn(!btOn)} 
              />
            </div>

            {/* Shortcuts row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <CCSmallTile 
                icon={Airplay} 
                label="AirDrop" 
                active 
              />
              <CCSmallTile 
                icon={focusOn ? Moon : Sun} 
                label="Concentration" 
                active={focusOn}
                onClick={() => setFocusOn(!focusOn)} 
              />
              <CCSmallTile
                icon={isDark ? Moon : Sun}
                label={isDark ? 'Sombre' : 'Clair'}
                active={isDark}
                onClick={() => updateSettings({ appearance: isDark ? 'light' : 'dark' })}
              />
              <CCSmallTile 
                icon={Smartphone} 
                label="Recopie" 
              />
            </div>

            {/* Display slider */}
            <div
              className="rounded-xl px-3 py-3 mb-2"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <Monitor className="w-[14px] h-[14px] text-white/50" />
                <span className="text-[11px] text-white/60">Luminosité</span>
              </div>
              <Slider
                value={brightness}
                onValueChange={setBrightness}
                max={100}
                step={1}
                className="h-[6px]"
              />
            </div>

            {/* Volume slider */}
            <div
              className="rounded-xl px-3 py-3 mb-2"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2.5 mb-1">
                {volume[0] === 0 ? (
                  <VolumeX className="w-[14px] h-[14px] text-white/50" />
                ) : (
                  <Volume2 className="w-[14px] h-[14px] text-white/50" />
                )}
                <span className="text-[11px] text-white/60">Son</span>
              </div>
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="h-[6px]"
              />
            </div>

            {/* Now Playing */}
            <div
              className="rounded-xl px-3 py-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-white/80 font-medium truncate">Non disponible</div>
                <div className="text-[10px] text-white/40">Aucune lecture</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
ControlCenter.displayName = 'ControlCenter';
