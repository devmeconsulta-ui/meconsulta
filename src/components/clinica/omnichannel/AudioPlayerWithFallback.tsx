import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerWithFallbackProps {
  url: string;
}

// Generate static waveform bars for visual effect
const generateWaveform = () => {
  const bars = [];
  for (let i = 0; i < 28; i++) {
    // Create varying heights for visual appeal
    const height = Math.random() * 60 + 20; // 20-80%
    bars.push(height);
  }
  return bars;
};

export function AudioPlayerWithFallback({ url }: AudioPlayerWithFallbackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [waveform] = useState(() => generateWaveform());
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.error("Play error:", err);
          setHasError(true);
        });
      }
    }
  };

  const formatTime = (time: number) => {
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

  // If audio fails to load, show download fallback
  if (hasError) {
    return (
      <div className="flex items-center gap-3 bg-[#DCF8C6] rounded-lg p-2 min-w-[200px]">
        <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center shrink-0">
          <Mic className="h-5 w-5 text-white" />
        </div>
        <span className="text-xs text-gray-600 flex-1">
          Erro ao carregar áudio
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2 text-[#00A884] hover:text-[#00A884]/80"
          asChild
        >
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-[#DCF8C6] rounded-2xl p-2 min-w-[240px] max-w-[320px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (dur && !isNaN(dur)) {
            setDuration(dur);
            setIsLoaded(true);
          }
        }}
        onCanPlay={() => setIsLoaded(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={(e) => {
          console.error("Audio error:", url, e);
          setHasError(true);
        }}
        playsInline
      />
      
      {/* Play button - WhatsApp style green circle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-full bg-[#00A884] hover:bg-[#00A884]/90 text-white shrink-0 shadow-sm"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" fill="white" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" fill="white" />
        )}
      </Button>

      {/* Waveform and progress */}
      <div className="flex-1 min-w-0">
        <div 
          className="flex items-center gap-[2px] h-8 cursor-pointer"
          onClick={handleSeek}
        >
          {waveform.map((height, i) => {
            const barProgress = (i / waveform.length) * 100;
            const isPast = barProgress <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors",
                  isPast ? "bg-[#00A884]" : "bg-[#8BCFBB]"
                )}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        
        {/* Time display */}
        <div className="flex justify-between mt-0.5">
          <span className="text-[11px] text-gray-500">
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Microphone icon */}
      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
        <Mic className="h-4 w-4 text-gray-600" />
      </div>
    </div>
  );
}
