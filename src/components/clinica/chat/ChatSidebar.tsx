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
  User,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff
} from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChatSidebarProps {
  conversas: Conversa[];
  conversaAtual: Conversa | null;
  onSelectConversa: (conversa: Conversa) => void;
  onNovaConversa: () => void;
  onArquivarConversa?: (conversaId: string, arquivar: boolean) => void;
  onExcluirConversa?: (conversaId: string) => void;
  onFixarConversa?: (conversaId: string, fixar: boolean) => void;
  loading: boolean;
}

export function ChatSidebar({
  conversas,
  conversaAtual,
  onSelectConversa,
  onNovaConversa,
  onArquivarConversa,
  onExcluirConversa,
  onFixarConversa,
  loading,
}: ChatSidebarProps) {
  const [busca, setBusca] = useState("");
  const [conversaParaExcluir, setConversaParaExcluir] = useState<Conversa | null>(null);
  const [arquivadasAberto, setArquivadasAberto] = useState(false);

  const conversasFiltradas = conversas.filter((c) =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.ultima_mensagem?.conteudo?.toLowerCase().includes(busca.toLowerCase())
  );

  const conversasAtivas = conversasFiltradas.filter((c) => !c.arquivada);
  const conversasArquivadas = conversasFiltradas.filter((c) => c.arquivada);

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
    return conversa.nome || "Conversa privada";
  };

  const getConversaIcon = (conversa: Conversa) => {
    if (conversa.tipo === "grupo") {
      return <Hash className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  const handleExcluir = (e: React.MouseEvent, conversa: Conversa) => {
    e.stopPropagation();
    setConversaParaExcluir(conversa);
  };

  const handleArquivar = (e: React.MouseEvent, conversa: Conversa) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("handleArquivar chamado", { conversaId: conversa.id, arquivada: conversa.arquivada, onArquivarConversa: !!onArquivarConversa });
    if (onArquivarConversa) {
      onArquivarConversa(conversa.id, !conversa.arquivada);
    }
  };

  const handleFixar = (e: React.MouseEvent, conversa: Conversa) => {
    e.stopPropagation();
    e.preventDefault();
    if (onFixarConversa) {
      onFixarConversa(conversa.id, !conversa.fixada);
    }
  };

  const confirmarExclusao = () => {
    if (conversaParaExcluir && onExcluirConversa) {
      onExcluirConversa(conversaParaExcluir.id);
    }
    setConversaParaExcluir(null);
  };

  const renderConversaItem = (conversa: Conversa) => (
    <div
      key={conversa.id}
      className={`group relative p-3 rounded-lg transition-colors mb-1 cursor-pointer ${
        conversaAtual?.id === conversa.id
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted"
      } ${conversa.fixada ? "border-l-2 border-l-primary" : ""}`}
      onClick={() => onSelectConversa(conversa)}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={`${
              conversa.tipo === "grupo" 
                ? "bg-primary/20 text-primary" 
                : "bg-secondary"
            }`}>
              {getConversaIcon(conversa)}
            </AvatarFallback>
          </Avatar>
          {conversa.fixada && (
            <Pin className="h-3 w-3 text-primary absolute -top-1 -right-1" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm truncate">
              {getConversaNome(conversa)}
            </span>
            <div className="flex items-center gap-1">
              {conversa.ultima_mensagem && (
                <span className="text-xs text-muted-foreground">
                  {formatarData(conversa.ultima_mensagem.created_at)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
              {conversa.ultima_mensagem?.conteudo || "Nenhuma mensagem"}
            </p>
            <div className="flex items-center gap-1">
              {conversa.mensagens_nao_lidas && conversa.mensagens_nao_lidas > 0 && (
                <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center text-xs">
                  {conversa.mensagens_nao_lidas > 99 ? "99+" : conversa.mensagens_nao_lidas}
                </Badge>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <>
      <div className="w-full min-w-0 border-r bg-muted/30 flex flex-col h-full">
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
              <>
                {/* Conversas ativas */}
                {conversasAtivas.map(renderConversaItem)}

                {/* Conversas arquivadas */}
                {conversasArquivadas.length > 0 && (
                  <Collapsible
                    open={arquivadasAberto}
                    onOpenChange={setArquivadasAberto}
                    className="mt-4"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                      >
                        {arquivadasAberto ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Archive className="h-4 w-4" />
                        <span className="text-sm">Arquivadas ({conversasArquivadas.length})</span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      {conversasArquivadas.map(renderConversaItem)}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!conversaParaExcluir} onOpenChange={() => setConversaParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conversa com "{conversaParaExcluir?.nome || "esta pessoa"}"? 
              Todas as mensagens serão permanentemente removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}