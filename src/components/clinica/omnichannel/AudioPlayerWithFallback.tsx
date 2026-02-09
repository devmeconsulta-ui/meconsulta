import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Mic } from "lucide-react";
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
  const [loadError, setLoadError] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate static waveform bars like WhatsApp
  const waveformBars = [
    20, 35, 25, 45, 30, 55, 40, 60, 35, 70, 45, 55, 50, 65, 40, 75,
    55, 45, 60, 50, 70, 40, 55, 35, 60, 45, 50, 35, 55, 40, 45, 30
  ];

  useEffect(() => {
    console.log("[AudioPlayer] Mounting with URL:", url);
  }, [url]);

  const handlePlayClick = async () => {
    console.log("[AudioPlayer] Play clicked");
    
    const audio = audioRef.current;
    if (!audio) {
      console.error("[AudioPlayer] No audio ref");
      return;
    }

    console.log("[AudioPlayer] Audio state - readyState:", audio.readyState, "src:", audio.src);

    try {
      if (isPlaying) {
        audio.pause();
        console.log("[AudioPlayer] Paused");
      } else {
        console.log("[AudioPlayer] Attempting to play...");
        await audio.play();
        console.log("[AudioPlayer] Playing!");
      }
    } catch (err: any) {
      console.error("[AudioPlayer] Play error:", err.name, err.message);
      setLoadError(true);
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
  const waveActiveColor = "#34B7F1";
  const waveInactiveColor = isOutgoing ? "#92D4A8" : "#CCD0D5";

  // If there was an error, show native audio controls
  if (loadError) {
    return (
      <div className={cn(
        "flex flex-col gap-2 rounded-lg p-2 min-w-[240px] max-w-[320px] shadow-sm",
        bubbleBg
      )}>
        <audio 
          src={url} 
          controls 
          className="w-full h-10"
          preload="auto"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg p-2 min-w-[240px] max-w-[320px] shadow-sm",
      bubbleBg
    )}>
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onLoadStart={() => {
          console.log("[AudioPlayer] Load started");
        }}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          console.log("[AudioPlayer] Metadata loaded, duration:", dur);
          if (dur && !isNaN(dur) && isFinite(dur)) {
            setDuration(dur);
          }
          setAudioLoaded(true);
        }}
        onCanPlay={() => {
          console.log("[AudioPlayer] Can play");
          setAudioLoaded(true);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => {
          console.log("[AudioPlayer] onPlay event");
          setIsPlaying(true);
        }}
        onPause={() => {
          console.log("[AudioPlayer] onPause event");
          setIsPlaying(false);
        }}
        onEnded={() => {
          console.log("[AudioPlayer] onEnded event");
          setIsPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
        }}
        onError={(e) => {
          const audio = e.currentTarget;
          console.error("[AudioPlayer] Error:", audio.error?.code, audio.error?.message);
          setLoadError(true);
        }}
        playsInline
      />

      {/* Play/Pause button - WhatsApp style */}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-full shrink-0 p-0 hover:bg-black/5 transition-all"
        onClick={handlePlayClick}
      >
        {isPlaying ? (
          <Pause className="h-6 w-6 text-[#54656F]" fill="#54656F" />
        ) : (
          <Play className="h-6 w-6 text-[#54656F] ml-0.5" fill="#54656F" />
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

      {/* Microphone icon like WhatsApp */}
      <div className="w-8 h-8 rounded-full bg-[#DFE5E7] flex items-center justify-center shrink-0">
        <Mic className="h-4 w-4 text-[#8696A0]" />
      </div>
    </div>
  );
}
