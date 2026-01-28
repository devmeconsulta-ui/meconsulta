import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Mic,
  MoreVertical,
  ArrowRightLeft,
  Clock,
  Check,
  CheckCheck,
  MessageCircle,
  Users,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { useOmniMensagens, OmniAtendimento, OmniMensagem } from "@/hooks/useOmniAtendimentos";
import { TransferirAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/TransferirAtendimentoModal";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string; usuarioClinicaId?: string } | null;
}

function getInitials(name: string) {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatWaitTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffSecs / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);
  const seconds = diffSecs % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Componente de bolha de mensagem
function MessageBubble({ mensagem }: { mensagem: OmniMensagem }) {
  const isOutgoing = mensagem.direcao === "saida";
  const formattedTime = format(new Date(mensagem.created_at), "HH:mm", { locale: ptBR });

  const renderStatus = () => {
    if (!isOutgoing) return null;
    if (mensagem.status === "lida") {
      return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />;
    } else if (mensagem.status === "entregue") {
      return <CheckCheck className="h-3.5 w-3.5 text-gray-400" />;
    }
    return <Check className="h-3.5 w-3.5 text-gray-400" />;
  };

  return (
    <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
          isOutgoing
            ? "bg-[#DCF8C6] text-gray-800 rounded-br-none"
            : "bg-white text-gray-800 rounded-bl-none"
        )}
      >
        {mensagem.tipo === "audio" && mensagem.arquivo_url && (
          <audio controls src={mensagem.arquivo_url} className="max-w-[250px]" />
        )}
        {mensagem.tipo === "imagem" && mensagem.arquivo_url && (
          <img src={mensagem.arquivo_url} alt="Imagem" className="rounded max-w-full" />
        )}
        {mensagem.tipo === "video" && mensagem.arquivo_url && (
          <video controls src={mensagem.arquivo_url} className="rounded max-w-full" />
        )}
        {mensagem.tipo === "documento" && mensagem.arquivo_url && (
          <a href={mensagem.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            {mensagem.arquivo_nome || "Documento"}
          </a>
        )}
        {(mensagem.tipo === "texto" || mensagem.conteudo) && (
          <p className="text-sm whitespace-pre-wrap">{mensagem.conteudo}</p>
        )}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-gray-500">{formattedTime}</span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
}

