import { useState, useRef, useCallback, useEffect } from "react";
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
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
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
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  }, [stopRecording]);

  // Send audio
  const sendAudio = useCallback(async () => {
    if (!audioBlob) return;
    
    setIsSending(true);
    try {
      await onSendAudio(audioBlob, recordingTime);
      setAudioBlob(null);
      setRecordingTime(0);
      audioChunksRef.current = [];
    } catch (error) {
      console.error("Error sending audio:", error);
      toast.error("Erro ao enviar áudio");
    } finally {
      setIsSending(false);
    }
  }, [audioBlob, recordingTime, onSendAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // If we have a recorded audio, show send/cancel controls
  if (audioBlob) {
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
          src={URL.createObjectURL(audioBlob)} 
          controls 
          className="h-8 max-w-[150px]"
        />
        
        <Button
          size="icon"
          className="h-9 w-9 bg-[#075E54] hover:bg-[#064E46] rounded-full"
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
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-foreground min-w-[40px]">
            {formatTime(recordingTime)}
          </span>
          
          {/* Waveform animation */}
          <div className="flex items-center gap-0.5 h-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 16 + 8}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
        
        <Button
          size="icon"
          className="h-9 w-9 bg-red-500 hover:bg-red-600 rounded-full"
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
      className="h-9 w-9 bg-[#075E54] hover:bg-[#064E46] text-white rounded-full"
      onClick={startRecording}
      disabled={disabled}
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}
