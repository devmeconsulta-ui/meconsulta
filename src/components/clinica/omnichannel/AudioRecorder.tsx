import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AudioRecorderProps {
  onSendAudio: (audioBlob: Blob, duration: number) => Promise<void>;
  disabled?: boolean;
}

export function AudioRecorder({ onSendAudio, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Format time as mm:ss
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Cleanup audio URL to prevent memory leaks
  const cleanupAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Stop all media tracks
  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Clear timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Cleanup any previous state
      cleanupAudioUrl();
      setAudioBlob(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      
      // Try to use OGG format first (WhatsApp compatible), fallback to WebM
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
        ? 'audio/ogg; codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
        ? 'audio/webm; codecs=opus'
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setAudioBlob(blob);
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("[AudioRecorder] Error starting:", error);
      stopMediaTracks();
      toast.error("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  }, [cleanupAudioUrl, stopMediaTracks]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("[AudioRecorder] Error stopping:", e);
      }
    }
    
    setIsRecording(false);
    clearTimer();
    stopMediaTracks();
  }, [clearTimer, stopMediaTracks]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    stopRecording();
    cleanupAudioUrl();
    setAudioBlob(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  }, [stopRecording, cleanupAudioUrl]);

  // Send audio
  const sendAudio = useCallback(async () => {
    if (!audioBlob || isSending) return;
    
    setIsSending(true);
    try {
      await onSendAudio(audioBlob, recordingTime);
      cleanupAudioUrl();
      setAudioBlob(null);
      setRecordingTime(0);
      audioChunksRef.current = [];
    } catch (error) {
      console.error("[AudioRecorder] Error sending:", error);
      toast.error("Erro ao enviar áudio");
    } finally {
      setIsSending(false);
    }
  }, [audioBlob, recordingTime, onSendAudio, isSending, cleanupAudioUrl]);

  // Create audio URL for preview (memoized)
  const audioPreviewUrl = useMemo(() => {
    if (audioBlob) {
      cleanupAudioUrl();
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      return url;
    }
    return null;
  }, [audioBlob, cleanupAudioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      stopMediaTracks();
      cleanupAudioUrl();
    };
  }, [clearTimer, stopMediaTracks, cleanupAudioUrl]);

  // Waveform bars - memoized to prevent re-renders
  const waveformBars = useMemo(() => (
    <div className="flex items-center gap-0.5 h-6">
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="w-1 bg-destructive rounded-full animate-pulse"
          style={{
            height: `${8 + (i % 3) * 6}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  ), []);

  // If we have a recorded audio, show send/cancel controls
  if (audioBlob && audioPreviewUrl) {
    return (
      <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={cancelRecording}
          disabled={isSending}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm font-medium text-foreground min-w-[40px]">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        <audio 
          src={audioPreviewUrl} 
          controls 
          className="h-8 max-w-[150px]"
        />
        
        <Button
          size="icon"
          className="h-9 w-9 bg-primary hover:bg-primary/90 rounded-full"
          onClick={sendAudio}
          disabled={isSending}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  // If recording, show recording controls
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 animate-in slide-in-from-right-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={cancelRecording}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2 px-2 flex-1">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium text-foreground min-w-[40px]">
            {formatTime(recordingTime)}
          </span>
          {waveformBars}
        </div>
        
        <Button
          size="icon"
          className="h-9 w-9 bg-destructive hover:bg-destructive/90 rounded-full"
          onClick={stopRecording}
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      </div>
    );
  }

  // Default: show mic button
  return (
    <Button 
      size="icon"
      className="h-10 w-10 min-w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shrink-0"
      onClick={startRecording}
      disabled={disabled}
      type="button"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}
