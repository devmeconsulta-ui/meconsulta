import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatClinica, Conversa } from "@/hooks/useChatClinica";
import { ChatSidebar } from "@/components/clinica/chat/ChatSidebar";
import { ChatMessages } from "@/components/clinica/chat/ChatMessages";
import { ChatInput } from "@/components/clinica/chat/ChatInput";
import { NovaConversaModal } from "@/components/clinica/chat/NovaConversaModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Users, Menu, X, MessageCircle, Archive, ArchiveRestore, Trash2, Pin, PinOff, Search, PanelLeftClose, PanelLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ImperativePanelHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
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
export default function MedicoChat() {
  const { currentUser } = useAuth();
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [loadingClinica, setLoadingClinica] = useState(true);
  const [buscaMensagem, setBuscaMensagem] = useState("");
  const [showBuscaMensagem, setShowBuscaMensagem] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarPanelRef = useState<ImperativePanelHandle | null>(null);

  // Buscar a clínica do médico
  useEffect(() => {
    const fetchClinicaDoMedico = async () => {
      if (!currentUser?.medicoId) {
        setLoadingClinica(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("clinicas_medicos")
          .select("clinica_id")
          .eq("medico_id", currentUser.medicoId)
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setClinicaId(data?.clinica_id || null);
      } catch (error) {
        console.error("Erro ao buscar clínica do médico:", error);
      } finally {
        setLoadingClinica(false);
      }
    };

    fetchClinicaDoMedico();
  }, [currentUser?.medicoId]);

  const {
    conversas,
    conversaAtual,
    setConversaAtual,
    mensagens,
    loading,
    loadingMensagens,
    fetchMensagens,
    enviarMensagem,
    criarGrupoClinica,
    criarConversaPrivada,
    arquivarConversa,
    excluirConversa,
    fixarConversa,
    uploadArquivo,
    usersTyping,
    sendTypingEvent,
    participantesConversa,
    toggleReacao,
  } = useChatClinica({ clinicaId });

  // Filtrar mensagens pela busca
  const mensagensFiltradas = useMemo(() => {
    if (!buscaMensagem.trim()) return mensagens;
    return mensagens.filter((msg) =>
      msg.conteudo?.toLowerCase().includes(buscaMensagem.toLowerCase())
    );
  }, [mensagens, buscaMensagem]);

  const handleSelectConversa = (conversa: Conversa) => {
    setConversaAtual(conversa);
    fetchMensagens(conversa.id);
    setShowSidebarMobile(false);
  };

  const handleEnviarMensagem = async (
    conteudo: string,
    tipoMensagem?: "texto" | "imagem" | "arquivo",
    arquivoUrl?: string,
    arquivoNome?: string,
    arquivoTipo?: string
  ) => {
    if (conversaAtual) {
      await enviarMensagem(
        conversaAtual.id,
        conteudo,
        tipoMensagem,
        arquivoUrl,
        arquivoNome,
        arquivoTipo
      );
    }
  };

  const handleCriarGrupo = async (nome: string, descricao?: string) => {
    const grupo = await criarGrupoClinica(nome, descricao);
    if (grupo) {
      handleSelectConversa({ ...grupo, tipo: grupo.tipo as "grupo" | "privado" } as Conversa);
    }
    return grupo;
  };

  const handleCriarPrivada = async (participante: { tipo: "medico" | "funcionario" | "admin_clinica"; id: string }) => {
    const conversa = await criarConversaPrivada(participante);
    if (conversa) {
      handleSelectConversa({ ...conversa, tipo: conversa.tipo as "grupo" | "privado" } as Conversa);
    }
    return conversa;
  };

  // Estado de carregamento
  if (loadingClinica) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está vinculado a uma clínica
  if (!clinicaId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Chat Interno</h2>
          <p className="text-muted-foreground">
            Você precisa estar vinculado a uma clínica para acessar o chat interno.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background rounded-lg border overflow-hidden">
      {/* Botão mobile para abrir sidebar */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden absolute top-20 left-4 z-10"
        onClick={() => setShowSidebarMobile(!showSidebarMobile)}
      >
        {showSidebarMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Layout Mobile */}
      <div className={`
        ${showSidebarMobile ? 'fixed inset-0 z-40 bg-background' : 'hidden'} 
        lg:hidden
      `}>
        <ChatSidebar
          conversas={conversas}
          conversaAtual={conversaAtual}
          onSelectConversa={handleSelectConversa}
          onNovaConversa={() => setShowNovaConversa(true)}
          onArquivarConversa={arquivarConversa}
          onExcluirConversa={excluirConversa}
          onFixarConversa={fixarConversa}
          loading={loading}
        />
      </div>

      {/* Layout Desktop com painéis redimensionáveis */}
      <ResizablePanelGroup 
        direction="horizontal" 
        className="hidden lg:flex h-full"
      >
        {/* Sidebar redimensionável */}
        <ResizablePanel 
          defaultSize={sidebarCollapsed ? 0 : 25} 
          minSize={0} 
          maxSize={40}
          collapsible
          collapsedSize={0}
          onCollapse={() => setSidebarCollapsed(true)}
          onExpand={() => setSidebarCollapsed(false)}
          className={`bg-background transition-all ${sidebarCollapsed ? 'min-w-0' : ''}`}
          ref={(ref) => {
            if (ref && sidebarPanelRef[0] !== ref) {
              sidebarPanelRef[1](ref);
            }
          }}
        >
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <ChatSidebar
                  conversas={conversas}
                  conversaAtual={conversaAtual}
                  onSelectConversa={handleSelectConversa}
                  onNovaConversa={() => setShowNovaConversa(true)}
                  onArquivarConversa={arquivarConversa}
                  onExcluirConversa={excluirConversa}
                  onFixarConversa={fixarConversa}
                  loading={loading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />

        {/* Botão para expandir sidebar quando colapsada */}
        {sidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSidebarCollapsed(false);
              sidebarPanelRef[0]?.expand();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background border shadow-sm hover:bg-muted"
            title="Expandir lista de conversas"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Área principal do chat redimensionável */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <div className="flex-1 flex flex-col min-w-0 h-full">
        <AnimatePresence mode="wait">
        {/* Header da conversa */}
        {conversaAtual && (
          <motion.div
            key={conversaAtual.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col h-full"
          >
          <div className="border-b bg-background">
            <div className="h-16 flex items-center justify-between px-4">
              <div className="flex items-center gap-3 pl-10 lg:pl-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  conversaAtual.tipo === "grupo" 
                    ? "bg-primary/10 text-primary" 
                    : "bg-secondary"
                }`}>
                  {conversaAtual.tipo === "grupo" ? (
                    <Hash className="h-5 w-5" />
                  ) : (
                    <Users className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">
                      {conversaAtual.nome || "Conversa privada"}
                    </h3>
                    {conversaAtual.fixada && (
                      <Pin className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  {conversaAtual.tipo === "grupo" && conversaAtual.descricao && (
                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                      {conversaAtual.descricao}
                    </p>
                  )}
                </div>
              </div>

              {/* Botões de ação - mais visíveis */}
              <div className="flex items-center gap-1">
                {/* Botão para colapsar sidebar */}
                {!sidebarCollapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSidebarCollapsed(true);
                      sidebarPanelRef[0]?.collapse();
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Colapsar lista de conversas"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBuscaMensagem(!showBuscaMensagem)}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  title="Buscar mensagens"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Buscar</span>
                </Button>
                
                <Button
                  variant={conversaAtual.fixada ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => fixarConversa(conversaAtual.id, !conversaAtual.fixada)}
                  className={`gap-1.5 ${conversaAtual.fixada ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title={conversaAtual.fixada ? "Desafixar conversa" : "Fixar conversa"}
                >
                  {conversaAtual.fixada ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline text-xs">{conversaAtual.fixada ? "Desafixar" : "Fixar"}</span>
                </Button>
                
                <Button
                  variant={conversaAtual.arquivada ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => arquivarConversa(conversaAtual.id, !conversaAtual.arquivada)}
                  className={`gap-1.5 ${conversaAtual.arquivada ? "text-orange-600" : "text-muted-foreground hover:text-foreground"}`}
                  title={conversaAtual.arquivada ? "Desarquivar conversa" : "Arquivar conversa"}
                >
                  {conversaAtual.arquivada ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline text-xs">{conversaAtual.arquivada ? "Desarquivar" : "Arquivar"}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmarExclusao(true)}
                  className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Excluir conversa"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Excluir</span>
                </Button>
                
                <div className="w-px h-5 bg-border mx-1" />
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConversaAtual(null)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Fechar conversa"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Barra de busca de mensagens */}
            {showBuscaMensagem && (
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar mensagens..."
                    value={buscaMensagem}
                    onChange={(e) => setBuscaMensagem(e.target.value)}
                    className="pl-9 pr-8"
                    autoFocus
                  />
                  {buscaMensagem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      onClick={() => setBuscaMensagem("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {buscaMensagem && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {mensagensFiltradas.length} mensagem(ns) encontrada(s)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mensagens */}
          <ChatMessages
            conversa={conversaAtual}
            mensagens={mensagensFiltradas}
            loading={loadingMensagens}
            usersTyping={usersTyping}
            onToggleReacao={toggleReacao}
          />

          {/* Input */}
          <ChatInput
            onEnviar={handleEnviarMensagem}
            onUpload={uploadArquivo}
            onTyping={() => conversaAtual && sendTypingEvent(conversaAtual.id)}
            disabled={!conversaAtual}
            participantes={participantesConversa}
          />
          </motion.div>
        )}
        </AnimatePresence>

        {/* Estado vazio quando não há conversa selecionada */}
        {!conversaAtual && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa na lista ou crie uma nova</p>
            </div>
          </div>
        )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Modal nova conversa */}
      <NovaConversaModal
        open={showNovaConversa}
        onOpenChange={setShowNovaConversa}
        clinicaId={clinicaId}
        onCriarGrupo={handleCriarGrupo}
        onCriarPrivada={handleCriarPrivada}
      />
    </div>
  );
}
