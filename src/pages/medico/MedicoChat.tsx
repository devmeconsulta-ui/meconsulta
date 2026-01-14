import { useState, useEffect } from "react";
import { useChatClinica, Conversa } from "@/hooks/useChatClinica";
import { ChatSidebar } from "@/components/clinica/chat/ChatSidebar";
import { ChatMessages } from "@/components/clinica/chat/ChatMessages";
import { ChatInput } from "@/components/clinica/chat/ChatInput";
import { NovaConversaModal } from "@/components/clinica/chat/NovaConversaModal";
import { Button } from "@/components/ui/button";
import { Hash, Users, Menu, X, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function MedicoChat() {
  const { currentUser } = useAuth();
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [loadingClinica, setLoadingClinica] = useState(true);

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
    excluirConversa,
    uploadArquivo,
    usersTyping,
    sendTypingEvent,
  } = useChatClinica({ clinicaId });

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
          onExcluirConversa={excluirConversa}
          loading={loading}
        />
      </div>

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header da conversa */}
        {conversaAtual && (
          <div className="h-16 border-b flex items-center justify-between px-4 bg-background">
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
                <h3 className="font-medium">
                  {conversaAtual.nome || "Conversa privada"}
                </h3>
                {conversaAtual.tipo === "grupo" && conversaAtual.descricao && (
                  <p className="text-xs text-muted-foreground truncate max-w-xs">
                    {conversaAtual.descricao}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mensagens */}
        <ChatMessages
          conversa={conversaAtual}
          mensagens={mensagens}
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
          />
        )}
      </div>

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
