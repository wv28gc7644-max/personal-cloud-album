import { Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize, PictureInPicture, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  onPlayPause: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onFullscreenToggle: () => void;
  onPictureInPictureToggle: () => void;
  onSeek: (time: number) => void;
  onDownload?: () => void;
}

// Format duration with hours:minutes:seconds (and days if needed)
const formatDuration = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}j ${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Extended playback rates up to 4x
const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  isFullscreen,
  onPlayPause,
  onVolumeChange,
  onMuteToggle,
  onPlaybackRateChange,
  onFullscreenToggle,
  onPictureInPictureToggle,
  onSeek,
  onDownload,
}: VideoControlsProps) {
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center justify-between gap-2 mt-2">
      {/* Left controls */}
      <div className="flex items-center gap-1">
        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlayPause}
          className="h-9 w-9 text-white hover:bg-white/20"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" fill="currentColor" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
          )}
        </Button>

        {/* Skip buttons */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSeek(Math.max(0, currentTime - 10))}
          className="h-8 w-8 text-white hover:bg-white/20"
          title="Reculer de 10s"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSeek(Math.min(duration, currentTime + 10))}
          className="h-8 w-8 text-white hover:bg-white/20"
          title="Avancer de 10s"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
          </svg>
        </Button>

        {/* Volume */}
        <div className="flex items-center gap-1 group/volume">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMuteToggle}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <VolumeIcon className="h-5 w-5" />
          </Button>
          <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={(value) => onVolumeChange(value[0] / 100)}
              className="w-20"
            />
          </div>
        </div>

        {/* Time */}
        <div className="text-white text-sm font-medium ml-2 tabular-nums">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Playback speed */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-white hover:bg-white/20 font-medium px-2"
            >
              {playbackRate}x
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-28 p-1" align="end" side="top">
            <div className="flex flex-col">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => onPlaybackRateChange(rate)}
                  className={cn(
                    "px-3 py-1.5 text-sm text-left rounded hover:bg-accent transition-colors",
                    playbackRate === rate && "bg-accent font-medium"
                  )}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Settings (placeholder for future features) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end" side="top">
            <div className="text-sm text-muted-foreground text-center py-2">
              Paramètres à venir...
            </div>
          </PopoverContent>
        </Popover>

        {/* Download */}
        {onDownload && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDownload}
            className="h-8 w-8 text-white hover:bg-white/20"
            title="Télécharger"
          >
            <Download className="h-5 w-5" />
          </Button>
        )}

        {/* Picture-in-Picture */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onPictureInPictureToggle}
          className="h-8 w-8 text-white hover:bg-white/20"
          title="Picture-in-Picture (P)"
        >
          <PictureInPicture className="h-5 w-5" />
        </Button>

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onFullscreenToggle}
          className="h-8 w-8 text-white hover:bg-white/20"
          title="Plein écran (F)"
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
