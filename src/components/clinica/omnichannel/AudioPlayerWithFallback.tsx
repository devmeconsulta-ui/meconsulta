import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Download, AlertCircle, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerWithFallbackProps {
  url: string;
  isOutgoing?: boolean;
}

// Detect Safari browser
const isSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');
};

// Detect iOS
const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export function AudioPlayerWithFallback({ 
  url, 
  isOutgoing = false
}: AudioPlayerWithFallbackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Colors exactly like WhatsApp
  const bubbleBg = isOutgoing ? "bg-[#D9FDD3]" : "bg-white";
  const waveformColor = isOutgoing ? "#53bdeb" : "#667781";
  const progressColor = isOutgoing ? "#25D366" : "#00a884";

  const isSafariBrowser = isSafari() || isIOS();

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    // Try to load the audio
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    
    const handleLoadedMetadata = () => {
      console.log("[AudioPlayer] Metadata loaded, duration:", audio.duration);
      setDuration(audio.duration);
      setIsLoading(false);
      setCanPlay(true);
    };

    const handleCanPlay = () => {
      console.log("[AudioPlayer] Can play");
      setCanPlay(true);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      const mediaError = audio.error;
      console.error("[AudioPlayer] Error:", mediaError?.code, mediaError?.message);
      
      // Error codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
      if (mediaError?.code === 4 || mediaError?.code === 3) {
        if (isSafariBrowser) {
          setError("Safari não suporta este formato de áudio (OGG). Use Chrome ou Firefox, ou baixe o arquivo.");
        } else {
          setError("Formato de áudio não suportado pelo navegador");
        }
      } else if (mediaError?.code === 2) {
        setError("Erro de rede ao carregar áudio");
      } else {
        setError("Erro ao carregar áudio");
      }
      setIsLoading(false);
      setCanPlay(false);
    };

    const handleLoadStart = () => {
      console.log("[AudioPlayer] Load started for:", url);
      setIsLoading(true);
      setError(null);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("loadstart", handleLoadStart);

    // Start loading
    audio.src = url;
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.src = "";
    };
  }, [url, isSafariBrowser]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !canPlay) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("[AudioPlayer] Play error:", err);
      setError("Não foi possível reproduzir o áudio");
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Show error state with download option
  if (error) {
    return (
      <div className={cn(
        "rounded-2xl p-3 min-w-[220px] max-w-[280px] shadow-sm",
        bubbleBg
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-600 leading-tight">{error}</p>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            asChild
          >
            <a href={url} download target="_blank" rel="noopener noreferrer">
              <Download className="h-3 w-3" />
              Baixar áudio
            </a>
          </Button>
        </div>
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
          disabled={isLoading || !canPlay}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            isLoading 
              ? "bg-gray-200 cursor-wait" 
              : canPlay
                ? "bg-[#00a884] hover:bg-[#00997a] text-white cursor-pointer"
                : "bg-gray-300 cursor-not-allowed"
          )}
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
          {/* Fake Waveform Bars */}
          <div 
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-6 flex items-center gap-[2px] cursor-pointer relative"
          >
            {/* Background waveform */}
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
              {formatTime(currentTime || duration)}
            </span>
            <Mic className="h-3 w-3" style={{ color: waveformColor, opacity: 0.6 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
