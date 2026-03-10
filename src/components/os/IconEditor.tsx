import { memo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, RotateCcw, Check, X, Sparkles } from 'lucide-react';
import { useCustomIcons } from '@/hooks/useCustomIcons';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface IconEditorProps {
  appId: string;
  appName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const IconEditor = memo(({ appId, appName, isOpen, onClose }: IconEditorProps) => {
  const { setCustomIcon, getCustomIcon, removeCustomIcon } = useCustomIcons();
  const existing = getCustomIcon(appId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existing?.imageUrl || null);
  const [useGlass, setUseGlass] = useState(existing?.useGlassmorphism ?? false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSave = () => {
    if (previewUrl) {
      setCustomIcon(appId, previewUrl, useGlass);
    }
    onClose();
  };

  const handleReset = () => {
    removeCustomIcon(appId);
    setPreviewUrl(null);
    setUseGlass(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[30000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40" />
          <motion.div
            className="relative w-[380px] rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(40,40,47,0.85)',
              backdropFilter: 'blur(60px) saturate(200%)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.12)',
            }}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-[15px] font-semibold text-white">Modifier l'icône</h3>
              <button onClick={onClose} className="text-white/50 hover:text-white/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-2">
              <p className="text-[12px] text-white/50">{appName}</p>
            </div>

            {/* Preview area */}
            <div className="flex justify-center py-6">
              <div className="relative">
                {previewUrl ? (
                  <div
                    className={cn(
                      'w-[96px] h-[96px] rounded-[22%] overflow-hidden',
                      'flex items-center justify-center'
                    )}
                    style={useGlass ? {
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    } : undefined}
                  >
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className={cn(
                        'object-contain pointer-events-none',
                        useGlass ? 'w-[64px] h-[64px]' : 'w-full h-full'
                      )}
                      style={useGlass ? {
                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                      } : undefined}
                    />
                  </div>
                ) : (
                  <div
                    className="w-[96px] h-[96px] rounded-[22%] border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/40 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 text-white/30" />
                    <span className="text-[10px] text-white/30">Choisir</span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="px-5 space-y-3 pb-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] text-white/80 hover:text-white transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                {previewUrl ? 'Changer l\'image' : 'Importer une image'}
              </button>

              {/* Glassmorphism toggle */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-[13px] text-white/80">Effet Liquid Glass</span>
                </div>
                <Switch checked={useGlass} onCheckedChange={setUseGlass} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              {existing && (
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-white/60 hover:text-white/80 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Réinitialiser
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!previewUrl}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                  previewUrl
                    ? 'bg-[#007AFF] text-white hover:bg-[#0066DD]'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                <Check className="w-3.5 h-3.5" />
                Valider
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
IconEditor.displayName = 'IconEditor';
