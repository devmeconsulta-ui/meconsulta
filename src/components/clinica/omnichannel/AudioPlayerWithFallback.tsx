import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle, Volume2 } from "lucide-react";

interface AudioPlayerWithFallbackProps {
  url: string;
}

export function AudioPlayerWithFallback({ url }: AudioPlayerWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  // If audio fails to load, show download fallback
  if (hasError) {
    return (
      <div className="flex items-center gap-2 bg-muted rounded-lg p-2 min-w-[200px]">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-xs text-muted-foreground flex-1">
          Não foi possível reproduzir
        </span>
        <Button 
          variant="outline" 
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
    <div className="flex items-center gap-2 bg-muted rounded-lg p-2 min-w-[220px] max-w-[300px]">
      <Volume2 className="h-4 w-4 text-primary shrink-0" />
      <audio
        controls
        src={url}
        preload="metadata"
        className="h-9 w-full max-w-[240px]"
        onError={() => {
          console.error("Audio load error:", url);
          setHasError(true);
        }}
        playsInline
      >
        Seu navegador não suporta áudio.
      </audio>
    </div>
  );
}
