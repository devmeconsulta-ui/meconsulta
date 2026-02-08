import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  names: string[];
  className?: string;
}

export function TypingIndicator({ names, className }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  const displayText = names.length === 1 
    ? `${names[0]} está digitando`
    : names.length === 2
    ? `${names[0]} e ${names[1]} estão digitando`
    : `${names[0]} e mais ${names.length - 1} estão digitando`;

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground py-1 px-3", className)}>
      <div className="flex items-center gap-1">
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
      </div>
      <span className="italic">{displayText}...</span>
    </div>
  );
}

// Bubble style typing indicator (shows in the message area)
export function TypingBubble({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const displayName = names.length === 1 
    ? names[0]
    : names.length === 2
    ? `${names[0]} e ${names[1]}`
    : `${names[0]} e mais ${names.length - 1}`;

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-lg px-4 py-3 shadow-sm bg-card text-foreground rounded-bl-none">
        <p className="text-[10px] text-muted-foreground mb-1 italic">{displayName}</p>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
