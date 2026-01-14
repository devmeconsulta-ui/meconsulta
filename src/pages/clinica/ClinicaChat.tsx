import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useChatClinica, Conversa, Mensagem } from "@/hooks/useChatClinica";
import { ChatSidebar } from "@/components/clinica/chat/ChatSidebar";
import { ChatMessages } from "@/components/clinica/chat/ChatMessages";
import { ChatInput } from "@/components/clinica/chat/ChatInput";
import { NovaConversaModal } from "@/components/clinica/chat/NovaConversaModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Users, Menu, X, Archive, ArchiveRestore, Trash2, Pin, PinOff, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
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

interface ClinicaContext {
  clinicaData: any;
  currentUser: any;
}

export default function ClinicaChat() {
  const { clinicaData, currentUser } = useOutletContext<ClinicaContext>();
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [buscaMensagem, setBuscaMensagem] = useState("");
  const [showBuscaMensagem, setShowBuscaMensagem] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

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
  } = useChatClinica({ clinicaId: clinicaData?.id || null });

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

      {/* Sidebar - Desktop sempre visível, Mobile toggle */}
      <div className={`
        ${showSidebarMobile ? 'fixed inset-0 z-40 bg-background' : 'hidden'} 
        lg:relative lg:block lg:bg-transparent
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

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header da conversa */}
        {conversaAtual && (
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
        )}

        {/* Mensagens */}
        <ChatMessages
          conversa={conversaAtual}
          mensagens={mensagensFiltradas}
          loading={loadingMensagens}
          usersTyping={usersTyping}
        />

        {/* Input */}
        {conversaAtual && (
          <ChatInput
            onEnviar={handleEnviarMensagem}
            onUpload={uploadArquivo}
            onTyping={() => conversaAtual && sendTypingEvent(conversaAtual.id)}
            disabled={!conversaAtual}
            participantes={participantesConversa}
          />
        )}
      </div>

      {/* Modal nova conversa */}
      <NovaConversaModal
        open={showNovaConversa}
        onOpenChange={setShowNovaConversa}
        clinicaId={clinicaData?.id || ""}
        onCriarGrupo={handleCriarGrupo}
        onCriarPrivada={handleCriarPrivada}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conversa "{conversaAtual?.nome || "esta conversa"}"? 
              Todas as mensagens serão permanentemente removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (conversaAtual) {
                  excluirConversa(conversaAtual.id);
                }
                setConfirmarExclusao(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
