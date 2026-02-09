import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerWithFallbackProps {
  url: string;
  isOutgoing?: boolean;
}

// Detect Safari browser
const isSafari = typeof navigator !== 'undefined' && 
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export function AudioPlayerWithFallback({ 
  url, 
  isOutgoing = false
}: AudioPlayerWithFallbackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if URL is OGG format (Safari doesn't support it)
  const isOggFormat = url?.toLowerCase().endsWith('.ogg');
  const showSafariWarning = isSafari && isOggFormat;

  // Generate waveform bars - static pattern that looks like WhatsApp
  const waveformBars = [
    20, 35, 25, 45, 30, 55, 40, 60, 35, 70, 45, 55, 50, 65, 40, 75,
    55, 45, 60, 50, 70, 40, 55, 35, 60, 45, 50, 35, 55, 40, 45, 30
  ];

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error("Play error:", err);
      setHasError(true);
    }
  };

  const formatTime = (time: number): string => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    audioRef.current.currentTime = percent * duration;
  };

  const bgColor = isOutgoing ? "bg-[#D9FDD3]" : "bg-white border border-gray-100";
  const greenColor = "#25D366";
  const lightGreenColor = "#B0D4AF";

  // Safari warning for OGG files
  if (showSafariWarning) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-xl p-2 min-w-[200px] max-w-[280px]",
        bgColor
      )}>
        <div className="h-11 w-11 rounded-full shrink-0 bg-orange-400 flex items-center justify-center">
          <Volume2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600">Safari não suporta este formato</p>
          <p className="text-[10px] text-gray-400">Use Chrome ou baixe</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 text-gray-500" />
          </a>
        </Button>
      </div>
    );
  }

  // Error state - show download fallback
  if (hasError) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-xl p-2 min-w-[200px] max-w-[280px]",
        bgColor
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full shrink-0"
          style={{ backgroundColor: greenColor }}
        >
          <Play className="h-5 w-5 text-white ml-0.5" />
        </Button>
        <div className="flex-1">
          <p className="text-xs text-gray-500">Não foi possível reproduzir</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 text-gray-500" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-xl p-2 min-w-[200px] max-w-[280px]",
      bgColor
    )}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (dur && !isNaN(dur) && isFinite(dur)) {
            setDuration(dur);
          }
          setIsLoading(false);
        }}
        onCanPlay={() => setIsLoading(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
        }}
        onError={(e) => {
          console.error("Audio error for URL:", url);
          setHasError(true);
          setIsLoading(false);
        }}
        playsInline
      />

      {/* Play/Pause button - WhatsApp green */}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-full shrink-0 p-0 hover:opacity-90"
        style={{ backgroundColor: greenColor }}
        onClick={togglePlay}
        disabled={isLoading}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 text-white" fill="white" />
        ) : (
          <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
        )}
      </Button>

      {/* Waveform */}
      <div className="flex-1 min-w-0">
        <div 
          className="flex items-center gap-[2px] h-6 cursor-pointer"
          onClick={handleSeek}
        >
          {waveformBars.map((height, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isPast = barProgress <= progress;
            return (
              <div
                key={i}
                className="w-[3px] rounded-full transition-colors duration-75"
                style={{ 
                  height: `${height}%`,
                  backgroundColor: isPast ? greenColor : lightGreenColor
                }}
              />
            );
          })}
        </div>
        
        {/* Time display */}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[11px] text-gray-500">
            {isPlaying ? formatTime(currentTime) : formatTime(duration || 0)}
          </span>
          {isLoading && (
            <span className="text-[10px] text-gray-400">...</span>
          )}
        </div>
      </div>
    </div>
  );
}
