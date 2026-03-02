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
  Bell,
  User,
  Bot,
  Plus,
  Copy,
  Pencil,
  Forward,
  Download,
  Trash2,
  History,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOmniMensagens, OmniAtendimento, OmniMensagem } from "@/hooks/useOmniAtendimentos";
import { useOmniNotasInternas, OmniNotaInterna } from "@/hooks/useOmniNotasInternas";
import { useOmniEtiquetas } from "@/hooks/useOmniEtiquetas";
import { TransferirAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/TransferirAtendimentoModal";
import { EncerrarAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/EncerrarAtendimentoModal";
import { SearchMessagesPanel } from "@/components/clinica/omnichannel/SearchMessagesPanel";
import { MediaGalleryModal } from "@/components/clinica/omnichannel/MediaGalleryModal";
import { DocumentsModal } from "@/components/clinica/omnichannel/DocumentsModal";
import { EtiquetasModal } from "@/components/clinica/omnichannel/EtiquetasModal";
import { NotaInternaModal } from "@/components/clinica/omnichannel/NotaInternaModal";
import { TypingBubble } from "@/components/clinica/omnichannel/TypingIndicator";
import { AudioRecorder } from "@/components/clinica/omnichannel/AudioRecorder";
import { AudioPlayerWithFallback } from "@/components/clinica/omnichannel/AudioPlayerWithFallback";
import { NovoAtendimentoModal } from "@/components/clinica/omnichannel/NovoAtendimentoModal";
import { EditarContatoOmniModal } from "@/components/clinica/omnichannel/EditarContatoOmniModal";
import { EncaminharMensagemModal } from "@/components/clinica/omnichannel/EncaminharMensagemModal";
import { RespostasRapidasModal } from "@/components/clinica/omnichannel/RespostasRapidasModal";
import { useTypingIndicator, useAITypingIndicator } from "@/hooks/useTypingIndicator";
import { useOmniFilas } from "@/hooks/useOmniFilas";

import { cn } from "@/lib/utils";
import { displayContactName, formatPhoneDisplay } from "@/lib/maskUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { 
    id: string; 
    nome: string; 
    usuarioClinicaId?: string; 
    tipo?: string; 
    email?: string;
    isClinicaUser?: boolean;
    papel?: string;
  } | null;
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

// Internal note alert component
function NotaInternaAlert({ nota, onMarcarLida }: { nota: OmniNotaInterna; onMarcarLida?: () => void }) {
  const formattedTime = format(new Date(nota.created_at), "HH:mm", { locale: ptBR });

  return (
    <div 
      className={cn(
        "flex justify-center my-2",
        !nota.lida && "animate-pulse"
      )}
      onClick={onMarcarLida}
    >
      <div className="max-w-[85%] rounded-lg px-4 py-3 bg-sky-100 border border-sky-200 shadow-sm cursor-pointer hover:bg-sky-50 transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-sky-600" />
          <span className="text-xs font-semibold text-sky-700">
            {nota.criado_por_nome} escreveu:
          </span>
          <span className="text-[10px] text-sky-500 ml-auto">{formattedTime}</span>
        </div>
        <p className="text-sm text-sky-800">{nota.mensagem}</p>
        {!nota.lida && (
          <p className="text-[10px] text-sky-500 mt-1 text-right">Clique para marcar como lida</p>
        )}
      </div>
    </div>
  );
}

// Image preview modal component
function ImagePreviewModal({ url, open, onClose }: { url: string; open: boolean; onClose: () => void }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `imagem_${Date.now()}.${blob.type.split("/")[1] || "jpg"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download iniciado");
    } catch {
      toast.error("Erro ao baixar imagem");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <Button size="icon" variant="secondary" className="rounded-full h-9 w-9" onClick={handleDownload} title="Baixar">
            <Download className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="secondary" className="rounded-full h-9 w-9" onClick={onClose} title="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <img src={url} alt="Visualização" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
      </div>
    </div>
  );
}

// Message bubble component
function MessageBubble({ 
  mensagem, 
  showSignature,
  isFirstAgentMessage,
  onForward,
  onEdit,
  onDelete,
}: { 
  mensagem: OmniMensagem; 
  showSignature?: boolean;
  isFirstAgentMessage?: boolean;
  onForward?: (msg: OmniMensagem) => void;
  onEdit?: (msg: OmniMensagem) => void;
  onDelete?: (msg: OmniMensagem) => void;
}) {
  const isOutgoing = mensagem.direcao === "saida";
  const formattedTime = format(new Date(mensagem.created_at), "HH:mm", { locale: ptBR });
  const isOptimistic = mensagem.id.startsWith("temp-");
  const agenteName = mensagem.agente_nome;
  const [showActions, setShowActions] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const handleCopy = () => {
    if (mensagem.conteudo) {
      navigator.clipboard.writeText(mensagem.conteudo);
      toast.success("Mensagem copiada");
    }
  };

  const renderStatus = () => {
    if (!isOutgoing) return null;
    if (isOptimistic) {
      return <Clock className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />;
    }
    if (mensagem.status === "lida") {
      return <CheckCheck className="h-3.5 w-3.5 text-primary" />;
    } else if (mensagem.status === "entregue") {
      return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div 
      className={cn("flex group relative", isOutgoing ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { if (!dropdownOpen) setShowActions(false); }}
    >
      {/* Action buttons - appear on hover */}
      {(showActions || dropdownOpen) && !isOptimistic && (
        <div className={cn(
          "flex items-center gap-0.5 self-center",
          isOutgoing ? "order-first mr-1" : "order-last ml-1"
        )}>
          <DropdownMenu open={dropdownOpen} onOpenChange={(open) => {
            setDropdownOpen(open);
            if (!open) setShowActions(false);
          }}>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOutgoing ? "end" : "start"} className="min-w-[160px] z-50">
              {mensagem.conteudo && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="gap-2 text-sm">
                  <Copy className="h-4 w-4" /> Copiar
                </DropdownMenuItem>
              )}
              {isOutgoing && mensagem.tipo === "texto" && mensagem.conteudo && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(mensagem); }} className="gap-2 text-sm">
                  <Pencil className="h-4 w-4" /> Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onForward?.(mensagem); }} className="gap-2 text-sm">
                <Forward className="h-4 w-4" /> Encaminhar
              </DropdownMenuItem>
              {isOutgoing && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(mensagem); }} 
                  className="gap-2 text-sm text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Apagar para todos
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
          isOutgoing
            ? "bg-[#DCF8C6] text-foreground rounded-br-none"
            : "bg-card text-foreground rounded-bl-none",
          isOptimistic && "opacity-70"
        )}
      >
        {/* Welcome message on first agent message */}
        {isFirstAgentMessage && isOutgoing && agenteName && (
          <p className="text-xs italic text-muted-foreground mb-1">
            Você está sendo atendido por {agenteName}
          </p>
        )}
        
        {/* Agent signature in bold */}
        {showSignature && isOutgoing && agenteName && !isFirstAgentMessage && (
          <p className="text-xs font-bold text-foreground/80 mb-1">
            {agenteName}
          </p>
        )}
        
        {mensagem.tipo === "audio" && mensagem.arquivo_url && (
          <div className="relative">
            <AudioPlayerWithFallback 
              url={mensagem.arquivo_url} 
              isOutgoing={isOutgoing}
            />
            {/* Status overlay on audio play button */}
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
              {renderStatus()}
            </div>
          </div>
        )}
        {mensagem.tipo === "imagem" && mensagem.arquivo_url && (
          <>
            <img
              src={mensagem.arquivo_url}
              alt="Imagem"
              className="rounded max-w-[250px] max-h-[250px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setImagePreviewOpen(true)}
            />
            <ImagePreviewModal
              url={mensagem.arquivo_url}
              open={imagePreviewOpen}
              onClose={() => setImagePreviewOpen(false)}
            />
          </>
        )}
        {mensagem.tipo === "video" && mensagem.arquivo_url && (
          <video controls src={mensagem.arquivo_url} className="rounded max-w-[300px]" />
        )}
        {mensagem.tipo === "documento" && mensagem.arquivo_url && (
          <a href={mensagem.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            {mensagem.arquivo_nome || "Documento"}
          </a>
        )}
        {(mensagem.tipo === "texto" || mensagem.conteudo) && mensagem.tipo !== "audio" && (
          <div>
            {mensagem.encaminhada && (
              <div className="flex items-center gap-1 mb-1">
                <Forward className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs italic text-muted-foreground">Encaminhada</span>
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap">{mensagem.conteudo}</p>
          </div>
        )}
        {mensagem.tipo !== "audio" && (
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
            {renderStatus()}
          </div>
        )}
      </div>
    </div>
  );
}
// Conversation item component
function ConversationItem({
  atendimento,
  isSelected,
  onClick,
  unreadCount,
  allEtiquetas,
}: {
  atendimento: OmniAtendimento;
  isSelected: boolean;
  onClick: () => void;
  unreadCount?: number;
  allEtiquetas?: Array<{ id: string; nome: string; cor: string }>;
}) {
  const contactName = displayContactName(atendimento.contato?.nome, atendimento.contato?.telefone);
  const waitTime = formatWaitTime(atendimento.data_abertura);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted border-b border-border transition-colors",
        isSelected && "bg-muted"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={atendimento.contato?.foto_url || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        {atendimento.status === "em_atendimento" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{contactName}</span>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{waitTime}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-muted-foreground truncate max-w-[160px]">
            {atendimento.status === "aguardando" ? "Aguardando atendimento..." : "Em atendimento"}
          </p>
          {unreadCount != null && unreadCount > 0 && (
            <Badge className="bg-green-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full">
              {unreadCount}
            </Badge>
          )}
        </div>
        {/* Show labels */}
        {atendimento.etiquetas && atendimento.etiquetas.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {atendimento.etiquetas.slice(0, 2).map((tag) => {
              const etq = allEtiquetas?.find(e => e.nome === tag);
              return (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[9px] h-4 px-1 text-white"
                  style={{ backgroundColor: etq?.cor || "#6b7280" }}
                >
                  {tag}
                </Badge>
              );
            })}
            {atendimento.etiquetas.length > 2 && (
              <Badge variant="outline" className="text-[9px] h-4 px-1">
                +{atendimento.etiquetas.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Main chat component
export default function OmniWhatsAppChat() {
  const { clinicaData, currentUser } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;

  // Check if user is clinic admin (owner, not employee)
  // Clinic employees have isClinicaUser: true from auth
  // Clinic owners have tipo: "clinica" but NOT isClinicaUser: true
  const isClinicaAdmin = currentUser?.tipo === "clinica" && !currentUser?.isClinicaUser;
  
  // Presence is tracked at the ClinicaLayout level
  // Debug log for data isolation
  console.log("[OmniWhatsAppChat] User context:", {
    id: currentUser?.id,
    nome: currentUser?.nome,
    tipo: currentUser?.tipo,
    isClinicaUser: currentUser?.isClinicaUser,
    usuarioClinicaId: currentUser?.usuarioClinicaId,
    isClinicaAdmin,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAtendimento, setSelectedAtendimento] = useState<OmniAtendimento | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [transferirModalOpen, setTransferirModalOpen] = useState(false);
  const [encerrarModalOpen, setEncerrarModalOpen] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [etiquetasModalOpen, setEtiquetasModalOpen] = useState(false);
  const [notaInternaModalOpen, setNotaInternaModalOpen] = useState(false);
  const [novoAtendimentoModalOpen, setNovoAtendimentoModalOpen] = useState(false);
  const [editarContatoModalOpen, setEditarContatoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "waiting" | "mine">("all");
  const [filterEtiqueta, setFilterEtiqueta] = useState<string | null>(null);
  const [encerrarTodosOpen, setEncerrarTodosOpen] = useState(false);
  const [waitTimeDisplay, setWaitTimeDisplay] = useState("00:00:00");
  const [editingMessage, setEditingMessage] = useState<OmniMensagem | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<OmniMensagem | null>(null);
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [respostasRapidasOpen, setRespostasRapidasOpen] = useState(false);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [iaConversaStatus, setIaConversaStatus] = useState<{ humano_assumiu: boolean; id: string } | null>(null);
  
  // Local state for atendimentos
  const [atendimentos, setAtendimentos] = useState<OmniAtendimento[]>([]);
  const [loading, setLoading] = useState(true);
  // Optimistic messages state
  const [optimisticMessages, setOptimisticMessages] = useState<OmniMensagem[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { filas } = useOmniFilas(clinicaId);
  const { mensagens, historicoMensagens, loading: loadingMessages, enviarMensagem, editarMensagem, apagarMensagem } = useOmniMensagens(selectedAtendimento?.id || null);
  const { notas, criarNota, marcarComoLida } = useOmniNotasInternas(selectedAtendimento?.id || null);
  const { etiquetas, criarEtiqueta } = useOmniEtiquetas(clinicaId);
  
  // Typing indicators
  const { typingUsers, handleTypingStart, handleTypingStop } = useTypingIndicator({
    atendimentoId: selectedAtendimento?.id || null,
    currentUserId: currentUser?.usuarioClinicaId || currentUser?.id || null,
    currentUserNome: currentUser?.nome || null,
  });
  const { isAITyping, aiName } = useAITypingIndicator(selectedAtendimento?.id || null);
  
  // Combine all typing names for display
  const allTypingNames = useMemo(() => {
    const names: string[] = [];
    if (isAITyping && aiName) {
      names.push(aiName);
    }
    typingUsers.forEach(u => names.push(u.nome));
    return names;
  }, [typingUsers, isAITyping, aiName]);

  // Clear optimistic messages when real messages arrive
  useEffect(() => {
    if (mensagens.length > 0 && optimisticMessages.length > 0) {
      const now = new Date().getTime();
      const recentRealMessages = mensagens.filter(m => {
        const msgTime = new Date(m.created_at).getTime();
        return now - msgTime < 10000;
      });
      
      if (recentRealMessages.length > 0) {
        setOptimisticMessages(prev => 
          prev.filter(optMsg => {
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

  // Combine real messages with optimistic messages, applying local edits
  const allMessages = useMemo(() => {
    const editedMensagens = mensagens.map(m => 
      editedMessages[m.id] ? { ...m, conteudo: editedMessages[m.id] } : m
    );
    const realContents = new Set(
      editedMensagens
        .filter(m => m.direcao === "saida")
        .map(m => m.conteudo)
    );
    const pendingOptimistic = optimisticMessages.filter(m => !realContents.has(m.conteudo));
    
    // Include history from previous atendimentos
    const historyWithFlag = historicoMensagens.map(m => ({ ...m, _isHistory: true as const }));
    
    return [...historyWithFlag, ...editedMensagens, ...pendingOptimistic].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [mensagens, optimisticMessages, editedMessages, historicoMensagens]);

  // Combine messages and notes for display
  const combinedItems = useMemo(() => {
    const items: Array<{ type: 'message' | 'note'; data: OmniMensagem | OmniNotaInterna; timestamp: number }> = [];
    
    allMessages.forEach(msg => {
      items.push({ type: 'message', data: msg, timestamp: new Date(msg.created_at).getTime() });
    });
    
    notas.forEach(nota => {
      items.push({ type: 'note', data: nota, timestamp: new Date(nota.created_at).getTime() });
    });
    
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [allMessages, notas]);

  // Fetch atendimentos
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

  // Debounced refetch to prevent rapid successive fetches
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedFetchAtendimentos = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      fetchAtendimentos();
      refetchTimeoutRef.current = null;
    }, 1000);
  }, [fetchAtendimentos]);

  // Initial fetch and real-time subscription with optimistic local updates
  useEffect(() => {
    fetchAtendimentos();

    if (clinicaId) {
      const channel = supabase
        .channel(`omni_chat_${clinicaId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "omni_atendimentos",
            filter: `clinica_id=eq.${clinicaId}`,
          },
          () => {
            // New atendimento - must fetch to get joined data
            debouncedFetchAtendimentos();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "omni_atendimentos",
            filter: `clinica_id=eq.${clinicaId}`,
          },
          (payload) => {
            const updated = payload.new as any;
            // Optimistic local update - avoid full refetch
            setAtendimentos(prev => {
              // If status changed to finalizado/abandonado/encerrado, remove from list
              if (["finalizado", "abandonado", "encerrado"].includes(updated.status)) {
                return prev.filter(a => a.id !== updated.id);
              }
              // Otherwise update in-place keeping joined data
              const exists = prev.some(a => a.id === updated.id);
              if (exists) {
                return prev.map(a => 
                  a.id === updated.id 
                    ? { ...a, ...updated, contato: a.contato, fila: a.fila, agente: a.agente }
                    : a
                );
              }
              // New active atendimento not in list - fetch to get joins
              debouncedFetchAtendimentos();
              return prev;
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "omni_atendimentos",
            filter: `clinica_id=eq.${clinicaId}`,
          },
          (payload) => {
            setAtendimentos(prev => prev.filter(a => a.id !== (payload.old as any).id));
          }
        )
        .subscribe();

      return () => {
        if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
        supabase.removeChannel(channel);
      };
    }
  }, [clinicaId, fetchAtendimentos, debouncedFetchAtendimentos]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combinedItems]);

  // Update wait time
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
  // Filter conversations based on ownership rules:
  // - Clinic admins (tipo === "clinica" and NOT isClinicaUser) can see all atendimentos
  // - Agents can ONLY see atendimentos assigned to them (agente_id === their ID)
  const filteredAtendimentos = useMemo(() => {
    const usuarioClinicaId = currentUser?.usuarioClinicaId;
    
    // First filter by ownership (non-admin agents only see their own assigned)
    let filtered = atendimentos;
    
    if (!isClinicaAdmin && usuarioClinicaId) {
      // Agents can ONLY see atendimentos assigned to them
      // They cannot see unassigned/waiting atendimentos
      filtered = atendimentos.filter((a) => a.agente_id === usuarioClinicaId);
    }
    
    // Then apply tab filters
    if (activeTab === "waiting") {
      filtered = filtered.filter((a) => a.status === "aguardando");
    } else if (activeTab === "mine") {
      filtered = filtered.filter((a) => a.agente_id === usuarioClinicaId);
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.contato?.nome?.toLowerCase().includes(search) ||
          a.contato?.telefone?.includes(search)
      );
    }

    // Apply etiqueta filter
    if (filterEtiqueta) {
      filtered = filtered.filter(
        (a) => a.etiquetas && a.etiquetas.includes(filterEtiqueta)
      );
    }
    
    return filtered;
  }, [atendimentos, searchTerm, activeTab, currentUser?.usuarioClinicaId, isClinicaAdmin, filterEtiqueta]);

  // Agents for transfer modal
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

  // Get the agent ID to use for sending messages
  // For clinic employees: use usuarioClinicaId
  // For clinic owners: use usuarioClinicaId if available, otherwise allow sending without agent_id
  const getAgenteId = useCallback(() => {
    return currentUser?.usuarioClinicaId || null;
  }, [currentUser?.usuarioClinicaId]);

  // Handle edit message - populate input with message content
  const handleEditMessage = useCallback((msg: OmniMensagem) => {
    if (msg.conteudo) {
      setEditingMessage(msg);
      setMessageInput(msg.conteudo);
      inputRef.current?.focus();
    }
  }, []);

  // Handle forward message - open modal to select contact
  const handleForwardMessage = useCallback((msg: OmniMensagem) => {
    setForwardingMessage(msg);
  }, []);

  // Handle delete message
  const [deletingMessage, setDeletingMessage] = useState<OmniMensagem | null>(null);
  const handleDeleteMessage = useCallback((msg: OmniMensagem) => {
    setDeletingMessage(msg);
  }, []);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessageInput("");
  }, []);

  // Instant optimistic message sending - no waiting for API
  const handleSendMessage = useCallback(() => {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage || !selectedAtendimento) return;

    const agenteId = getAgenteId();
    const assinaturaNome = signatureEnabled ? currentUser?.nome || null : null;
    const isEditing = !!editingMessage;
    const editedMsgId = editingMessage?.id;

    // Clear input and editing state immediately
    setMessageInput("");
    setEditingMessage(null);
    handleTypingStop();

    if (isEditing && editedMsgId) {
      // Update existing message in-place (optimistic via local edits map)
      setEditedMessages(prev => ({ ...prev, [editedMsgId]: trimmedMessage }));
      // Also update in optimistic messages if present
      setOptimisticMessages(prev => prev.map(m =>
        m.id === editedMsgId ? { ...m, conteudo: trimmedMessage } : m
      ));
      inputRef.current?.focus();

      // Edit via edge function (updates DB + WhatsApp)
      editarMensagem(editedMsgId, trimmedMessage);
    } else {
      // Create optimistic message
      const optimisticMsg: OmniMensagem = {
        id: `temp-${Date.now()}`,
        atendimento_id: selectedAtendimento.id,
        contato_id: null,
        agente_id: agenteId,
        agente_nome: assinaturaNome,
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

      // Show message immediately in UI
      setOptimisticMessages(prev => [...prev, optimisticMsg]);
      inputRef.current?.focus();

      // Fire and forget - send in background without waiting
      enviarMensagem(agenteId, "texto", trimmedMessage, undefined, undefined, undefined, assinaturaNome);
    }
  }, [messageInput, selectedAtendimento, getAgenteId, currentUser?.nome, enviarMensagem, editarMensagem, signatureEnabled, handleTypingStop, editingMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Instant audio sending - no waiting for API
  const handleSendAudio = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!selectedAtendimento) return;
    
    const agenteId = getAgenteId();

    try {
      // Normalize the mime type (remove codecs info)
      let mimeType = audioBlob.type || 'audio/webm';
      if (mimeType.includes(';')) {
        mimeType = mimeType.split(';')[0];
      }
      
      // Determine file extension based on mime type
      const extension = mimeType === 'audio/ogg' ? 'ogg' : 
                       mimeType === 'audio/webm' ? 'webm' : 
                       mimeType === 'audio/mp4' ? 'm4a' : 'webm';
      
      // Upload audio to Supabase storage
      const fileName = `audio_${Date.now()}.${extension}`;
      const filePath = `omni/${selectedAtendimento.clinica_id}/${selectedAtendimento.id}/${fileName}`;
      
      console.log("[AudioUpload] Starting upload:", { 
        mimeType, 
        fileName, 
        filePath, 
        blobSize: audioBlob.size,
        blobType: audioBlob.type 
      });
      
      // Convert blob to ArrayBuffer for more reliable upload
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log("[AudioUpload] Converted to Uint8Array, size:", uint8Array.length);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("omni-files")
        .upload(filePath, uint8Array, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[AudioUpload] Upload error:", uploadError);
        
        // More specific error messages
        if (uploadError.message?.includes("Failed to fetch")) {
          toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
        } else if (uploadError.message?.includes("not authenticated")) {
          toast.error("Sessão expirada. Recarregue a página.");
        } else {
          toast.error("Erro ao fazer upload do áudio: " + (uploadError.message || "erro desconhecido"));
        }
        return;
      }

      console.log("[AudioUpload] Upload successful:", uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("omni-files")
        .getPublicUrl(filePath);

      console.log("[AudioUpload] Public URL:", publicUrl);

      // Create optimistic message - show immediately
      const optimisticMsg: OmniMensagem = {
        id: `temp-audio-${Date.now()}`,
        atendimento_id: selectedAtendimento.id,
        contato_id: null,
        agente_id: agenteId,
        agente_nome: signatureEnabled ? currentUser?.nome || null : null,
        tipo: "audio",
        direcao: "saida",
        conteudo: null,
        arquivo_url: publicUrl,
        arquivo_nome: fileName,
        arquivo_tipo: mimeType,
        whatsapp_message_id: null,
        status: "enviada",
        erro_descricao: null,
        created_at: new Date().toISOString(),
      };

      setOptimisticMessages(prev => [...prev, optimisticMsg]);

      // Fire and forget - send in background without waiting
      enviarMensagem(agenteId, "audio", undefined, publicUrl, fileName, mimeType, signatureEnabled ? currentUser?.nome || null : null);
    } catch (error: any) {
      console.error("[AudioUpload] Unexpected error:", error);
      
      if (error?.message?.includes("Failed to fetch")) {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
      } else {
        toast.error("Erro ao enviar áudio: " + (error?.message || "erro desconhecido"));
      }
    }
  }, [selectedAtendimento, getAgenteId, currentUser?.nome, signatureEnabled, enviarMensagem]);

  // Handle file attachment upload
  const handleFileAttachment = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAtendimento) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    const agenteId = getAgenteId();

    try {
      const extension = file.name.split('.').pop() || 'bin';
      const fileName = `file_${Date.now()}.${extension}`;
      const filePath = `omni/${selectedAtendimento.clinica_id}/${selectedAtendimento.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("omni-files")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Erro ao fazer upload do arquivo");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("omni-files")
        .getPublicUrl(filePath);

      const tipo: OmniMensagem["tipo"] = file.type.startsWith("image/") ? "imagem" : "documento";

      const optimisticMsg: OmniMensagem = {
        id: `temp-file-${Date.now()}`,
        atendimento_id: selectedAtendimento.id,
        contato_id: null,
        agente_id: agenteId,
        agente_nome: signatureEnabled ? currentUser?.nome || null : null,
        tipo,
        direcao: "saida",
        conteudo: null,
        arquivo_url: publicUrl,
        arquivo_nome: file.name,
        arquivo_tipo: file.type,
        whatsapp_message_id: null,
        status: "enviada",
        erro_descricao: null,
        created_at: new Date().toISOString(),
      };

      setOptimisticMessages(prev => [...prev, optimisticMsg]);
      enviarMensagem(agenteId, tipo, undefined, publicUrl, file.name, file.type, signatureEnabled ? currentUser?.nome || null : null);
      toast.success("Arquivo enviado!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error("Erro ao enviar arquivo");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selectedAtendimento, getAgenteId, currentUser?.nome, signatureEnabled, enviarMensagem]);

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

      if (dataReabertura) {
        updateData.data_reabertura = dataReabertura.toISOString();
        updateData.mensagem_reabertura = mensagemReabertura || null;
        updateData.reabertura_agendada = true;
      }

      // Optimistic: remove from list immediately
      setAtendimentos(prev => prev.filter(a => a.id !== selectedAtendimento.id));
      setSelectedAtendimento(null);

      await supabase
        .from("omni_atendimentos")
        .update(updateData)
        .eq("id", selectedAtendimento.id);
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

      // Optimistic: update locally
      setAtendimentos(prev => prev.map(a => 
        a.id === atendimentoId 
          ? { ...a, agente_id: novoAgenteId || null, fila_id: novaFilaId || a.fila_id, status: novoAgenteId ? "em_atendimento" as const : "aguardando" as const }
          : a
      ));

      await supabase
        .from("omni_atendimentos")
        .update({
          agente_id: novoAgenteId || null,
          fila_id: novaFilaId || atendimento.fila_id,
          status: novoAgenteId ? "em_atendimento" : "aguardando",
        })
        .eq("id", atendimentoId);
      toast.success("Atendimento transferido com sucesso");
    } catch (error) {
      console.error("Error transferring atendimento:", error);
      toast.error("Erro ao transferir atendimento");
    }
  };

  const handleSaveEtiquetas = async (newEtiquetas: string[]) => {
    if (!selectedAtendimento) return;

    try {
      await supabase
        .from("omni_atendimentos")
        .update({ etiquetas: newEtiquetas })
        .eq("id", selectedAtendimento.id);

      setSelectedAtendimento(prev => prev ? { ...prev, etiquetas: newEtiquetas } : null);
      // Optimistic: update locally
      setAtendimentos(prev => prev.map(a => 
        a.id === selectedAtendimento.id ? { ...a, etiquetas: newEtiquetas } : a
      ));
      toast.success("Etiquetas atualizadas");
    } catch (error) {
      console.error("Error updating etiquetas:", error);
      toast.error("Erro ao atualizar etiquetas");
    }
  };

  const handleEnviarNotaInterna = async (mensagem: string) => {
    if (!selectedAtendimento || !clinicaId || !currentUser) return;

    await criarNota(
      clinicaId,
      currentUser.id,
      currentUser.nome,
      selectedAtendimento.agente_id || null,
      mensagem
    );
  };

  // Fetch IA conversation status when atendimento changes
  useEffect(() => {
    const fetchIaConversaStatus = async () => {
      if (!selectedAtendimento?.id) {
        setIaConversaStatus(null);
        return;
      }
      
      const { data } = await supabase
        .from("omni_ia_conversas")
        .select("id, humano_assumiu")
        .eq("atendimento_id", selectedAtendimento.id)
        .single();
      
      setIaConversaStatus(data || null);
    };
    
    fetchIaConversaStatus();
  }, [selectedAtendimento?.id]);

  const handleReativarIA = async () => {
    if (!iaConversaStatus?.id) {
      toast.error("Não há conversa de IA para reativar");
      return;
    }

    try {
      await supabase
        .from("omni_ia_conversas")
        .update({
          humano_assumiu: false,
          humano_assumiu_em: null,
          transferido_para_humano: false,
        })
        .eq("id", iaConversaStatus.id);

      setIaConversaStatus(prev => prev ? { ...prev, humano_assumiu: false } : null);
      toast.success("IA reativada! Ela voltará a responder na próxima mensagem do cliente.");
    } catch (error) {
      console.error("Error reactivating AI:", error);
      toast.error("Erro ao reativar IA");
    }
  };

  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-yellow-100");
      setTimeout(() => element.classList.remove("bg-yellow-100"), 2000);
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
    <div className="flex h-[calc(100vh-4rem)] bg-background -m-4 sm:-m-6 overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r flex flex-col bg-card">
        {/* Action bar */}
        <div className="flex items-center justify-between p-2 border-b">
          <span className="text-sm font-semibold pl-1">Atendimentos</span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    if (!filteredAtendimentos.length) {
                      toast.info("Nenhum atendimento para encerrar");
                      return;
                    }
                    setEncerrarTodosOpen(true);
                  }}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Encerrar todos</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setNovoAtendimentoModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novo atendimento</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar"
              className="pl-9 bg-muted border-0 h-8"
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
            className="flex-1 h-7 text-xs"
            onClick={() => setActiveTab("all")}
          >
            <Filter className="h-3 w-3 mr-1" />
            Todos
          </Button>
          <Button
            variant={activeTab === "waiting" ? "default" : "ghost"}
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => setActiveTab("waiting")}
          >
            <Clock className="h-3 w-3 mr-1" />
            Na fila
          </Button>
          <Button
            variant={activeTab === "mine" ? "default" : "ghost"}
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => setActiveTab("mine")}
          >
            <Users className="h-3 w-3 mr-1" />
            Meus
          </Button>
          
          {/* Etiqueta filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filterEtiqueta ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7 shrink-0 relative"
              >
                <Tag className="h-3 w-3" />
                {filterEtiqueta && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <button
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted",
                  !filterEtiqueta && "font-medium text-primary"
                )}
                onClick={() => setFilterEtiqueta(null)}
              >
                Todas
              </button>
              {etiquetas.map((etq) => (
                <button
                  key={etq.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-muted",
                    filterEtiqueta === etq.nome && "font-medium text-primary"
                  )}
                  onClick={() => setFilterEtiqueta(filterEtiqueta === etq.nome ? null : etq.nome)}
                >
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: etq.cor }} />
                  {etq.nome}
                </button>
              ))}
              {etiquetas.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">Nenhuma etiqueta</p>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          {filteredAtendimentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
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
                allEtiquetas={etiquetas}
              />
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-muted/30 relative overflow-hidden">
        {selectedAtendimento ? (
          <>
            {/* Chat header - sticky */}
            <div className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 z-10">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage src={selectedAtendimento.contato?.foto_url || undefined} />
                <AvatarFallback className="bg-muted text-foreground">
                  {getInitials(displayContactName(selectedAtendimento.contato?.nome, selectedAtendimento.contato?.telefone))}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-semibold text-base truncate cursor-pointer hover:underline"
                  onClick={() => setEditarContatoModalOpen(true)}
                  title="Clique para editar o contato"
                >
                  {displayContactName(selectedAtendimento.contato?.nome, selectedAtendimento.contato?.telefone)}
                </h3>
                <p className="text-xs text-white/70">
                  {formatPhoneDisplay(selectedAtendimento.contato?.telefone)}
                  {selectedAtendimento.fila && ` • ${selectedAtendimento.fila.nome}`}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <div className="text-right mr-2">
                  <p className="text-xs text-white/70">Aberto a:</p>
                  <p className="font-mono text-sm">{waitTimeDisplay}</p>
                </div>
                
                {!isClinicaAdmin && (
                  <>
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

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/10 hover:text-red-300"
                          onClick={() => setEncerrarModalOpen(true)}
                        >
                          <XCircle className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Encerrar atendimento</TooltipContent>
                    </Tooltip>
                  </>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setSearchPanelOpen(true)}>
                      <Search className="h-4 w-4 mr-2" />
                      Pesquisar mensagens
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMediaModalOpen(true)}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Ver mídias
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDocumentsModalOpen(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Ver documentos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTransferirModalOpen(true)}>
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transferir chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEtiquetasModalOpen(true)}>
                      <Tag className="h-4 w-4 mr-2" />
                      Adicionar etiqueta
                    </DropdownMenuItem>
                    {isClinicaAdmin && (
                      <DropdownMenuItem onClick={() => setNotaInternaModalOpen(true)}>
                        <Bell className="h-4 w-4 mr-2" />
                        Notificar Agente
                      </DropdownMenuItem>
                    )}
                    {iaConversaStatus?.humano_assumiu && (
                      <DropdownMenuItem onClick={handleReativarIA}>
                        <Bot className="h-4 w-4 mr-2" />
                        Reativar IA
                      </DropdownMenuItem>
                    )}
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

            {/* Messages area - scrollable with contained scrollbar */}
            <ScrollArea
              className="flex-1 min-h-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4be' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              <div className="p-4 space-y-2">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : combinedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                <>
                  {combinedItems.map((item, index) => {
                    // Date separator logic
                    const itemDate = new Date(item.data.created_at || '');
                    const itemDateStr = format(itemDate, 'yyyy-MM-dd');
                    const prevItem = index > 0 ? combinedItems[index - 1] : null;
                    const prevDateStr = prevItem ? format(new Date(prevItem.data.created_at || ''), 'yyyy-MM-dd') : null;
                    const showDateSeparator = itemDateStr !== prevDateStr;

                    const dateSeparatorLabel = isToday(itemDate)
                      ? "Hoje"
                      : isYesterday(itemDate)
                      ? "Ontem"
                      : format(itemDate, "dd/MM/yyyy");

                    if (item.type === 'note') {
                      const nota = item.data as OmniNotaInterna;
                      return (
                        <div key={`note-${nota.id}`}>
                          {showDateSeparator && (
                            <div className="flex items-center justify-center my-3">
                              <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm">
                                {dateSeparatorLabel}
                              </span>
                            </div>
                          )}
                          <NotaInternaAlert
                            nota={nota}
                            onMarcarLida={!nota.lida ? () => marcarComoLida(nota.id) : undefined}
                          />
                        </div>
                      );
                    }
                    
                    const msg = item.data as OmniMensagem & { _isHistory?: boolean };
                    const isHistoryMsg = !!(msg as any)._isHistory;
                    const previousMessages = combinedItems.slice(0, index)
                      .filter(i => i.type === 'message')
                      .map(i => i.data as OmniMensagem);
                    const isFirstAgentMessage = msg.direcao === "saida" && 
                      previousMessages.every(m => m.direcao !== "saida");

                    // Show history separator before first history message
                    const prevMsg = index > 0 ? combinedItems[index - 1] : null;
                    const prevIsHistory = prevMsg?.type === 'message' && !!(prevMsg.data as any)._isHistory;
                    const showHistorySeparator = isHistoryMsg && (index === 0 || !prevIsHistory) && index === combinedItems.findIndex(i => i.type === 'message');
                    const showHistoryEnd = !isHistoryMsg && prevMsg?.type === 'message' && prevIsHistory;
                    
                    return (
                      <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-500">
                        {showHistorySeparator && (
                          <div className="flex items-center justify-center my-3">
                            <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                              <History className="h-3 w-3" />
                              Histórico de conversas anteriores
                            </span>
                          </div>
                        )}
                        {showHistoryEnd && (
                          <div className="flex items-center justify-center my-3">
                            <span className="bg-primary/10 text-primary text-xs px-3 py-1 rounded-full shadow-sm font-medium">
                              Conversa atual
                            </span>
                          </div>
                        )}
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-3">
                            <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm">
                              {dateSeparatorLabel}
                            </span>
                          </div>
                        )}
                        <MessageBubble 
                          mensagem={msg} 
                          showSignature={signatureEnabled}
                          isFirstAgentMessage={isFirstAgentMessage}
                          onForward={isHistoryMsg ? undefined : handleForwardMessage}
                          onEdit={isHistoryMsg ? undefined : handleEditMessage}
                          onDelete={isHistoryMsg ? undefined : handleDeleteMessage}
                        />
                      </div>
                    );
                  })}
                  
                  {/* Typing indicator */}
                  {allTypingNames.length > 0 && (
                    <TypingBubble names={allTypingNames} />
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
              </div>
            </ScrollArea>

            {/* Editing indicator */}
            {editingMessage && (
              <div className="flex-shrink-0 bg-muted/80 px-4 py-2 flex items-center gap-2 border-b border-border">
                <Pencil className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary">Editando mensagem</p>
                  <p className="text-xs text-muted-foreground truncate">{editingMessage.conteudo}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Message input - sticky */}
            <div className="flex-shrink-0 bg-muted px-4 py-3 flex items-center gap-2 z-10">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileAttachment}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
              />

              {/* Emoji Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Emoji">
                    <Smile className="h-6 w-6" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" side="top" align="start" sideOffset={8}>
                  <div className="grid grid-cols-8 gap-1">
                    {["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😋","😛","😜","🤪","😝","🤗","🤔","🤭","🤫","😶","😐","😏","😒","🙄","😬","😴","😷","🤒","🤕","🤢","🤧","🥵","🥶","😱","😨","😰","😥","😢","😭","😤","🤬","👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👏","🙌","🤝","🙏","💪","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💯","🔥","✨","💫","💥","👋","🎉","🎊"].map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-lg hover:bg-muted"
                        onClick={() => {
                          setMessageInput(prev => prev + emoji);
                          inputRef.current?.focus();
                        }}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* File Attachment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Anexar arquivo</TooltipContent>
              </Tooltip>

              {/* Quick Replies */}
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Respostas rápidas" onClick={() => setRespostasRapidasOpen(true)}>
                <MessageSquareText className="h-5 w-5" />
              </Button>
              <RespostasRapidasModal
                open={respostasRapidasOpen}
                onClose={() => setRespostasRapidasOpen(false)}
                onSelect={(texto) => {
                  setMessageInput(texto);
                  inputRef.current?.focus();
                }}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      signatureEnabled && "text-primary hover:text-primary"
                    )}
                    onClick={() => {
                      setSignatureEnabled(!signatureEnabled);
                      toast.info(signatureEnabled ? "Assinatura desabilitada" : "Assinatura habilitada");
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
                className="flex-1 bg-background border-0 rounded-full"
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  if (e.target.value.trim()) {
                    handleTypingStart();
                  }
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleTypingStop}
              />
              
              {messageInput.trim() ? (
                <Button
                  size="icon"
                  className="bg-[#075E54] hover:bg-[#064E46] rounded-full"
                  onClick={handleSendMessage}
                >
                  <Send className="h-5 w-5" />
                </Button>
              ) : (
                <AudioRecorder 
                  onSendAudio={handleSendAudio}
                />
              )}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-light text-foreground/70 mb-2">Nenhum chat selecionado</h3>
            <p className="text-sm text-muted-foreground">
              Selecione uma conversa da lista para visualizar as mensagens
            </p>
          </div>
        )}

        {/* Search Messages Panel */}
        <SearchMessagesPanel
          open={searchPanelOpen}
          onClose={() => setSearchPanelOpen(false)}
          mensagens={allMessages}
          onMessageClick={handleScrollToMessage}
        />
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

      {/* End Service Modal */}
      <EncerrarAtendimentoModal
        open={encerrarModalOpen}
        onClose={() => setEncerrarModalOpen(false)}
        atendimento={selectedAtendimento}
        onEncerrar={handleFinalizarAtendimento}
      />

      {/* Media Gallery Modal */}
      <MediaGalleryModal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        mensagens={allMessages}
      />

      {/* Documents Modal */}
      <DocumentsModal
        open={documentsModalOpen}
        onClose={() => setDocumentsModalOpen(false)}
        mensagens={allMessages}
      />

      {/* Labels Modal */}
      <EtiquetasModal
        open={etiquetasModalOpen}
        onClose={() => setEtiquetasModalOpen(false)}
        etiquetas={etiquetas}
        selectedEtiquetas={selectedAtendimento?.etiquetas || []}
        onSave={handleSaveEtiquetas}
        onCreateEtiqueta={async (nome, cor) => {
          await criarEtiqueta(nome, cor);
        }}
      />

      {/* Internal Note Modal */}
      <NotaInternaModal
        open={notaInternaModalOpen}
        onClose={() => setNotaInternaModalOpen(false)}
        onEnviar={handleEnviarNotaInterna}
        agenteNome={selectedAtendimento?.agente?.nome}
      />

      {/* New Atendimento Modal */}
      {clinicaId && (
        <NovoAtendimentoModal
          open={novoAtendimentoModalOpen}
          onOpenChange={setNovoAtendimentoModalOpen}
          clinicaId={clinicaId}
          usuarioClinicaId={currentUser?.usuarioClinicaId}
          onAtendimentoCriado={async (atendimentoId) => {
            // Fetch fresh data first
            await fetchAtendimentos();
            // Then select the newly created atendimento after state updates
            setTimeout(() => {
              setAtendimentos(prev => {
                const newAtendimento = prev.find(a => a.id === atendimentoId);
                if (newAtendimento) {
                  setSelectedAtendimento(newAtendimento);
                }
                return prev;
              });
            }, 100);
          }}
        />
      )}

      {/* Edit Contact Modal */}
      <EditarContatoOmniModal
        open={editarContatoModalOpen}
        onClose={() => setEditarContatoModalOpen(false)}
        contato={selectedAtendimento?.contato ? {
          id: selectedAtendimento.contato.id || "",
          nome: selectedAtendimento.contato.nome || "",
          telefone: selectedAtendimento.contato.telefone || "",
          documento: selectedAtendimento.contato.documento,
          email: selectedAtendimento.contato.email,
          instagram: selectedAtendimento.contato.instagram,
          empresa: selectedAtendimento.contato.empresa,
          observacoes: selectedAtendimento.contato.observacoes,
        } : null}
        onUpdated={(updated) => {
          // Update the selected atendimento's contact data locally
          setSelectedAtendimento(prev => prev ? {
            ...prev,
            contato: { ...prev.contato, ...updated } as any,
          } : null);
          fetchAtendimentos();
        }}
      />

      {/* Forward Message Modal */}
      <EncaminharMensagemModal
        open={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        mensagem={forwardingMessage}
        clinicaId={clinicaId}
        agenteId={getAgenteId()}
        agenteName={signatureEnabled ? currentUser?.nome || null : null}
        currentAtendimentoId={selectedAtendimento?.id || null}
      />

      {/* Encerrar Todos AlertDialog */}
      <AlertDialog open={encerrarTodosOpen} onOpenChange={setEncerrarTodosOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Encerrar todos os atendimentos
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a encerrar <strong className="text-foreground">{filteredAtendimentos.length}</strong> atendimento(s) visíveis.
              Essa ação não pode ser desfeita. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  const ids = filteredAtendimentos.map(a => a.id);
                  // Process in batches of 100 to avoid query limits
                  for (let i = 0; i < ids.length; i += 100) {
                    const batch = ids.slice(i, i + 100);
                    const { error } = await supabase
                      .from("omni_atendimentos")
                      .update({ status: "finalizado", data_fechamento: new Date().toISOString() })
                      .in("id", batch);
                    if (error) throw error;
                  }
                  toast.success(`${ids.length} atendimento(s) encerrados`);
                  setSelectedAtendimento(null);
                  setAtendimentos(prev => prev.filter(a => !ids.includes(a.id)));
                } catch {
                  toast.error("Erro ao encerrar atendimentos");
                }
              }}
            >
              Encerrar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Message Confirmation */}
      <AlertDialog open={!!deletingMessage} onOpenChange={(open) => { if (!open) setDeletingMessage(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Apagar mensagem
            </AlertDialogTitle>
            <AlertDialogDescription>
              A mensagem será apagada para todos os participantes. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingMessage) {
                  apagarMensagem(deletingMessage.id);
                  setDeletingMessage(null);
                }
              }}
            >
              Apagar para todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
