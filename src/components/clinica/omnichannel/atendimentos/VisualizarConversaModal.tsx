import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  X,
  ArrowRightLeft,
  Download,
  Play,
  Pause,
  Check,
  CheckCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOmniMensagens, OmniMensagem, OmniAtendimento } from "@/hooks/useOmniAtendimentos";
import { cn } from "@/lib/utils";

interface VisualizarConversaModalProps {
  open: boolean;
  onClose: () => void;
  atendimento: OmniAtendimento | null;
  onTransferir?: () => void;
}

function AudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-muted rounded-lg p-3 flex items-center gap-3 min-w-[200px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1">
        <div className="h-1 bg-muted-foreground/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
        <a href={url} download>
          <Download className="h-3 w-3" />
        </a>
      </Button>
    </div>
  );
}

function MessageBubble({ mensagem }: { mensagem: OmniMensagem }) {
  const isOutgoing = mensagem.direcao === "saida";
  const formattedTime = format(new Date(mensagem.created_at), "dd/MM/yyyy · HH:mm:ss", {
    locale: ptBR,
  });

  const renderContent = () => {
    switch (mensagem.tipo) {
      case "imagem":
        return (
          <div className="space-y-2">
            <img
              src={mensagem.arquivo_url || ""}
              alt="Imagem"
              className="rounded-lg max-w-[250px] cursor-pointer hover:opacity-90"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{mensagem.arquivo_nome || "Sem nome"}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
                <a href={mensagem.arquivo_url || ""} download>
                  <Download className="h-3 w-3" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>
        );

      case "audio":
        return (
          <div className="space-y-2">
            <AudioPlayer url={mensagem.arquivo_url || ""} />
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>
        );

      case "video":
        return (
          <div className="space-y-2">
            <video
              src={mensagem.arquivo_url || ""}
              controls
              className="rounded-lg max-w-[250px]"
            />
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>
        );

      case "documento":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
              <span className="text-sm">{mensagem.arquivo_nome || "Documento"}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                <a href={mensagem.arquivo_url || ""} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>
        );

      default:
        return (
          <div className="space-y-1">
            <p className="text-sm whitespace-pre-wrap">{mensagem.conteudo}</p>
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs text-muted-foreground">{formattedTime}</span>
              {isOutgoing && (
                mensagem.status === "lida" ? (
                  <CheckCheck className="h-3 w-3 text-blue-500" />
                ) : mensagem.status === "entregue" ? (
                  <CheckCheck className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Check className="h-3 w-3 text-muted-foreground" />
                )
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex",
        isOutgoing ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-lg p-3",
          isOutgoing
            ? "bg-green-100 text-green-900 rounded-br-none"
            : "bg-white border shadow-sm rounded-bl-none"
        )}
      >
        {renderContent()}
      </div>
    </div>
  );
}

export function VisualizarConversaModal({
  open,
  onClose,
  atendimento,
  onTransferir,
}: VisualizarConversaModalProps) {
  const { mensagens, loading } = useOmniMensagens(atendimento?.id || null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  if (!atendimento) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between rounded-t-lg">
          <DialogTitle className="text-lg font-semibold">
            Visualizar Conversa
          </DialogTitle>
          <div className="flex items-center gap-2">
            {onTransferir && (
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={onTransferir}
                title="Transferir conversa"
              >
                <ArrowRightLeft className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Info Bar */}
        <div className="px-6 py-3 border-b flex items-center justify-between bg-background">
          <span className="text-sm font-medium text-primary">
            {atendimento.fila?.nome || "Sem fila"}
          </span>
          <span className="text-sm">
            <span className="text-muted-foreground">Cliente:</span>{" "}
            <span className="font-medium">{atendimento.contato?.nome || "Desconhecido"}</span>
          </span>
        </div>

        {/* Messages Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhuma mensagem nesta conversa
            </div>
          ) : (
            mensagens.map((msg) => <MessageBubble key={msg.id} mensagem={msg} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