// Componente de item de conversa na sidebar
function ConversationItem({
  atendimento,
  isSelected,
  onClick,
  unreadCount,
}: {
  atendimento: OmniAtendimento;
  isSelected: boolean;
  onClick: () => void;
  unreadCount?: number;
}) {
  const contactName = atendimento.contato?.nome || atendimento.contato?.telefone || "Desconhecido";
  const waitTime = formatWaitTime(atendimento.data_abertura);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 transition-colors",
        isSelected && "bg-gray-100"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={atendimento.contato?.foto_url || undefined} />
          <AvatarFallback className="bg-gray-200 text-gray-600">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        {atendimento.status === "em_atendimento" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{contactName}</span>
          <span className="text-[11px] text-gray-500 whitespace-nowrap">{waitTime}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-500 truncate max-w-[160px]">
            {atendimento.status === "aguardando" ? "Aguardando atendimento..." : "Em atendimento"}
          </p>
          {unreadCount && unreadCount > 0 && (
            <Badge className="bg-green-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente principal do chat
export default function OmniWhatsAppChat() {
  const { clinicaData, currentUser } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAtendimento, setSelectedAtendimento] = useState<OmniAtendimento | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [transferirModalOpen, setTransferirModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "waiting" | "mine">("all");
  const [waitTimeDisplay, setWaitTimeDisplay] = useState("00:00:00");
  
  // Local state for atendimentos to avoid hook conflicts
  const [atendimentos, setAtendimentos] = useState<OmniAtendimento[]>([]);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { filas } = useOmniFilas(clinicaId);
  const { mensagens, loading: loadingMessages, enviarMensagem } = useOmniMensagens(selectedAtendimento?.id || null);

  // Fetch atendimentos locally to avoid conflicts with OmniLayout hook
  const fetchAtendimentos = useCallback(async () => {
    if (!clinicaId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("omni_atendimentos")
        .select(`
          *,
          contato:omni_contatos!contato_id(*),
          fila:omni_filas!fila_id(id, nome, cor),
          agente:usuarios_clinica!agente_id(id, nome)
        `)
        .eq("clinica_id", clinicaId)
        .in("status", ["aguardando", "em_atendimento"])
        .order("data_abertura", { ascending: false });

      if (error) throw error;
      setAtendimentos((data || []) as OmniAtendimento[]);
    } catch (error) {
      console.error("Error fetching atendimentos:", error);
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchAtendimentos();

    if (clinicaId) {
      const channel = supabase
        .channel(`omni_chat_${clinicaId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "omni_atendimentos",
            filter: `clinica_id=eq.${clinicaId}`,
          },
          () => {
            fetchAtendimentos();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [clinicaId, fetchAtendimentos]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // Update wait time every second
  useEffect(() => {
    if (!selectedAtendimento) return;
    
    const updateWaitTime = () => {
      setWaitTimeDisplay(formatWaitTime(selectedAtendimento.data_abertura));
    };
    
    updateWaitTime();
    const interval = setInterval(updateWaitTime, 1000);
    return () => clearInterval(interval);
  }, [selectedAtendimento]);

  // Filter conversations
  const filteredAtendimentos = useMemo(() => {
    let filtered = atendimentos;
    
    // Filter by tab
    if (activeTab === "waiting") {
      filtered = filtered.filter((a) => a.status === "aguardando");
    } else if (activeTab === "mine") {
      filtered = filtered.filter((a) => a.agente_id === currentUser?.usuarioClinicaId);
    }
    
    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.contato?.nome?.toLowerCase().includes(search) ||
          a.contato?.telefone?.includes(search)
      );
    }
    
    return filtered;
  }, [atendimentos, searchTerm, activeTab, currentUser?.usuarioClinicaId]);

  // Agentes for transfer modal
  const [agentes, setAgentes] = useState<Array<{ id: string; nome: string }>>([]);
  useEffect(() => {
    const loadAgentes = async () => {
      if (!clinicaId) return;
      const { data } = await supabase
        .from("usuarios_clinica")
        .select("id, nome")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);
      if (data) setAgentes(data);
    };
    loadAgentes();
  }, [clinicaId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedAtendimento || !currentUser?.usuarioClinicaId) return;
    
    setSending(true);
    try {
      await enviarMensagem(
        currentUser.usuarioClinicaId,
        "texto",
        messageInput.trim()
      );
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFinalizarAtendimento = async () => {
    if (!selectedAtendimento) return;
    
    try {
      const tempoTotal = selectedAtendimento.data_abertura
        ? Math.floor((Date.now() - new Date(selectedAtendimento.data_abertura).getTime()) / 1000)
        : null;

      await supabase
        .from("omni_atendimentos")
        .update({
          status: "finalizado",
          data_fechamento: new Date().toISOString(),
          motivo_fechamento: "Encerrado pelo agente",
          tempo_total_atendimento: tempoTotal,
        })
        .eq("id", selectedAtendimento.id);

      setSelectedAtendimento(null);
      fetchAtendimentos();
    } catch (error) {
      console.error("Error finalizing atendimento:", error);
    }
  };

  const handleTransferirAtendimento = async (
    atendimentoId: string,
    novoAgenteId?: string,
    novaFilaId?: string
  ) => {
    try {
      const atendimento = atendimentos.find((a) => a.id === atendimentoId);
      if (!atendimento) return;

      await supabase
        .from("omni_atendimentos")
        .update({
          agente_id: novoAgenteId || null,
          fila_id: novaFilaId || atendimento.fila_id,
          status: novoAgenteId ? "em_atendimento" : "aguardando",
        })
        .eq("id", atendimentoId);

      fetchAtendimentos();
    } catch (error) {
      console.error("Error transferring atendimento:", error);
    }
  };

  if (loading) {
    return (
      <OmniLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OmniLayout>
    );
  }

  return (
    <OmniLayout>
      <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg border shadow-sm overflow-hidden">
        {/* Sidebar - Lista de Conversas */}
        <div className="w-80 border-r flex flex-col bg-white">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar"
                className="pl-9 bg-gray-50 border-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-2 border-b">
            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setActiveTab("all")}
            >
              <Filter className="h-3 w-3 mr-1" />
              Todos
            </Button>
            <Button
              variant={activeTab === "waiting" ? "default" : "ghost"}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setActiveTab("waiting")}
            >
              <Clock className="h-3 w-3 mr-1" />
              Na fila
            </Button>
            <Button
              variant={activeTab === "mine" ? "default" : "ghost"}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setActiveTab("mine")}
            >
              <Users className="h-3 w-3 mr-1" />
              Meus
            </Button>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1">
            {filteredAtendimentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <MessageCircle className="h-10 w-10 mb-2" />
                <p className="text-sm">Nenhuma conversa</p>
              </div>
            ) : (
              filteredAtendimentos.map((atendimento) => (
                <ConversationItem
                  key={atendimento.id}
                  atendimento={atendimento}
                  isSelected={selectedAtendimento?.id === atendimento.id}
                  onClick={() => setSelectedAtendimento(atendimento)}
                  unreadCount={0}
                />
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#E5DDD5]">
          {selectedAtendimento ? (
            <>
              {/* Chat header */}
              <div className="bg-[#075E54] text-white px-4 py-2 flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white/20">
                  <AvatarImage src={selectedAtendimento.contato?.foto_url || undefined} />
                  <AvatarFallback className="bg-gray-300 text-gray-700">
                    {getInitials(selectedAtendimento.contato?.nome || "?")}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    {selectedAtendimento.contato?.nome || selectedAtendimento.contato?.telefone}
                  </h3>
                  <p className="text-xs text-white/70">
                    {selectedAtendimento.contato?.telefone}
                    {selectedAtendimento.fila && ` • ${selectedAtendimento.fila.nome}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-xs text-white/70">Aberto a:</p>
                    <p className="font-mono text-sm">{waitTimeDisplay}</p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10"
                    onClick={() => setTransferirModalOpen(true)}
                    title="Transferir"
                  >
                    <ArrowRightLeft className="h-5 w-5" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleFinalizarAtendimento}>
                        Encerrar atendimento
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages area */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4be' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  <>
                    {mensagens.map((msg) => (
                      <MessageBubble key={msg.id} mensagem={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message input */}
              <div className="bg-[#F0F0F0] px-4 py-3 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                  <Smile className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                  <Paperclip className="h-6 w-6" />
                </Button>
                
                <Input
                  placeholder="Digite uma mensagem ou / para atalhos..."
                  className="flex-1 bg-white border-0 rounded-full"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                
                {messageInput.trim() ? (
                  <Button
                    size="icon"
                    className="bg-[#075E54] hover:bg-[#064E46] rounded-full"
                    onClick={handleSendMessage}
                    disabled={sending}
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                    <Mic className="h-6 w-6" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Empty state when no chat selected */
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#F0F2F5]">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                <MessageCircle className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-light text-gray-600 mb-2">Nenhum chat selecionado</h3>
              <p className="text-sm text-gray-400">
                Selecione uma conversa da lista para visualizar as mensagens
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      <TransferirAtendimentoModal
        open={transferirModalOpen}
        onClose={() => setTransferirModalOpen(false)}
        atendimento={selectedAtendimento}
        filas={filas}
        agentes={agentes}
        onTransferir={handleTransferirAtendimento}
      />
    </OmniLayout>
  );
}
