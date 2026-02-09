import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Mic } from "lucide-react";

interface AudioPlayerWithFallbackProps {
  url: string;
  isOutgoing?: boolean;
}

// Static waveform heights - never changes
const WAVEFORM_HEIGHTS = [3, 5, 8, 4, 10, 6, 12, 5, 8, 14, 6, 9, 4, 11, 7, 5, 13, 8, 6, 10, 4, 7, 12, 5, 9, 6, 8, 4];

export function AudioPlayerWithFallback({ 
  url, 
  isOutgoing = false
}: AudioPlayerWithFallbackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Memoized colors for WhatsApp style
  const colors = useMemo(() => ({
    bubbleBg: isOutgoing ? "bg-[#D9FDD3]" : "bg-white",
    waveformColor: isOutgoing ? "#53bdeb" : "#667781",
    progressColor: isOutgoing ? "#25D366" : "#00a884",
  }), [isOutgoing]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    audioBufferRef.current = null;
  }, []);

  // Load audio using Web Audio API
  useEffect(() => {
    mountedRef.current = true;
    let abortController = new AbortController();

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setCurrentTime(0);
        pausedAtRef.current = 0;

        // Create AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("Web Audio API não suportada");
        }

        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        // Fetch the audio file
        const response = await fetch(url, { signal: abortController.signal });
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar áudio: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        if (!mountedRef.current) return;

        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        if (!mountedRef.current) return;

        audioBufferRef.current = audioBuffer;
        setDuration(audioBuffer.duration);
        setIsLoading(false);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        
        console.error("[AudioPlayer] Load error:", err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "Erro ao carregar áudio");
          setIsLoading(false);
        }
      }
    };

    loadAudio();

    return () => {
      mountedRef.current = false;
      abortController.abort();
      cleanup();
    };
  }, [url, cleanup]);

  // Update progress while playing
  const updateProgress = useCallback(() => {
    if (!audioContextRef.current || !mountedRef.current) return;
    
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pausedAtRef.current;
    const clampedTime = Math.min(elapsed, duration);
    setCurrentTime(clampedTime);
    
    if (elapsed < duration) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
      pausedAtRef.current = 0;
    }
  }, [duration]);

  useEffect(() => {
    if (isPlaying && mountedRef.current) {
      animationRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, updateProgress]);

  const handlePlayPause = useCallback(async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    const audioContext = audioContextRef.current;

    // Resume context if suspended
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (isPlaying) {
      // Pause
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
        } catch (e) {}
        sourceNodeRef.current = null;
      }
      pausedAtRef.current = audioContext.currentTime - startTimeRef.current + pausedAtRef.current;
      setIsPlaying(false);
    } else {
      // Play
      const source = audioContext.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        if (sourceNodeRef.current === source && mountedRef.current) {
          setIsPlaying(false);
          setCurrentTime(0);
          pausedAtRef.current = 0;
          sourceNodeRef.current = null;
        }
      };

      const offset = Math.min(pausedAtRef.current, duration);
      startTimeRef.current = audioContext.currentTime;
      source.start(0, offset);
      sourceNodeRef.current = source;
      setIsPlaying(true);
    }
  }, [isPlaying, duration]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !audioBufferRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const seekTime = percentage * duration;
    
    // If playing, restart from new position
    if (isPlaying && sourceNodeRef.current && audioContextRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (sourceNodeRef.current === source && mountedRef.current) {
          setIsPlaying(false);
          setCurrentTime(0);
          pausedAtRef.current = 0;
          sourceNodeRef.current = null;
        }
      };

      startTimeRef.current = audioContextRef.current.currentTime;
      pausedAtRef.current = seekTime;
      source.start(0, seekTime);
      sourceNodeRef.current = source;
    } else {
      pausedAtRef.current = seekTime;
    }
    
    setCurrentTime(seekTime);
  }, [duration, isPlaying]);

  const formatTime = useCallback((time: number) => {
    if (!time || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Error state - use native audio as final fallback
  if (error) {
    return (
      <div className={cn(
        "rounded-2xl p-2 min-w-[200px] max-w-[280px] shadow-sm",
        colors.bubbleBg
      )}>
        <audio 
          src={url} 
          controls 
          preload="auto"
          playsInline
          className="w-full h-10"
          style={{ borderRadius: '8px' }}
        />
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Player alternativo
        </p>
      </div>
    );
  }

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
