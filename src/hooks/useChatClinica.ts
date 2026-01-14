import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Conversa {
  id: string;
  clinica_id: string;
  tipo: "grupo" | "privado";
  nome: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
  participantes?: Participante[];
  ultima_mensagem?: Mensagem | null;
  mensagens_nao_lidas?: number;
}

export interface Participante {
  id: string;
  conversa_id: string;
  usuario_id: string | null;
  usuario_clinica_id: string | null;
  medico_id: string | null;
  tipo_participante: "admin_clinica" | "medico" | "funcionario";
  created_at: string;
  ultima_leitura: string;
  nome?: string;
  foto_url?: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  remetente_usuario_id: string | null;
  remetente_usuario_clinica_id: string | null;
  remetente_medico_id: string | null;
  tipo_remetente: "admin_clinica" | "medico" | "funcionario";
  conteudo: string | null;
  tipo_mensagem: "texto" | "imagem" | "arquivo" | "sistema";
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
  lida: boolean;
  created_at: string;
  updated_at: string;
  remetente_nome?: string;
  remetente_foto?: string;
}

interface UseChatClinicaProps {
  clinicaId: string | null;
}

export interface TypingUser {
  id: string;
  nome: string;
  tipo: "admin_clinica" | "medico" | "funcionario";
}

