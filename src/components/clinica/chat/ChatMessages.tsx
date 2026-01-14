import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mensagem, Conversa } from "@/hooks/useChatClinica";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  Image as ImageIcon, 
  Download,
  Hash,
  Users
} from "lucide-react";

interface ChatMessagesProps {
  conversa: Conversa | null;
  mensagens: Mensagem[];
  loading: boolean;
}

export function ChatMessages({ conversa, mensagens, loading }: ChatMessagesProps) {
  const { currentUser } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    // Scroll para o final quando novas mensagens chegarem
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const isMinhaMsg = (msg: Mensagem) => {
    if (currentUser?.tipo === "clinica") {
      return msg.remetente_usuario_id === currentUser.id;
    } else if (currentUser?.medicoId) {
      return msg.remetente_medico_id === currentUser.medicoId;
    } else if (currentUser?.clinicaId) {
      return msg.remetente_usuario_clinica_id === currentUser.id;
    }
    return false;
  };

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    if (isToday(data)) {
      return "Hoje";
    }
    if (isYesterday(data)) {
      return "Ontem";
    }
    return format(data, "d 'de' MMMM", { locale: ptBR });
  };

  const formatarHora = (dataStr: string) => {
    return format(new Date(dataStr), "HH:mm", { locale: ptBR });
  };

  const renderSeparadorData = (dataAtual: string, dataAnterior: string | null) => {
    if (!dataAnterior || !isSameDay(new Date(dataAtual), new Date(dataAnterior))) {
      return (
        <div className="flex items-center justify-center my-4">
          <div className="bg-muted px-3 py-1 rounded-full">
            <span className="text-xs text-muted-foreground font-medium">
              {formatarData(dataAtual)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderConteudo = (msg: Mensagem) => {
    if (msg.tipo_mensagem === "imagem" && msg.arquivo_url) {
      return (
        <div>
          <img
            src={msg.arquivo_url}
            alt={msg.arquivo_nome || "Imagem"}
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setImagePreview(msg.arquivo_url)}
          />
          {msg.conteudo && (
            <p className="mt-2 text-sm">{msg.conteudo}</p>
          )}
        </div>
      );
    }

    if (msg.tipo_mensagem === "arquivo" && msg.arquivo_url) {
      return (
        <div>
          <a
            href={msg.arquivo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-background/50 rounded-lg p-3 hover:bg-background/80 transition-colors"
          >
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.arquivo_nome}</p>
              <p className="text-xs text-muted-foreground">{msg.arquivo_tipo}</p>
            </div>
            <Download className="h-4 w-4" />
          </a>
          {msg.conteudo && (
            <p className="mt-2 text-sm">{msg.conteudo}</p>
          )}
        </div>
      );
    }

    if (msg.tipo_mensagem === "sistema") {
      return (
        <div className="flex items-center justify-center">
          <span className="text-xs text-muted-foreground italic">
            {msg.conteudo}
          </span>
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap break-words">{msg.conteudo}</p>;
  };

  if (!conversa) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Escolha uma conversa existente ou crie uma nova para começar a trocar mensagens
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
              <p className="text-sm text-muted-foreground">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {mensagens.map((msg, index) => {
              const minha = isMinhaMsg(msg);
              const dataAnterior = index > 0 ? mensagens[index - 1].created_at : null;

              if (msg.tipo_mensagem === "sistema") {
                return (
                  <div key={msg.id}>
                    {renderSeparadorData(msg.created_at, dataAnterior)}
                    <div className="flex justify-center my-2">
                      {renderConteudo(msg)}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id}>
                  {renderSeparadorData(msg.created_at, dataAnterior)}
                  <div className={`flex gap-2 ${minha ? "justify-end" : "justify-start"}`}>
                    {!minha && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={msg.remetente_foto} />
                        <AvatarFallback className="text-xs">
                          {msg.remetente_nome?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`max-w-[70%] ${minha ? "items-end" : "items-start"}`}>
                      {!minha && (
                        <span className="text-xs text-muted-foreground ml-1 mb-1 block">
                          {msg.remetente_nome}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          minha
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        {renderConteudo(msg)}
                      </div>
                      <span className={`text-xs text-muted-foreground mt-1 block ${minha ? "text-right" : "text-left"} px-1`}>
                        {formatarHora(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Modal de preview de imagem */}
      {imagePreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
