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
  const [isReady, setIsReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate static waveform bars like WhatsApp
  const waveformBars = [
    20, 35, 25, 45, 30, 55, 40, 60, 35, 70, 45, 55, 50, 65, 40, 75,
    55, 45, 60, 50, 70, 40, 55, 35, 60, 45, 50, 35, 55, 40, 45, 30
  ];

  // Create audio element on mount
  useEffect(() => {
    if (!url) return;

    console.log("[AudioPlayer] Creating audio for URL:", url);
    
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    
    audio.onloadedmetadata = () => {
      console.log("[AudioPlayer] Metadata loaded, duration:", audio.duration);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsReady(true);
    };

    audio.oncanplay = () => {
      console.log("[AudioPlayer] Can play");
      setIsReady(true);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onplay = () => {
      console.log("[AudioPlayer] Playing");
      setIsPlaying(true);
    };

    audio.onpause = () => {
      console.log("[AudioPlayer] Paused");
      setIsPlaying(false);
    };

    audio.onended = () => {
      console.log("[AudioPlayer] Ended");
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.onerror = (e) => {
      console.error("[AudioPlayer] Error loading audio:", e, "URL:", url);
      // Try without crossOrigin
      if (audio.crossOrigin) {
        console.log("[AudioPlayer] Retrying without crossOrigin...");
        audio.crossOrigin = "";
        audio.src = url;
        audio.load();
      }
    };

    audio.src = url;
    audio.load();
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [url]);

  // CRITICAL: Play must happen synchronously from user gesture
  const handlePlayClick = () => {
    console.log("[AudioPlayer] Play clicked, audioRef:", !!audioRef.current, "isPlaying:", isPlaying);
    
    if (!audioRef.current) {
      // Create audio immediately in gesture context if not exists
      console.log("[AudioPlayer] Creating new audio in gesture context");
      const audio = new Audio(url);
      audio.preload = "auto";
      
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      audioRef.current = audio;
      
      // Play immediately
      audio.play().then(() => {
        console.log("[AudioPlayer] Started playing (new audio)");
      }).catch(err => {
        console.error("[AudioPlayer] Play failed:", err);
      });
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Play synchronously from gesture
      audioRef.current.play().then(() => {
        console.log("[AudioPlayer] Started playing");
      }).catch(err => {
        console.error("[AudioPlayer] Play failed:", err);
        // Try recreating audio
        const newAudio = new Audio(url);
        newAudio.onplay = () => setIsPlaying(true);
        newAudio.onpause = () => setIsPlaying(false);
        newAudio.ontimeupdate = () => setCurrentTime(newAudio.currentTime);
        newAudio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };
        audioRef.current = newAudio;
        newAudio.play().catch(e => console.error("[AudioPlayer] Retry failed:", e));
      });
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

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg p-2 min-w-[240px] max-w-[320px] shadow-sm",
      bubbleBg
    )}>
      {/* Play/Pause button - WhatsApp style */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full shrink-0 p-0 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: "transparent" }}
        onClick={handlePlayClick}
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