export function useChatClinica({ clinicaId }: UseChatClinicaProps) {
  const { currentUser } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [usersTyping, setUsersTyping] = useState<TypingUser[]>([]);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar conversas da clínica
  const fetchConversas = useCallback(async () => {
    if (!clinicaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_conversas")
        .select(`
          *,
          chat_participantes (
            id,
            usuario_id,
            usuario_clinica_id,
            medico_id,
            tipo_participante,
            ultima_leitura
          )
        `)
        .eq("clinica_id", clinicaId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Enriquecer com informações dos participantes e última mensagem
      const conversasEnriquecidas = await Promise.all(
        (data || []).map(async (conversa) => {
          // Buscar última mensagem
          const { data: ultimaMensagem } = await supabase
            .from("chat_mensagens")
            .select("*")
            .eq("conversa_id", conversa.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Contar mensagens não lidas
          const meuParticipante = conversa.chat_participantes?.find((p: any) => {
            if (currentUser?.tipo === "clinica") {
              return p.usuario_id === currentUser.id;
            } else if (currentUser?.medicoId) {
              return p.medico_id === currentUser.medicoId;
            } else if (currentUser?.clinicaId) {
              return p.usuario_clinica_id === currentUser.id;
            }
            return false;
          });

          let mensagensNaoLidas = 0;
          if (meuParticipante) {
            const { count } = await supabase
              .from("chat_mensagens")
              .select("*", { count: "exact", head: true })
              .eq("conversa_id", conversa.id)
              .gt("created_at", meuParticipante.ultima_leitura);
            mensagensNaoLidas = count || 0;
          }

          return {
            ...conversa,
            tipo: conversa.tipo,
            participantes: conversa.chat_participantes,
            ultima_mensagem: ultimaMensagem,
            mensagens_nao_lidas: mensagensNaoLidas,
          } as unknown as Conversa;
        })
      );

      setConversas(conversasEnriquecidas);
    } catch (error) {
      console.error("Erro ao buscar conversas:", error);
      toast.error("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }, [clinicaId, currentUser]);

  // Buscar mensagens de uma conversa
  const fetchMensagens = useCallback(async (conversaId: string) => {
    setLoadingMensagens(true);
    try {
      const { data, error } = await supabase
        .from("chat_mensagens")
        .select("*")
        .eq("conversa_id", conversaId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Enriquecer mensagens com nomes dos remetentes
      const mensagensEnriquecidas = await Promise.all(
        (data || []).map(async (msg) => {
          let remetenteNome = "Usuário";
          let remetenteFoto = "";

          if (msg.remetente_medico_id) {
            const { data: medico } = await supabase
              .from("medicos")
              .select("nome, foto_url")
              .eq("id", msg.remetente_medico_id)
              .maybeSingle();
            if (medico) {
              remetenteNome = `Dr(a). ${medico.nome}`;
              remetenteFoto = medico.foto_url || "";
            }
          } else if (msg.remetente_usuario_clinica_id) {
            const { data: funcionario } = await supabase
              .from("usuarios_clinica")
              .select("nome")
              .eq("id", msg.remetente_usuario_clinica_id)
              .maybeSingle();
            if (funcionario) {
              remetenteNome = funcionario.nome;
            }
          } else if (msg.remetente_usuario_id) {
            const { data: usuario } = await supabase
              .from("usuarios")
              .select("nome")
              .eq("id", msg.remetente_usuario_id)
              .maybeSingle();
            if (usuario) {
              remetenteNome = usuario.nome;
            }
          }

          return {
            ...msg,
            tipo_remetente: msg.tipo_remetente as "admin_clinica" | "medico" | "funcionario",
            tipo_mensagem: msg.tipo_mensagem as "texto" | "imagem" | "arquivo" | "sistema",
            remetente_nome: remetenteNome,
            remetente_foto: remetenteFoto,
          } as Mensagem;
        })
      );

      setMensagens(mensagensEnriquecidas as Mensagem[]);

      // Atualizar última leitura
      await atualizarUltimaLeitura(conversaId);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoadingMensagens(false);
    }
  }, []);

  // Atualizar última leitura
  const atualizarUltimaLeitura = async (conversaId: string) => {
    if (!currentUser) return;

    try {
      let updateQuery = supabase
        .from("chat_participantes")
        .update({ ultima_leitura: new Date().toISOString() })
        .eq("conversa_id", conversaId);

      if (currentUser.tipo === "clinica") {
        updateQuery = updateQuery.eq("usuario_id", currentUser.id);
      } else if (currentUser.medicoId) {
        updateQuery = updateQuery.eq("medico_id", currentUser.medicoId);
      } else if (currentUser.clinicaId) {
        // funcionário
        updateQuery = updateQuery.eq("usuario_clinica_id", currentUser.id);
      }

      await updateQuery;
    } catch (error) {
      console.error("Erro ao atualizar última leitura:", error);
    }
  };

  // Enviar mensagem
  const enviarMensagem = async (
    conversaId: string,
    conteudo: string,
    tipoMensagem: "texto" | "imagem" | "arquivo" = "texto",
    arquivoUrl?: string,
    arquivoNome?: string,
    arquivoTipo?: string
  ) => {
    if (!currentUser) return;

    try {
      const novaMensagem: any = {
        conversa_id: conversaId,
        conteudo,
        tipo_mensagem: tipoMensagem,
        arquivo_url: arquivoUrl || null,
        arquivo_nome: arquivoNome || null,
        arquivo_tipo: arquivoTipo || null,
      };

      // Definir remetente baseado no tipo de usuário
      if (currentUser.tipo === "clinica") {
        novaMensagem.remetente_usuario_id = currentUser.id;
        novaMensagem.tipo_remetente = "admin_clinica";
      } else if (currentUser.medicoId) {
        novaMensagem.remetente_medico_id = currentUser.medicoId;
        novaMensagem.tipo_remetente = "medico";
      } else if (currentUser.clinicaId) {
        // funcionário de clínica
        novaMensagem.remetente_usuario_clinica_id = currentUser.id;
        novaMensagem.tipo_remetente = "funcionario";
      }

      const { error } = await supabase
        .from("chat_mensagens")
        .insert(novaMensagem);

      if (error) throw error;

      // Atualizar updated_at da conversa
      await supabase
        .from("chat_conversas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversaId);

      // Recarregar mensagens
      await fetchMensagens(conversaId);
      await fetchConversas();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    }
  };

  // Criar conversa em grupo (canal geral da clínica)
  const criarGrupoClinica = async (nome: string, descricao?: string) => {
    if (!clinicaId) return null;

    try {
      // Criar conversa
      const { data: conversa, error: conversaError } = await supabase
        .from("chat_conversas")
        .insert({
          clinica_id: clinicaId,
          tipo: "grupo",
          nome,
          descricao,
        })
        .select()
        .single();

      if (conversaError) throw conversaError;

      // Adicionar todos os participantes da clínica
      await adicionarTodosParticipantes(conversa.id);

      await fetchConversas();
      return conversa;
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast.error("Erro ao criar grupo");
      return null;
    }
  };

  // Criar conversa privada
  const criarConversaPrivada = async (
    outroParticipante: {
      tipo: "medico" | "funcionario" | "admin_clinica";
      id: string;
    }
  ) => {
    if (!clinicaId || !currentUser) return null;

    try {
      // Criar conversa
      const { data: conversa, error: conversaError } = await supabase
        .from("chat_conversas")
        .insert({
          clinica_id: clinicaId,
          tipo: "privado",
          nome: null,
        })
        .select()
        .single();

      if (conversaError) throw conversaError;

      // Adicionar participantes
      const participantes: any[] = [];

      // Adicionar eu mesmo
      if (currentUser.tipo === "clinica") {
        participantes.push({
          conversa_id: conversa.id,
          usuario_id: currentUser.id,
          tipo_participante: "admin_clinica",
        });
      } else if (currentUser.medicoId) {
        participantes.push({
          conversa_id: conversa.id,
          medico_id: currentUser.medicoId,
          tipo_participante: "medico",
        });
      } else if (currentUser.clinicaId) {
        participantes.push({
          conversa_id: conversa.id,
          usuario_clinica_id: currentUser.id,
          tipo_participante: "funcionario",
        });
      }

      // Adicionar outro participante
      if (outroParticipante.tipo === "medico") {
        participantes.push({
          conversa_id: conversa.id,
          medico_id: outroParticipante.id,
          tipo_participante: "medico",
        });
      } else if (outroParticipante.tipo === "funcionario") {
        participantes.push({
          conversa_id: conversa.id,
          usuario_clinica_id: outroParticipante.id,
          tipo_participante: "funcionario",
        });
      } else {
        participantes.push({
          conversa_id: conversa.id,
          usuario_id: outroParticipante.id,
          tipo_participante: "admin_clinica",
        });
      }

      const { error: participantesError } = await supabase
        .from("chat_participantes")
        .insert(participantes);

      if (participantesError) throw participantesError;

      await fetchConversas();
      return conversa;
    } catch (error) {
      console.error("Erro ao criar conversa privada:", error);
      toast.error("Erro ao criar conversa");
      return null;
    }
  };

  // Adicionar todos os participantes da clínica a uma conversa
  const adicionarTodosParticipantes = async (conversaId: string) => {
    if (!clinicaId) return;

    try {
      const participantes: any[] = [];

      // Buscar admin da clínica
      const { data: clinica } = await supabase
        .from("clinicas")
        .select("usuario_id")
        .eq("id", clinicaId)
        .maybeSingle();

      if (clinica?.usuario_id) {
        participantes.push({
          conversa_id: conversaId,
          usuario_id: clinica.usuario_id,
          tipo_participante: "admin_clinica",
        });
      }

      // Buscar médicos da clínica
      const { data: medicosClinica } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);

      for (const mc of medicosClinica || []) {
        participantes.push({
          conversa_id: conversaId,
          medico_id: mc.medico_id,
          tipo_participante: "medico",
        });
      }

      // Buscar funcionários da clínica
      const { data: funcionarios } = await supabase
        .from("usuarios_clinica")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);

      for (const func of funcionarios || []) {
        participantes.push({
          conversa_id: conversaId,
          usuario_clinica_id: func.id,
          tipo_participante: "funcionario",
        });
      }

      if (participantes.length > 0) {
        await supabase.from("chat_participantes").insert(participantes);
      }
    } catch (error) {
      console.error("Erro ao adicionar participantes:", error);
    }
  };

  // Upload de arquivo
  const uploadArquivo = async (file: File): Promise<{ url: string; nome: string; tipo: string } | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${clinicaId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("chat-files")
        .getPublicUrl(filePath);

      return {
        url: publicUrl.publicUrl,
        nome: file.name,
        tipo: file.type,
      };
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar arquivo");
      return null;
    }
  };

  // Função para enviar evento de digitando
  const sendTypingEvent = useCallback((conversaId: string) => {
    if (!currentUser || !typingChannelRef.current) return;

    const myInfo: TypingUser = {
      id: currentUser.medicoId || currentUser.id || "",
      nome: currentUser.nome || "Usuário",
      tipo: currentUser.medicoId 
        ? "medico" 
        : currentUser.tipo === "clinica" 
          ? "admin_clinica" 
          : "funcionario",
    };

    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user: myInfo, conversaId },
    });
  }, [currentUser]);

  // Função para parar de digitar
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // Configurar canal de typing para a conversa atual
  useEffect(() => {
    if (!conversaAtual?.id || !clinicaId) {
      setUsersTyping([]);
      return;
    }

    const channelName = `typing_${conversaAtual.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const { user, conversaId } = payload.payload as { user: TypingUser; conversaId: string };
        
        // Ignorar próprio usuário
        const myId = currentUser?.medicoId || currentUser?.id;
        if (user.id === myId || conversaId !== conversaAtual.id) return;

        // Adicionar usuário à lista de digitando
        setUsersTyping((prev) => {
          const exists = prev.find((u) => u.id === user.id);
          if (exists) return prev;
          return [...prev, user];
        });

        // Remover após 3 segundos de inatividade
        setTimeout(() => {
          setUsersTyping((prev) => prev.filter((u) => u.id !== user.id));
        }, 3000);
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
      setUsersTyping([]);
    };
  }, [conversaAtual?.id, clinicaId, currentUser]);

  // Configurar realtime para mensagens
  useEffect(() => {
    if (!clinicaId) return;

    const channel = supabase
      .channel(`chat_clinica_${clinicaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagens",
        },
        async (payload) => {
          // Verificar se a mensagem é de uma conversa da clínica
          const { data: conversa } = await supabase
            .from("chat_conversas")
            .select("clinica_id")
            .eq("id", payload.new.conversa_id)
            .maybeSingle();

          if (conversa?.clinica_id === clinicaId) {
            // Se estiver na conversa, atualizar mensagens
            if (conversaAtual?.id === payload.new.conversa_id) {
              fetchMensagens(payload.new.conversa_id);
            }
            // Atualizar lista de conversas
            fetchConversas();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicaId, conversaAtual, fetchMensagens, fetchConversas]);

  // Carregar conversas iniciais
  useEffect(() => {
    if (clinicaId) {
      fetchConversas();
    }
  }, [clinicaId, fetchConversas]);

  return {
    conversas,
    conversaAtual,
    setConversaAtual,
    mensagens,
    loading,
    loadingMensagens,
    fetchConversas,
    fetchMensagens,
    enviarMensagem,
    criarGrupoClinica,
    criarConversaPrivada,
    uploadArquivo,
    usersTyping,
    sendTypingEvent,
    stopTyping,
  };
}
