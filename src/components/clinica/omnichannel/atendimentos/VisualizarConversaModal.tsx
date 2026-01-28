import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft,
  Download,
  Play,
  Pause,
  Check,
  CheckCheck,
  X,
  MessageCircle,
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
    <div className="bg-primary/20 rounded-2xl p-3 flex items-center gap-3 min-w-[200px]">
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
        className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </Button>
      <div className="flex-1">
        <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ mensagem, agenteNome }: { mensagem: OmniMensagem; agenteNome?: string }) {
  const isOutgoing = mensagem.direcao === "saida";
  const formattedTime = format(new Date(mensagem.created_at), "HH:mm", {
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
              className="rounded-lg max-w-[280px] cursor-pointer hover:opacity-90 transition-opacity"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-70">{mensagem.arquivo_nome || ""}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] opacity-70">{formattedTime}</span>
                {isOutgoing && (
                  mensagem.status === "lida" ? (
                    <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5 opacity-60" />
                  )
                )}
              </div>
            </div>
          </div>
        );

      case "audio":
        return (
          <div className="space-y-2">
            <AudioPlayer url={mensagem.arquivo_url || ""} />
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] opacity-70">{formattedTime}</span>
              {isOutgoing && (
                mensagem.status === "lida" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5 opacity-60" />
                )
              )}
            </div>
          </div>
        );

      case "video":
        return (
          <div className="space-y-2">
            <video
              src={mensagem.arquivo_url || ""}
              controls
              className="rounded-lg max-w-[280px]"
            />
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] opacity-70">{formattedTime}</span>
              {isOutgoing && (
                mensagem.status === "lida" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5 opacity-60" />
                )
              )}
            </div>
          </div>
        );

      case "documento":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-black/5 rounded-xl p-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{mensagem.arquivo_nome || "Documento"}</p>
                <p className="text-xs opacity-60">Documento</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href={mensagem.arquivo_url || ""} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] opacity-70">{formattedTime}</span>
              {isOutgoing && (
                mensagem.status === "lida" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5 opacity-60" />
                )
              )}
            </div>
          </div>
        );

      default:
        return (
          <div>
            <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{mensagem.conteudo}</p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] opacity-70">{formattedTime}</span>
              {isOutgoing && (
                mensagem.status === "lida" ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                ) : mensagem.status === "entregue" ? (
                  <CheckCheck className="h-3.5 w-3.5 opacity-60" />
                ) : (
                  <Check className="h-3.5 w-3.5 opacity-60" />
                )
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
          isOutgoing
            ? "bg-primary/15 text-foreground rounded-br-md"
            : "bg-card text-foreground rounded-bl-md border"
        )}
      >
        {isOutgoing && agenteNome && (
          <p className="text-xs font-bold text-primary mb-1">{agenteNome}</p>
        )}
        {renderContent()}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
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

  const contactName = atendimento.contato?.nome || "Desconhecido";
  const contactPhone = atendimento.contato?.telefone || "";

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogDescription className="sr-only">
          Visualização da conversa com {contactName}
        </DialogDescription>
        
        {/* Chat Header */}
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shrink-0">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-semibold">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{contactName}</h3>
            <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
              {contactPhone && <span>{contactPhone}</span>}
              {atendimento.fila?.nome && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 text-[10px] px-1.5 py-0">
                    {atendimento.fila.nome}
                  </Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onTransferir && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
                onClick={onTransferir}
                title="Transferir conversa"
              >
                <ArrowRightLeft className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
              onClick={onClose}
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Area - WhatsApp background pattern */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{
            backgroundColor: "#ECE5DD",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4be' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-gray-500">Carregando mensagens...</p>
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm">Nenhuma mensagem nesta conversa</p>
            </div>
          ) : (
            <>
              {/* Date separator */}
              <div className="flex justify-center mb-4">
                <span className="bg-white/80 text-gray-600 text-xs px-3 py-1 rounded-lg shadow-sm">
                  {format(new Date(mensagens[0]?.created_at || new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {mensagens.map((msg) => (
                <MessageBubble key={msg.id} mensagem={msg} agenteNome={atendimento.agente?.nome} />
              ))}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#F0F2F5] px-4 py-3 text-center border-t shrink-0">
          <p className="text-xs text-gray-500">
            Visualização somente leitura • Protocolo #{atendimento.protocolo}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
