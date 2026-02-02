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
  Image as ImageIcon,
  FileText,
  Tag,
  PenLine,
  MessageSquareText,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOmniMensagens, OmniAtendimento, OmniMensagem } from "@/hooks/useOmniAtendimentos";
import { TransferirAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/TransferirAtendimentoModal";
import { EncerrarAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/EncerrarAtendimentoModal";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const isOptimistic = mensagem.id.startsWith("temp-");

  const renderStatus = () => {
    if (!isOutgoing) return null;
    if (isOptimistic) {
      return <Clock className="h-3.5 w-3.5 text-gray-400 animate-pulse" />;
    }
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
            : "bg-white text-gray-800 rounded-bl-none",
          isOptimistic && "opacity-70"
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
  const [encerrarModalOpen, setEncerrarModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "waiting" | "mine">("all");
  const [waitTimeDisplay, setWaitTimeDisplay] = useState("00:00:00");
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  
  // Local state for atendimentos to avoid hook conflicts
  const [atendimentos, setAtendimentos] = useState<OmniAtendimento[]>([]);
  const [loading, setLoading] = useState(true);
  // Optimistic messages state
  const [optimisticMessages, setOptimisticMessages] = useState<OmniMensagem[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { filas } = useOmniFilas(clinicaId);
  const { mensagens, loading: loadingMessages, enviarMensagem } = useOmniMensagens(selectedAtendimento?.id || null);

  // Clear optimistic messages when real messages arrive
  useEffect(() => {
    if (mensagens.length > 0 && optimisticMessages.length > 0) {
      // Check if any optimistic message content matches a real message within 5 seconds
      const now = new Date().getTime();
      const recentRealMessages = mensagens.filter(m => {
        const msgTime = new Date(m.created_at).getTime();
        return now - msgTime < 10000; // 10 seconds window
      });
      
      if (recentRealMessages.length > 0) {
        setOptimisticMessages(prev => 
          prev.filter(optMsg => {
            // Keep optimistic if no matching real message found
            const hasMatch = recentRealMessages.some(realMsg => 
              realMsg.conteudo === optMsg.conteudo && 
              realMsg.direcao === "saida"
            );
            return !hasMatch;
          })
        );
      }
    }
  }, [mensagens]);

  // Combine real messages with optimistic messages (avoiding duplicates by content)
  const allMessages = useMemo(() => {
    // Filter out optimistic messages that match real messages by content
    const realContents = new Set(
      mensagens
        .filter(m => m.direcao === "saida")
        .map(m => m.conteudo)
    );
    const pendingOptimistic = optimisticMessages.filter(m => !realContents.has(m.conteudo));
    
    return [...mensagens, ...pendingOptimistic].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [mensagens, optimisticMessages]);

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
  }, [allMessages]);

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

  // Optimistic message sending
  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage || !selectedAtendimento || !currentUser?.usuarioClinicaId) return;
    if (sending) return; // Prevent double send

    // Clear input immediately for instant feedback
    setMessageInput("");
    setSending(true);

    // Create optimistic message
    const optimisticMsg: OmniMensagem = {
      id: `temp-${Date.now()}`,
      atendimento_id: selectedAtendimento.id,
      contato_id: null,
      agente_id: currentUser.usuarioClinicaId,
      tipo: "texto",
      direcao: "saida",
      conteudo: trimmedMessage,
      arquivo_url: null,
      arquivo_nome: null,
      arquivo_tipo: null,
      whatsapp_message_id: null,
      status: "enviada",
      erro_descricao: null,
      created_at: new Date().toISOString(),
    };

    // Add optimistic message immediately
    setOptimisticMessages(prev => [...prev, optimisticMsg]);

    // Focus back on input
    inputRef.current?.focus();

    try {
      await enviarMensagem(
        currentUser.usuarioClinicaId,
        "texto",
        trimmedMessage
      );
      // Remove optimistic message after real message arrives (handled by allMessages memo)
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
      // Remove failed optimistic message
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      // Restore the message to input
      setMessageInput(trimmedMessage);
    } finally {
      setSending(false);
    }
  }, [messageInput, selectedAtendimento, currentUser?.usuarioClinicaId, sending, enviarMensagem]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleFinalizarAtendimento = async (
    motivoFechamento: string,
    dataReabertura?: Date,
    mensagemReabertura?: string
  ) => {
    if (!selectedAtendimento) return;
    
    try {
      const tempoTotal = selectedAtendimento.data_abertura
        ? Math.floor((Date.now() - new Date(selectedAtendimento.data_abertura).getTime()) / 1000)
        : null;

      const updateData: Record<string, unknown> = {
        status: "finalizado",
        data_fechamento: new Date().toISOString(),
        motivo_fechamento: motivoFechamento,
        tempo_total_atendimento: tempoTotal,
      };

      // Add reopening data if scheduled
      if (dataReabertura) {
        updateData.data_reabertura = dataReabertura.toISOString();
        updateData.mensagem_reabertura = mensagemReabertura || null;
        updateData.reabertura_agendada = true;
      }

      await supabase
        .from("omni_atendimentos")
        .update(updateData)
        .eq("id", selectedAtendimento.id);

      setSelectedAtendimento(null);
      fetchAtendimentos();
      toast.success(
        dataReabertura 
          ? "Atendimento encerrado com reabertura agendada" 
          : "Atendimento encerrado com sucesso"
      );
    } catch (error) {
      console.error("Error finalizing atendimento:", error);
      toast.error("Erro ao encerrar atendimento");
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
      toast.success("Atendimento transferido com sucesso");
    } catch (error) {
      console.error("Error transferring atendimento:", error);
      toast.error("Erro ao transferir atendimento");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background -m-4 sm:-m-6">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 border-r flex flex-col bg-card">
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
        <div className="flex-1 flex flex-col bg-muted/30">
          {selectedAtendimento ? (
            <>
              {/* Chat header - Blue theme */}
              <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
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
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/10"
                        onClick={() => setTransferirModalOpen(true)}
                      >
                        <ArrowRightLeft className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Transferir atendimento</TooltipContent>
                  </Tooltip>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => toast.info("Busca de mensagens em breve!")}>
                        <Search className="h-4 w-4 mr-2" />
                        Pesquisar mensagens
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Ver mídias em breve!")}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Ver mídias
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Ver documentos em breve!")}>
                        <FileText className="h-4 w-4 mr-2" />
                        Ver documentos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setTransferirModalOpen(true)}>
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transferir chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Etiquetas em breve!")}>
                        <Tag className="h-4 w-4 mr-2" />
                        Adicionar etiqueta
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setEncerrarModalOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
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
                ) : allMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  <>
                    {allMessages.map((msg) => (
                      <MessageBubble key={msg.id} mensagem={msg} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message input */}
              <div className="bg-[#F0F0F0] px-4 py-3 flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                      <Smile className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Emoji</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                      <Paperclip className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Anexar arquivo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => toast.info("Respostas rápidas em breve!")}
                    >
                      <MessageSquareText className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Respostas rápidas</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "text-gray-500 hover:text-gray-700",
                        signatureEnabled && "text-primary hover:text-primary"
                      )}
                      onClick={() => {
                        setSignatureEnabled(!signatureEnabled);
                        toast.info(signatureEnabled ? "Assinatura desabilitada para esta mensagem" : "Assinatura habilitada");
                      }}
                    >
                      <PenLine className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {signatureEnabled ? "Assinatura habilitada" : "Assinatura desabilitada"}
                  </TooltipContent>
                </Tooltip>
                
                <Input
                  ref={inputRef}
                  placeholder="Digite uma mensagem ou / para atalhos..."
                  className="flex-1 bg-white border-0 rounded-full"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
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

      {/* Transfer Modal */}
      <TransferirAtendimentoModal
        open={transferirModalOpen}
        onClose={() => setTransferirModalOpen(false)}
        atendimento={selectedAtendimento}
        filas={filas}
        agentes={agentes}
        onTransferir={handleTransferirAtendimento}
      />

      {/* Encerrar Modal */}
      <EncerrarAtendimentoModal
        open={encerrarModalOpen}
        onClose={() => setEncerrarModalOpen(false)}
        atendimento={selectedAtendimento}
        onEncerrar={handleFinalizarAtendimento}
      />
    </div>
  );
}
