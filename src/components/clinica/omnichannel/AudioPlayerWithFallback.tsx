import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Mic } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  
  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  // Colors exactly like WhatsApp
  const bubbleBg = isOutgoing ? "bg-[#D9FDD3]" : "bg-white";
  const waveformColor = isOutgoing ? "#53bdeb" : "#667781";
  const progressColor = isOutgoing ? "#25D366" : "#00a884";

  // Load audio using Web Audio API (better codec support)
  useEffect(() => {
    let cancelled = false;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("Web Audio API não suportada");
        }

        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        // Fetch the audio file
        console.log("[AudioPlayer] Fetching audio:", url);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar áudio: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log("[AudioPlayer] Got buffer, size:", arrayBuffer.byteLength);

        if (cancelled) return;

        // Decode the audio data
        try {
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          console.log("[AudioPlayer] Decoded successfully, duration:", audioBuffer.duration);
          
          if (cancelled) return;

          audioBufferRef.current = audioBuffer;
          setDuration(audioBuffer.duration);
          setIsLoading(false);
        } catch (decodeError) {
          console.error("[AudioPlayer] Decode error:", decodeError);
          throw new Error("Formato de áudio não suportado");
        }
      } catch (err) {
        console.error("[AudioPlayer] Load error:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar áudio");
          setIsLoading(false);
        }
      }
    };

    loadAudio();

    return () => {
      cancelled = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [url]);

  // Update progress while playing
  const updateProgress = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;
    
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pausedAtRef.current;
    setCurrentTime(Math.min(elapsed, duration));
    
    if (elapsed < duration) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
      pausedAtRef.current = 0;
    }
  }, [isPlaying, duration]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  const handlePlayPause = async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    const audioContext = audioContextRef.current;

    // Resume context if suspended (required for user gesture)
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (isPlaying) {
      // Pause
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
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
        if (sourceNodeRef.current === source) {
          setIsPlaying(false);
          setCurrentTime(0);
          pausedAtRef.current = 0;
        }
      };

      const offset = pausedAtRef.current;
      startTimeRef.current = audioContext.currentTime;
      source.start(0, offset);
      sourceNodeRef.current = source;
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const seekTime = percentage * duration;
    
    // If playing, restart from new position
    if (isPlaying && sourceNodeRef.current && audioContextRef.current && audioBufferRef.current) {
      sourceNodeRef.current.stop();
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (sourceNodeRef.current === source) {
          setIsPlaying(false);
          setCurrentTime(0);
          pausedAtRef.current = 0;
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
  };

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Error state - use native audio as final fallback
  if (error) {
    return (
      <div className={cn(
        "rounded-2xl p-2 min-w-[200px] max-w-[280px] shadow-sm",
        bubbleBg
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
      bubbleBg
    )}>
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            isLoading 
              ? "bg-gray-200 cursor-wait" 
              : "bg-[#00a884] hover:bg-[#00997a] text-white cursor-pointer"
          )}
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          >
            {Array.from({ length: 28 }).map((_, i) => {
              const heights = [3, 5, 8, 4, 10, 6, 12, 5, 8, 14, 6, 9, 4, 11, 7, 5, 13, 8, 6, 10, 4, 7, 12, 5, 9, 6, 8, 4];
              const height = heights[i % heights.length];
              const isPlayed = (i / 28) * 100 <= progressPercentage;
              
              return (
                <div
                  key={i}
                  className="w-[3px] rounded-full transition-colors"
                  style={{
                    height: `${height}px`,
                    backgroundColor: isPlayed ? progressColor : waveformColor,
                    opacity: isPlayed ? 1 : 0.4,
                  }}
                />
              );
            })}
          </div>

          {/* Time */}
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-gray-500">
              {formatTime(isPlaying ? currentTime : (currentTime || duration))}
            </span>
            <Mic className="h-3 w-3" style={{ color: waveformColor, opacity: 0.6 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
