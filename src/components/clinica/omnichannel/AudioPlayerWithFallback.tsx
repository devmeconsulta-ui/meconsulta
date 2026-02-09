import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerWithFallbackProps {
  url: string;
  isOutgoing?: boolean;
}

export function AudioPlayerWithFallback({ 
  url, 
  isOutgoing = false
}: AudioPlayerWithFallbackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate static waveform bars like WhatsApp
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
      // Silently fail - no error UI
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

  // Colors exactly like WhatsApp
  const bubbleBg = isOutgoing ? "bg-[#D9FDD3]" : "bg-white";
  const playBtnBg = isOutgoing ? "#34B7F1" : "#34B7F1"; // Blue play button
  const waveActiveColor = isOutgoing ? "#34B7F1" : "#34B7F1";
  const waveInactiveColor = isOutgoing ? "#92D4A8" : "#CCD0D5";

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg p-2 min-w-[240px] max-w-[320px] shadow-sm",
      bubbleBg
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
        onError={() => {
          // Silently handle - no error UI
          setIsLoading(false);
        }}
        playsInline
      />

      {/* Play/Pause button - WhatsApp style */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full shrink-0 p-0 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: "transparent" }}
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" style={{ color: "#54656F" }} />
        ) : (
          <Play className="h-6 w-6 ml-0.5" style={{ color: "#54656F" }} />
        )}
      </Button>

      {/* Waveform and time - WhatsApp style */}
      <div className="flex-1 min-w-0">
        <div 
          className="flex items-center gap-[2px] h-[28px] cursor-pointer"
          onClick={handleSeek}
        >
          {waveformBars.map((height, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isPast = barProgress <= progress;
            return (
              <div
                key={i}
                className="w-[3px] rounded-full transition-colors duration-100"
                style={{ 
                  height: `${height}%`,
                  backgroundColor: isPast ? waveActiveColor : waveInactiveColor
                }}
              />
            );
          })}
        </div>
        
        {/* Time display */}
        <div className="flex items-center mt-0.5">
          <span className="text-[11px] text-[#667781]">
            {isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
