import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioPlayerWithFallbackProps {
  url: string;
  isOutgoing?: boolean;
}

export function AudioPlayerWithFallback({ 
  url, 
  isOutgoing = false
}: AudioPlayerWithFallbackProps) {
  // Colors exactly like WhatsApp
  const bubbleBg = isOutgoing ? "bg-[#D9FDD3]" : "bg-white";

  // Use native HTML5 audio controls - most reliable cross-browser solution
  return (
    <div className={cn(
      "rounded-lg p-2 min-w-[200px] max-w-[300px] shadow-sm",
      bubbleBg
    )}>
      <audio 
        src={url} 
        controls 
        preload="auto"
        playsInline
        className="w-full h-10"
        style={{ 
          borderRadius: '8px',
        }}
      />
    </div>
  );
}
