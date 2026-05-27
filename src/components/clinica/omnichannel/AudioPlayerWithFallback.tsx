import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Mic, AlertCircle } from "lucide-react";

interface AudioPlayerWithFallbackProps {
  url: string;
  isOutgoing?: boolean;
}

const WAVEFORM_HEIGHTS = [3, 5, 8, 4, 10, 6, 12, 5, 8, 14, 6, 9, 4, 11, 7, 5, 13, 8, 6, 10, 4, 7, 12, 5, 9, 6, 8, 4];

export function AudioPlayerWithFallback({ url, isOutgoing = false }: AudioPlayerWithFallbackProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const colors = useMemo(() => ({
    bubbleBg: isOutgoing ? "bg-[#D9FDD3]" : "bg-card",
    waveformColor: isOutgoing ? "#53bdeb" : "#667781",
    progressColor: isOutgoing ? "#25D366" : "#00a884",
  }), [isOutgoing]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setError(false);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [url]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    const loadedDuration = audio?.duration || 0;
    setDuration(Number.isFinite(loadedDuration) ? loadedDuration : 0);
    setIsLoading(false);
    setError(false);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime || 0);
    const loadedDuration = audio.duration || 0;
    if (Number.isFinite(loadedDuration) && loadedDuration > 0) {
      setDuration(loadedDuration);
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err) {
      console.error("[AudioPlayer] Playback error:", err);
      setIsPlaying(false);
      setIsLoading(false);
      setError(true);
    }
  }, [error, isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration || error) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = percentage * duration;
    setCurrentTime(audio.currentTime);
  }, [duration, error]);

  const formatTime = useCallback((time: number) => {
    if (!time || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const handleAudioError = useCallback(() => {
    console.error("[AudioPlayer] Native audio error:", url);
    setError(true);
    setIsLoading(false);
    setIsPlaying(false);
  }, [url]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(
      "rounded-2xl p-2.5 min-w-[220px] max-w-[280px] shadow-sm",
      colors.bubbleBg
    )}>
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            isLoading 
              ? "bg-muted cursor-wait" 
              : "bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          )}
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform and Progress */}
        <div className="flex-1 min-w-0">
          {/* Waveform Bars */}
          <div 
            onClick={handleSeek}
            className="h-6 flex items-center gap-[2px] cursor-pointer relative"
            role="slider"
            aria-label="Progresso do áudio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercentage)}
          >
            {WAVEFORM_HEIGHTS.map((height, i) => {
              const isPlayed = (i / WAVEFORM_HEIGHTS.length) * 100 <= progressPercentage;
              
              return (
                <div
                  key={i}
                  className="w-[3px] rounded-full transition-colors duration-100"
                  style={{
                    height: `${height}px`,
                    backgroundColor: isPlayed ? colors.progressColor : colors.waveformColor,
                    opacity: isPlayed ? 1 : 0.4,
                  }}
                />
              );
            })}
          </div>

          {/* Time */}
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {formatTime(isPlaying ? currentTime : (currentTime || duration))}
            </span>
            <Mic className="h-3 w-3 text-muted-foreground opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}
