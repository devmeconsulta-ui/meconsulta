import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AudioPlayerWithFallbackProps {
  url: string;
  isOutgoing?: boolean;
  avatarInitials?: string;
}

// Generate waveform pattern similar to WhatsApp
const generateWaveform = (): number[] => {
  const bars: number[] = [];
  for (let i = 0; i < 32; i++) {
    // Create natural looking waveform with variation
    const base = Math.sin(i * 0.3) * 30 + 50;
    const noise = Math.random() * 25;
    bars.push(Math.min(100, Math.max(15, base + noise)));
  }
  return bars;
};

export function AudioPlayerWithFallback({ 
  url, 
  isOutgoing = false,
  avatarInitials = "?"
}: AudioPlayerWithFallbackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [waveform] = useState(() => generateWaveform());
  const audioRef = useRef<HTMLAudioElement>(null);

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
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  // Colors based on direction
  const bgColor = isOutgoing ? "bg-[#D9FDD3]" : "bg-white";
  const waveActiveColor = isOutgoing ? "#53BDEB" : "#34B7F1";
  const waveInactiveColor = isOutgoing ? "#8ECABD" : "#B5D6D0";
  const playBtnColor = "#53BDEB";

  // Error state - show download button
  if (hasError) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg p-2 min-w-[180px] shadow-sm", bgColor)}>
        <div className="w-9 h-9 rounded-full bg-[#53BDEB] flex items-center justify-center">
          <Play className="h-4 w-4 text-white ml-0.5" />
        </div>
        <div className="flex-1 text-xs text-gray-500">
          Não foi possível reproduzir
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 text-gray-500" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-2xl px-2 py-2 min-w-[220px] max-w-[280px] shadow-sm",
      bgColor
    )}>
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
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
        }}
        onError={(e) => {
          console.error("Audio error:", url, e);
          setHasError(true);
          setIsLoading(false);
        }}
        playsInline
      />

      {/* Avatar for received messages (left side) */}
      {!isOutgoing && (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-gray-300 text-gray-600 text-xs">
            {avatarInitials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full shrink-0 p-0 hover:bg-transparent"
        onClick={togglePlay}
        disabled={isLoading}
        style={{ color: playBtnColor }}
      >
        {isPlaying ? (
          <Pause className="h-7 w-7" fill={playBtnColor} stroke={playBtnColor} />
        ) : (
          <Play className="h-7 w-7 ml-0.5" fill={playBtnColor} stroke={playBtnColor} />
        )}
      </Button>

      {/* Waveform and time */}
      <div className="flex-1 min-w-0">
        <div 
          className="flex items-center gap-[1.5px] h-7 cursor-pointer"
          onClick={handleSeek}
        >
          {waveform.map((height, i) => {
            const barProgress = (i / waveform.length) * 100;
            const isPast = barProgress <= progress;
            return (
              <div
                key={i}
                className="w-[2.5px] rounded-full transition-colors duration-100"
                style={{ 
                  height: `${height}%`,
                  backgroundColor: isPast ? waveActiveColor : waveInactiveColor
                }}
              />
            );
          })}
        </div>
        
        {/* Time display */}
        <span className="text-[11px] text-gray-500 mt-0.5 block">
          {isPlaying ? formatTime(currentTime) : formatTime(duration || 0)}
        </span>
      </div>

      {/* Avatar for sent messages (right side) */}
      {isOutgoing && (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-[#53BDEB] text-white text-xs">
            {avatarInitials}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
