import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerWithFallbackProps {
  url: string;
}

export function AudioPlayerWithFallback({ url }: AudioPlayerWithFallbackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setHasError(true));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // If audio fails to load, show download fallback
  if (hasError) {
    return (
      <div className="flex items-center gap-2 bg-muted rounded-lg p-2 min-w-[200px]">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground flex-1">
          Erro ao carregar
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2"
          asChild
        >
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-xl p-2 flex items-center gap-2 min-w-[200px] max-w-[280px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          setIsLoaded(true);
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          console.error("Audio load error:", url);
          setHasError(true);
        }}
        onCanPlay={() => setIsLoaded(true)}
      />
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-full shrink-0",
          "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
        onClick={togglePlay}
        disabled={!isLoaded}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </Button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {isLoaded ? formatTime(currentTime) : "--:--"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isLoaded ? formatTime(duration || 0) : "--:--"}
          </span>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 shrink-0"
        asChild
        title="Baixar áudio"
      >
        <a href={url} download target="_blank" rel="noopener noreferrer">
          <Download className="h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );
}
