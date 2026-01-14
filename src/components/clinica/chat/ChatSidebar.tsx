import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Conversa } from "@/hooks/useChatClinica";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, 
  MessageSquare, 
  Plus, 
  Search,
  Hash,
  User
} from "lucide-react";

interface ChatSidebarProps {
  conversas: Conversa[];
  conversaAtual: Conversa | null;
  onSelectConversa: (conversa: Conversa) => void;
  onNovaConversa: () => void;
  loading: boolean;
}

export function ChatSidebar({
  conversas,
  conversaAtual,
  onSelectConversa,
  onNovaConversa,
  loading,
}: ChatSidebarProps) {
  const [busca, setBusca] = useState("");

  const conversasFiltradas = conversas.filter((c) =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.ultima_mensagem?.conteudo?.toLowerCase().includes(busca.toLowerCase())
  );

  const formatarData = (dataStr: string) => {
    const data = new Date(dataStr);
    if (isToday(data)) {
      return format(data, "HH:mm", { locale: ptBR });
    }
    if (isYesterday(data)) {
      return "Ontem";
    }
    return format(data, "dd/MM", { locale: ptBR });
  };

  const getConversaNome = (conversa: Conversa) => {
    if (conversa.tipo === "grupo") {
      return conversa.nome || "Grupo";
    }
    // Para conversas privadas, mostrar nome do outro participante
    return conversa.nome || "Conversa privada";
  };

  const getConversaIcon = (conversa: Conversa) => {
    if (conversa.tipo === "grupo") {
      return <Hash className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Chat Interno</h2>
          </div>
          <Button size="sm" onClick={onNovaConversa}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>
        
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
              <p className="text-xs mt-1">Clique em "Nova" para iniciar</p>
            </div>
          ) : (
            conversasFiltradas.map((conversa) => (
              <button
                key={conversa.id}
                onClick={() => onSelectConversa(conversa)}
                className={`w-full p-3 rounded-lg text-left transition-colors mb-1 ${
                  conversaAtual?.id === conversa.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${
                      conversa.tipo === "grupo" 
                        ? "bg-primary/20 text-primary" 
                        : "bg-secondary"
                    }`}>
                      {getConversaIcon(conversa)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {getConversaNome(conversa)}
                      </span>
                      {conversa.ultima_mensagem && (
                        <span className="text-xs text-muted-foreground">
                          {formatarData(conversa.ultima_mensagem.created_at)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {conversa.ultima_mensagem?.conteudo || "Nenhuma mensagem"}
                      </p>
                      {conversa.mensagens_nao_lidas && conversa.mensagens_nao_lidas > 0 && (
                        <Badge variant="default" className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs">
                          {conversa.mensagens_nao_lidas > 99 ? "99+" : conversa.mensagens_nao_lidas}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
