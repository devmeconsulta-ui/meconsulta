import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  ArrowDownCircle,
  ChevronLeft,
  Tag,
  UserPlus,
  ArrowRightLeft,
  XCircle,
  Clock,
  Loader2,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Filter,
  MessageSquare,
  FileText,
  PenLine,
  MessageSquareText,
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
import { useOmniAtendimentos, useOmniMensagens, OmniAtendimento, OmniMensagem } from "@/hooks/useOmniAtendimentos";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { useTrackAgentPresence } from "@/hooks/useAgentPresence";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransferirAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/TransferirAtendimentoModal";
import { EncerrarAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/EncerrarAtendimentoModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AtendenteContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  usuarioClinicaData: { id: string; nome: string } | null;
  currentUser: { id: string; nome: string } | null;
}

export default function AtendenteChat() {
  const { clinicaData, usuarioClinicaData } = useOutletContext<AtendenteContext>();
  const clinicaId = clinicaData?.id || null;
  const agenteId = usuarioClinicaData?.id;
  
  // Track agent presence - this makes the current user appear as online
  useTrackAgentPresence(
    clinicaId,
    agenteId || null,
    usuarioClinicaData?.nome || null
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAtendimento, setSelectedAtendimento] = useState<OmniAtendimento | null>(null);
  const [mensagemInput, setMensagemInput] = useState("");
  const [sending, setSending] = useState(false);
  const [transferirModalOpen, setTransferirModalOpen] = useState(false);
  const [encerrarModalOpen, setEncerrarModalOpen] = useState(false);
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [optimisticMessages, setOptimisticMessages] = useState<OmniMensagem[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch atendimentos - no specific agent filter, we filter locally for flexibility
  const {
    atendimentos: allAtendimentos,
    loading: loadingAtendimentos,
    transferirAtendimento,
    finalizarAtendimento,
  } = useOmniAtendimentos(clinicaId, {
    status: ["aguardando", "em_atendimento"],
  });

  const { filas } = useOmniFilas(clinicaId);

  // Fetch mensagens do atendimento selecionado
  const {
    mensagens,
    loading: loadingMensagens,
    enviarMensagem,
  } = useOmniMensagens(selectedAtendimento?.id || null);

  // Combine real messages with optimistic messages
  const allMessages = useMemo(() => {
    const realMessageIds = new Set(mensagens.map(m => m.id));
    const pendingOptimistic = optimisticMessages.filter(m => !realMessageIds.has(m.id.replace("temp-", "")));
    return [...mensagens, ...pendingOptimistic].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [mensagens, optimisticMessages]);

  // Filter atendimentos - agents can ONLY see atendimentos assigned to them
  // They cannot see unassigned/waiting atendimentos
  const atendimentos = useMemo(() => {
    if (!agenteId) return allAtendimentos;
    
    return allAtendimentos.filter((a) => a.agente_id === agenteId);
  }, [allAtendimentos, agenteId]);

  // Filtrar atendimentos por busca
  const filteredAtendimentos = useMemo(() => {
    if (!searchTerm) return atendimentos;
    const search = searchTerm.toLowerCase();
    return atendimentos.filter((a) =>
      a.contato?.nome?.toLowerCase().includes(search) ||
      a.contato?.telefone?.includes(search)
    );
  }, [atendimentos, searchTerm]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  // Formatar data da mensagem
  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, "HH:mm");
    }
    if (isYesterday(date)) {
      return `Ontem ${format(date, "HH:mm")}`;
    }
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  // Formatar última mensagem na lista
  const formatLastMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, "HH:mm");
    }
    if (isYesterday(date)) {
      return "Ontem";
    }
    return format(date, "dd/MM", { locale: ptBR });
  };

  // Calcular tempo de espera
  const getWaitTime = (dateStr: string) => {
    const mins = differenceInMinutes(new Date(), new Date(dateStr));
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h${remainingMins > 0 ? ` ${remainingMins}min` : ""}`;
  };

  // Optimistic message sending
  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = mensagemInput.trim();
    if (!trimmedMessage || !agenteId || !selectedAtendimento) return;
    if (sending) return; // Prevent double send

    // Clear input immediately for instant feedback
    setMensagemInput("");
    setSending(true);

    // Create optimistic message
    const optimisticMsg: OmniMensagem = {
      id: `temp-${Date.now()}`,
      atendimento_id: selectedAtendimento.id,
      contato_id: null,
      agente_id: agenteId,
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
        agenteId,
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
      setMensagemInput(trimmedMessage);
    } finally {
      setSending(false);
    }
  }, [mensagemInput, selectedAtendimento, agenteId, sending, enviarMensagem]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Encerrar atendimento with options
  const handleEncerrar = async (
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
      toast.success(
        dataReabertura 
          ? "Atendimento encerrado com reabertura agendada" 
          : "Atendimento encerrado"
      );
    } catch (error) {
      console.error("Error finalizing atendimento:", error);
      toast.error("Erro ao encerrar atendimento");
    }
  };

  // Get agentes for transfer modal
  const [agentes, setAgentes] = useState<Array<{ id: string; nome: string; atendimentos_count?: number }>>([]);
  
  // Load agentes for transfer modal
  useEffect(() => {
    const loadAgentes = async () => {
      if (!clinicaId) return;
      
      const { data: usuariosData } = await supabase
        .from("usuarios_clinica")
        .select("id, nome")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);
      
      if (usuariosData) {
        // Count atendimentos per agent
        const { data: atendimentosData } = await supabase
          .from("omni_atendimentos")
          .select("agente_id")
          .eq("clinica_id", clinicaId)
          .in("status", ["aguardando", "em_atendimento"]);
        
        const countByAgent = (atendimentosData || []).reduce((acc, a) => {
          if (a.agente_id) {
            acc[a.agente_id] = (acc[a.agente_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        setAgentes(
          usuariosData.map((u) => ({
            ...u,
            atendimentos_count: countByAgent[u.id] || 0,
          }))
        );
      }
    };
    loadAgentes();
  }, [clinicaId]);

  const loading = loadingAtendimentos;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] bg-background rounded-lg border overflow-hidden">
      {/* Sidebar - Lista de conversas */}
      <div className={cn(
        "w-80 border-r flex flex-col bg-card",
        selectedAtendimento && "hidden md:flex"
      )}>
        {/* Header da sidebar */}
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar"
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs flex-1">
              <Filter className="w-3 h-3 mr-1" />
              Filtros
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs flex-1">
              <Tag className="w-3 h-3 mr-1" />
              Etiquetas
            </Button>
          </div>
        </div>

        {/* Lista de atendimentos */}
        <ScrollArea className="flex-1">
          {filteredAtendimentos.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nenhum atendimento encontrado
            </div>
          ) : (
            filteredAtendimentos.map((atendimento) => (
              <div
                key={atendimento.id}
                className={cn(
                  "flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b transition-colors",
                  selectedAtendimento?.id === atendimento.id && "bg-muted"
                )}
                onClick={() => setSelectedAtendimento(atendimento)}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={atendimento.contato?.foto_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {atendimento.contato?.nome?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">
                      {atendimento.contato?.nome || atendimento.contato?.telefone || "Desconhecido"}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatLastMessageTime(atendimento.data_abertura)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {atendimento.status === "aguardando" 
                      ? "Aguardando atendimento..." 
                      : "Em atendimento"}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    {atendimento.fila && (
                      <Badge 
                        variant="outline" 
                        className="text-xs h-5 px-1.5"
                        style={{ borderColor: atendimento.fila.cor }}
                      >
                        {atendimento.fila.nome}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getWaitTime(atendimento.data_abertura)}
                    </span>
                  </div>
                </div>

                {atendimento.status === "aguardando" && (
                  <Badge variant="secondary" className="shrink-0 bg-yellow-100 text-yellow-800">
                    Novo
                  </Badge>
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Área principal - Chat */}
      {selectedAtendimento ? (
        <div className="flex-1 flex flex-col">
          {/* Header do chat */}
          <div className="p-3 border-b flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedAtendimento(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedAtendimento.contato?.foto_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedAtendimento.contato?.nome?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="font-semibold">
                  {selectedAtendimento.contato?.nome || "Desconhecido"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedAtendimento.contato?.telefone || "Sem telefone"} • Protocolo #{selectedAtendimento.protocolo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Vincular paciente</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setTransferirModalOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Transferir</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
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

          {/* Área de mensagens */}
          <ScrollArea className="flex-1 p-4 bg-muted/30">
            {loadingMensagens ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">
                  Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allMessages.map((msg, index) => {
                  const isOutgoing = msg.direcao === "saida";
                  const isOptimistic = msg.id.startsWith("temp-");
                  const showDate = index === 0 || 
                    format(new Date(allMessages[index - 1].created_at), "yyyy-MM-dd") !== 
                    format(new Date(msg.created_at), "yyyy-MM-dd");

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {isToday(new Date(msg.created_at))
                              ? "Hoje"
                              : isYesterday(new Date(msg.created_at))
                              ? "Ontem"
                              : format(new Date(msg.created_at), "dd 'de' MMMM", { locale: ptBR })}
                          </Badge>
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "flex",
                          isOutgoing ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg p-3 shadow-sm",
                            isOutgoing
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-card border rounded-bl-sm",
                            isOptimistic && "opacity-70"
                          )}
                        >
                          {msg.tipo === "texto" && (
                            <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                          )}
                          
                          {msg.tipo === "imagem" && (
                            <img
                              src={msg.arquivo_url || ""}
                              alt="Imagem"
                              className="max-w-full rounded"
                            />
                          )}

                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            isOutgoing ? "justify-end" : "justify-start"
                          )}>
                            <span className={cn(
                              "text-xs",
                              isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {format(new Date(msg.created_at), "HH:mm")}
                            </span>
                            
                            {isOutgoing && (
                              isOptimistic ? (
                                <Clock className="w-3 h-3 text-primary-foreground/70 animate-pulse" />
                              ) : msg.status === "lida" ? (
                                <CheckCheck className="w-3 h-3 text-blue-400" />
                              ) : msg.status === "entregue" ? (
                                <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                              ) : (
                                <Check className="w-3 h-3 text-primary-foreground/70" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Indicador de mensagens não lidas */}
          {allMessages.length > 5 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
              <Button
                size="sm"
                variant="secondary"
                className="gap-2 shadow-lg"
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                <ArrowDownCircle className="w-4 h-4" />
                Mensagens não lidas
              </Button>
            </div>
          )}

          {/* Input de mensagem */}
          <div className="p-3 border-t bg-card">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Emoji</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Anexar arquivo</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0"
                    onClick={() => toast.info("Respostas rápidas em breve!")}
                  >
                    <MessageSquareText className="h-4 w-4 text-muted-foreground" />
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
                      "shrink-0",
                      signatureEnabled && "text-primary"
                    )}
                    onClick={() => {
                      setSignatureEnabled(!signatureEnabled);
                      toast.info(signatureEnabled ? "Assinatura desabilitada para esta mensagem" : "Assinatura habilitada");
                    }}
                  >
                    <PenLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {signatureEnabled ? "Assinatura habilitada" : "Assinatura desabilitada"}
                </TooltipContent>
              </Tooltip>

              <Input
                ref={inputRef}
                placeholder="Digite uma mensagem ou / para atalhos..."
                className="flex-1"
                value={mensagemInput}
                onChange={(e) => setMensagemInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!mensagemInput.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Selecione uma conversa</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha um atendimento da lista para iniciar
            </p>
          </div>
        </div>
      )}

      {/* Modal de transferir */}
      <TransferirAtendimentoModal
        open={transferirModalOpen}
        onClose={() => setTransferirModalOpen(false)}
        atendimento={selectedAtendimento}
        filas={filas}
        agentes={agentes}
        onTransferir={transferirAtendimento}
      />

      {/* Modal de encerrar */}
      <EncerrarAtendimentoModal
        open={encerrarModalOpen}
        onClose={() => setEncerrarModalOpen(false)}
        atendimento={selectedAtendimento}
        onEncerrar={handleEncerrar}
      />
    </div>
  );
}
