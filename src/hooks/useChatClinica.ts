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
  arquivada?: boolean;
  fixada?: boolean;
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
  reacoes?: Reacao[];
}

interface UseChatClinicaProps {
  clinicaId: string | null;
}

export interface TypingUser {
  id: string;
  nome: string;
  tipo: "admin_clinica" | "medico" | "funcionario";
}

import { playChatNotificationSound, sendChatPushNotification } from "./useChatSettings";

// Controle de cooldown para notificações (5 minutos entre sons)
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos
const lastNotificationTimeByConversation = new Map<string, number>();

// Função para verificar se deve tocar som (cooldown de 5 minutos por conversa)
const shouldPlayNotificationSound = (conversaId: string): boolean => {
  const now = Date.now();
  const lastTime = lastNotificationTimeByConversation.get(conversaId);
  
  // Se nunca tocou ou passou 5 minutos, pode tocar
  if (!lastTime || (now - lastTime) >= NOTIFICATION_COOLDOWN_MS) {
    lastNotificationTimeByConversation.set(conversaId, now);
    return true;
  }
  
  return false;
};

// Função para resetar cooldown quando usuário envia mensagem
const resetNotificationCooldown = (conversaId: string) => {
  lastNotificationTimeByConversation.delete(conversaId);
};

// Função para tocar som de notificação com cooldown
const playNotificationSound = (conversaId: string, forceMention: boolean = false) => {
  // Se foi mencionado, sempre toca
  if (forceMention || shouldPlayNotificationSound(conversaId)) {
    console.log("[Chat Notification] Tocando som (cooldown passou ou menção)");
    playChatNotificationSound();
  } else {
    console.log("[Chat Notification] Som em cooldown para conversa:", conversaId);
  }
};

export interface ChatParticipante {
  id: string;
  nome: string;
  tipo: "medico" | "funcionario" | "admin_clinica";
}

export interface Reacao {
  id: string;
  emoji: string;
  usuario_id?: string;
  usuario_clinica_id?: string;
  medico_id?: string;
  tipo_usuario: "admin_clinica" | "medico" | "funcionario";
  created_at: string;
  usuario_nome?: string;
}

export function useChatClinica({ clinicaId }: UseChatClinicaProps) {
  const { currentUser } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [usersTyping, setUsersTyping] = useState<TypingUser[]>([]);
  const [participantesConversa, setParticipantesConversa] = useState<ChatParticipante[]>([]);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            ultima_leitura,
            arquivada,
            fixada
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

          // Para conversas privadas, buscar nome do outro participante
          let nomeConversa = conversa.nome;
          if (conversa.tipo === "privado") {
            const outroParticipante = conversa.chat_participantes?.find((p: any) => {
              if (currentUser?.tipo === "clinica") {
                return p.usuario_id !== currentUser.id;
              } else if (currentUser?.medicoId) {
                return p.medico_id !== currentUser.medicoId;
              } else if (currentUser?.clinicaId) {
                return p.usuario_clinica_id !== currentUser.id;
              }
              return true;
            });

            if (outroParticipante) {
              if (outroParticipante.medico_id) {
                const { data: medico } = await supabase
                  .from("medicos")
                  .select("nome")
                  .eq("id", outroParticipante.medico_id)
                  .maybeSingle();
                nomeConversa = medico ? `Dr(a). ${medico.nome}` : "Médico";
              } else if (outroParticipante.usuario_clinica_id) {
                const { data: funcionario } = await supabase
                  .from("usuarios_clinica")
                  .select("nome")
                  .eq("id", outroParticipante.usuario_clinica_id)
                  .maybeSingle();
                nomeConversa = funcionario?.nome || "Funcionário";
              } else if (outroParticipante.usuario_id) {
                const { data: usuario } = await supabase
                  .from("usuarios")
                  .select("nome")
                  .eq("id", outroParticipante.usuario_id)
                  .maybeSingle();
                nomeConversa = usuario?.nome || "Administrador";
              }
            }
          }

          // Verificar se está arquivada para o usuário atual
          const estaArquivada = meuParticipante?.arquivada || false;
          const estaFixada = meuParticipante?.fixada || false;

          return {
            ...conversa,
            tipo: conversa.tipo,
            nome: nomeConversa,
            participantes: conversa.chat_participantes,
            ultima_mensagem: ultimaMensagem,
            mensagens_nao_lidas: mensagensNaoLidas,
            arquivada: estaArquivada,
            fixada: estaFixada,
          } as unknown as Conversa;
        })
      );

      // Ordenar: fixadas primeiro, depois por updated_at
      conversasEnriquecidas.sort((a, b) => {
        if (a.fixada && !b.fixada) return -1;
        if (!a.fixada && b.fixada) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

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

      // Buscar reações de todas as mensagens
      const mensagemIds = (data || []).map(m => m.id);
      const { data: reacoesData } = mensagemIds.length > 0 
        ? await supabase
            .from("chat_mensagens_reacoes")
            .select("*")
            .in("mensagem_id", mensagemIds)
        : { data: [] };

      // Agrupar reações por mensagem
      const reacoesPorMensagem: Record<string, Reacao[]> = {};
      for (const r of reacoesData || []) {
        if (!reacoesPorMensagem[r.mensagem_id]) {
          reacoesPorMensagem[r.mensagem_id] = [];
        }
        reacoesPorMensagem[r.mensagem_id].push({
          id: r.id,
          emoji: r.emoji,
          usuario_id: r.usuario_id,
          usuario_clinica_id: r.usuario_clinica_id,
          medico_id: r.medico_id,
          tipo_usuario: r.tipo_usuario as "admin_clinica" | "medico" | "funcionario",
          created_at: r.created_at,
        });
      }

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
            reacoes: reacoesPorMensagem[msg.id] || [],
          } as Mensagem;
        })
      );

      setMensagens(mensagensEnriquecidas as Mensagem[]);

      // Buscar participantes da conversa para menções
      await fetchParticipantesConversa(conversaId);

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

  // Buscar participantes da conversa para menções
  const fetchParticipantesConversa = async (conversaId: string) => {
    try {
      const { data: participantes } = await supabase
        .from("chat_participantes")
        .select("medico_id, usuario_clinica_id, usuario_id, tipo_participante")
        .eq("conversa_id", conversaId);

      if (!participantes) {
        setParticipantesConversa([]);
        return;
      }

      const listaParticipantes: ChatParticipante[] = [];

      for (const p of participantes) {
        if (p.medico_id) {
          const { data: medico } = await supabase
            .from("medicos")
            .select("nome")
            .eq("id", p.medico_id)
            .maybeSingle();
          if (medico) {
            listaParticipantes.push({
              id: p.medico_id,
              nome: `Dr(a). ${medico.nome}`,
              tipo: "medico",
            });
          }
        } else if (p.usuario_clinica_id) {
          const { data: func } = await supabase
            .from("usuarios_clinica")
            .select("nome")
            .eq("id", p.usuario_clinica_id)
            .maybeSingle();
          if (func) {
            listaParticipantes.push({
              id: p.usuario_clinica_id,
              nome: func.nome,
              tipo: "funcionario",
            });
          }
        } else if (p.usuario_id) {
          const { data: user } = await supabase
            .from("usuarios")
            .select("nome")
            .eq("id", p.usuario_id)
            .maybeSingle();
          if (user) {
            listaParticipantes.push({
              id: p.usuario_id,
              nome: user.nome,
              tipo: "admin_clinica",
            });
          }
        }
      }

      // Filtrar para não mostrar o próprio usuário nas sugestões
      const myId = currentUser?.medicoId || currentUser?.id;
      const filtrados = listaParticipantes.filter((p) => p.id !== myId);
      
      setParticipantesConversa(filtrados);
    } catch (error) {
      console.error("Erro ao buscar participantes:", error);
      setParticipantesConversa([]);
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

      // Resetar cooldown de notificação para esta conversa (próxima mensagem recebida tocará som)
      resetNotificationCooldown(conversaId);

      // Atualizar updated_at da conversa
      await supabase
        .from("chat_conversas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversaId);

      // Recarregar mensagens (sem recarregar sidebar)
      await fetchMensagens(conversaId);
      
      // Atualizar apenas a última mensagem da conversa na lista local (sem refetch completo)
      setConversas(prev => prev.map(c => {
        if (c.id === conversaId) {
          return {
            ...c,
            updated_at: new Date().toISOString(),
            ultima_mensagem: {
              id: '',
              conversa_id: conversaId,
              conteudo,
              tipo_mensagem: tipoMensagem,
              created_at: new Date().toISOString(),
            } as any,
          };
        }
        return c;
      }).sort((a, b) => {
        if (a.fixada && !b.fixada) return -1;
        if (!a.fixada && b.fixada) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }));
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
      // Primeiro, verificar se já existe uma conversa privada entre esses dois participantes
      const { data: conversasExistentes } = await supabase
        .from("chat_conversas")
        .select(`
          id,
          tipo,
          chat_participantes (
            usuario_id,
            usuario_clinica_id,
            medico_id
          )
        `)
        .eq("clinica_id", clinicaId)
        .eq("tipo", "privado");

      // Identificar meus IDs
      const meuUsuarioId = currentUser.tipo === "clinica" ? currentUser.id : null;
      const meuMedicoId = currentUser.medicoId || null;
      const meuUsuarioClinicaId = currentUser.tipo !== "clinica" && !currentUser.medicoId ? currentUser.id : null;

      // Identificar IDs do outro participante
      const outroUsuarioId = outroParticipante.tipo === "admin_clinica" ? outroParticipante.id : null;
      const outroMedicoId = outroParticipante.tipo === "medico" ? outroParticipante.id : null;
      const outroUsuarioClinicaId = outroParticipante.tipo === "funcionario" ? outroParticipante.id : null;

      // Verificar se já existe conversa entre esses dois
      for (const conversa of conversasExistentes || []) {
        const participantes = conversa.chat_participantes || [];
        if (participantes.length !== 2) continue;

        const temEu = participantes.some((p: any) => 
          (meuUsuarioId && p.usuario_id === meuUsuarioId) ||
          (meuMedicoId && p.medico_id === meuMedicoId) ||
          (meuUsuarioClinicaId && p.usuario_clinica_id === meuUsuarioClinicaId)
        );

        const temOutro = participantes.some((p: any) => 
          (outroUsuarioId && p.usuario_id === outroUsuarioId) ||
          (outroMedicoId && p.medico_id === outroMedicoId) ||
          (outroUsuarioClinicaId && p.usuario_clinica_id === outroUsuarioClinicaId)
        );

        if (temEu && temOutro) {
          // Conversa já existe, retornar ela
          toast.info("Conversa já existe. Abrindo...");
          await fetchConversas();
          return conversa;
        }
      }

      // Criar nova conversa se não existe
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

  // Arquivar conversa (para o usuário atual)
  const arquivarConversa = async (conversaId: string, arquivar: boolean = true) => {
    console.log("arquivarConversa chamado", { conversaId, arquivar, currentUser });
    if (!currentUser) {
      console.log("currentUser é null");
      return;
    }

    try {
      let updateQuery = supabase
        .from("chat_participantes")
        .update({ arquivada: arquivar })
        .eq("conversa_id", conversaId);

      if (currentUser.tipo === "clinica") {
        console.log("Filtrando por usuario_id (clinica)", currentUser.id);
        updateQuery = updateQuery.eq("usuario_id", currentUser.id);
      } else if (currentUser.medicoId) {
        console.log("Filtrando por medico_id", currentUser.medicoId);
        updateQuery = updateQuery.eq("medico_id", currentUser.medicoId);
      } else if (currentUser.clinicaId) {
        console.log("Filtrando por usuario_clinica_id", currentUser.id);
        updateQuery = updateQuery.eq("usuario_clinica_id", currentUser.id);
      }

      const { error, data, count } = await updateQuery.select();
      console.log("Resultado do update:", { error, data, count });
      if (error) throw error;

      // Limpar conversa atual se for a arquivada
      if (arquivar && conversaAtual?.id === conversaId) {
        setConversaAtual(null);
        setMensagens([]);
      }

      toast.success(arquivar ? "Conversa arquivada" : "Conversa desarquivada");
      await fetchConversas();
    } catch (error) {
      console.error("Erro ao arquivar conversa:", error);
      toast.error("Erro ao arquivar conversa");
    }
  };

  // Fixar conversa (para o usuário atual)
  const fixarConversa = async (conversaId: string, fixar: boolean = true) => {
    if (!currentUser) return;

    try {
      let updateQuery = supabase
        .from("chat_participantes")
        .update({ fixada: fixar })
        .eq("conversa_id", conversaId);

      if (currentUser.tipo === "clinica") {
        updateQuery = updateQuery.eq("usuario_id", currentUser.id);
      } else if (currentUser.medicoId) {
        updateQuery = updateQuery.eq("medico_id", currentUser.medicoId);
      } else if (currentUser.clinicaId) {
        updateQuery = updateQuery.eq("usuario_clinica_id", currentUser.id);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      toast.success(fixar ? "Conversa fixada" : "Conversa desafixada");
      await fetchConversas();
    } catch (error) {
      console.error("Erro ao fixar conversa:", error);
      toast.error("Erro ao fixar conversa");
    }
  };
  const excluirConversa = async (conversaId: string) => {
    console.log("excluirConversa chamado", { conversaId });
    try {
      // Primeiro excluir mensagens
      const { error: msgError } = await supabase
        .from("chat_mensagens")
        .delete()
        .eq("conversa_id", conversaId);
      console.log("Mensagens excluídas:", { msgError });

      // Excluir participantes
      const { error: partError } = await supabase
        .from("chat_participantes")
        .delete()
        .eq("conversa_id", conversaId);
      console.log("Participantes excluídos:", { partError });

      // Excluir conversa
      const { error } = await supabase
        .from("chat_conversas")
        .delete()
        .eq("id", conversaId);
      console.log("Conversa excluída:", { error });

      if (error) throw error;

      // Limpar conversa atual se for a excluída
      if (conversaAtual?.id === conversaId) {
        setConversaAtual(null);
        setMensagens([]);
      }

      toast.success("Conversa excluída com sucesso");
      await fetchConversas();
    } catch (error) {
      console.error("Erro ao excluir conversa:", error);
      toast.error("Erro ao excluir conversa");
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

    console.log("[Chat Realtime] Configurando subscription para clinica:", clinicaId);
    console.log("[Chat Realtime] currentUser:", currentUser);

    const channelName = `chat_mensagens_clinica_${clinicaId}_${Date.now()}`;
    console.log("[Chat Realtime] Canal:", channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // Escutar todos os eventos para debug
          schema: "public",
          table: "chat_mensagens",
        },
        async (payload) => {
          console.log("[Chat Realtime] Evento recebido:", payload.eventType, payload.new);
          
          // Só processar INSERTs
          if (payload.eventType !== "INSERT") return;
          // Verificar se a mensagem é de uma conversa da clínica
          const { data: conversa } = await supabase
            .from("chat_conversas")
            .select("clinica_id")
            .eq("id", payload.new.conversa_id)
            .maybeSingle();

          if (conversa?.clinica_id === clinicaId) {
            // Verificar se a mensagem não é do próprio usuário
            const novaMensagem = payload.new as any;
            
            // Debug: log para identificar o problema
            console.log("[Chat Notification] Nova mensagem recebida:", {
              remetente_usuario_id: novaMensagem.remetente_usuario_id,
              remetente_medico_id: novaMensagem.remetente_medico_id,
              remetente_usuario_clinica_id: novaMensagem.remetente_usuario_clinica_id,
              currentUser: {
                id: currentUser?.id,
                medicoId: currentUser?.medicoId,
                clinicaId: currentUser?.clinicaId,
                tipo: currentUser?.tipo
              }
            });
            
            const ehMinhaMsg = 
              // Admin da clínica (tipo "clinica" e usa remetente_usuario_id)
              (currentUser?.tipo === "clinica" && novaMensagem.remetente_usuario_id === currentUser.id) ||
              // Médico (usa remetente_medico_id)
              (currentUser?.medicoId && novaMensagem.remetente_medico_id === currentUser.medicoId) ||
              // Funcionário da clínica (tem clinicaId mas não é tipo "clinica", usa remetente_usuario_clinica_id com currentUser.id)
              (currentUser?.clinicaId && currentUser?.tipo !== "clinica" && novaMensagem.remetente_usuario_clinica_id === currentUser.id);

            console.log("[Chat Notification] É minha mensagem?", ehMinhaMsg);

            // Verificar se fui mencionado na mensagem
            const meuNome = currentUser?.nome || "";
            const foiMencionado = novaMensagem.conteudo && 
              meuNome && 
              novaMensagem.conteudo.toLowerCase().includes(`@${meuNome.toLowerCase().split(" ")[0]}`);

            // Tocar som e enviar push se não for minha mensagem
            if (!ehMinhaMsg) {
              // Tocar som com cooldown (menção sempre toca)
              playNotificationSound(novaMensagem.conversa_id, foiMencionado);
              
              // Enviar notificação push (se documento não estiver visível OU se foi mencionado)
              if (document.hidden || foiMencionado) {
                // Buscar nome do remetente para a notificação
                let remetenteNome = "Alguém";
                if (novaMensagem.remetente_medico_id) {
                  const { data: medico } = await supabase
                    .from("medicos")
                    .select("nome")
                    .eq("id", novaMensagem.remetente_medico_id)
                    .maybeSingle();
                  remetenteNome = medico ? `Dr(a). ${medico.nome}` : "Médico";
                } else if (novaMensagem.remetente_usuario_clinica_id) {
                  const { data: func } = await supabase
                    .from("usuarios_clinica")
                    .select("nome")
                    .eq("id", novaMensagem.remetente_usuario_clinica_id)
                    .maybeSingle();
                  remetenteNome = func?.nome || "Funcionário";
                } else if (novaMensagem.remetente_usuario_id) {
                  const { data: user } = await supabase
                    .from("usuarios")
                    .select("nome")
                    .eq("id", novaMensagem.remetente_usuario_id)
                    .maybeSingle();
                  remetenteNome = user?.nome || "Administrador";
                }

                // Notificação especial para menções
                if (foiMencionado) {
                  sendChatPushNotification(
                    `📢 ${remetenteNome} mencionou você!`,
                    novaMensagem.conteudo || "Você foi mencionado em uma mensagem",
                  );
                  // Mostrar toast de menção mesmo se a página estiver visível
                  if (!document.hidden) {
                    toast.info(`${remetenteNome} mencionou você no chat!`, {
                      action: {
                        label: "Ver",
                        onClick: () => {
                          if (payload.new.conversa_id !== conversaAtual?.id) {
                            fetchMensagens(payload.new.conversa_id);
                          }
                        },
                      },
                    });
                  }
                } else {
                  sendChatPushNotification(
                    `Nova mensagem de ${remetenteNome}`,
                    novaMensagem.conteudo || "Enviou um arquivo",
                  );
                }
              }
            }

            // Se estiver na conversa, atualizar mensagens
            if (conversaAtual?.id === payload.new.conversa_id) {
              fetchMensagens(payload.new.conversa_id);
            }
            // Atualizar lista de conversas
            fetchConversas();
          }
        }
      )
      .subscribe((status) => {
        console.log("[Chat Realtime] Status da subscription:", status);
      });

    return () => {
      console.log("[Chat Realtime] Removendo canal");
      supabase.removeChannel(channel);
    };
  }, [clinicaId, conversaAtual, fetchMensagens, fetchConversas, currentUser]);

  // Carregar conversas iniciais
  useEffect(() => {
    if (clinicaId) {
      fetchConversas();
    }
  }, [clinicaId, fetchConversas]);

  // Adicionar reação a uma mensagem
  const adicionarReacao = async (mensagemId: string, emoji: string) => {
    if (!currentUser) return;

    try {
      const novaReacao: any = {
        mensagem_id: mensagemId,
        emoji,
      };

      if (currentUser.tipo === "clinica") {
        novaReacao.usuario_id = currentUser.id;
        novaReacao.tipo_usuario = "admin_clinica";
      } else if (currentUser.medicoId) {
        novaReacao.medico_id = currentUser.medicoId;
        novaReacao.tipo_usuario = "medico";
      } else if (currentUser.clinicaId) {
        novaReacao.usuario_clinica_id = currentUser.id;
        novaReacao.tipo_usuario = "funcionario";
      }

      const { error } = await supabase
        .from("chat_mensagens_reacoes")
        .insert(novaReacao);

      if (error) {
        // Se já existe, ignorar
        if (error.code === "23505") return;
        throw error;
      }

      // Atualizar mensagens localmente
      setMensagens(prev => prev.map(msg => {
        if (msg.id === mensagemId) {
          const novaReacaoObj: Reacao = {
            id: Date.now().toString(),
            emoji,
            usuario_id: novaReacao.usuario_id,
            usuario_clinica_id: novaReacao.usuario_clinica_id,
            medico_id: novaReacao.medico_id,
            tipo_usuario: novaReacao.tipo_usuario,
            created_at: new Date().toISOString(),
          };
          return {
            ...msg,
            reacoes: [...(msg.reacoes || []), novaReacaoObj],
          };
        }
        return msg;
      }));
    } catch (error) {
      console.error("Erro ao adicionar reação:", error);
    }
  };

  // Remover reação de uma mensagem
  const removerReacao = async (mensagemId: string, emoji: string) => {
    if (!currentUser) return;

    try {
      let query = supabase
        .from("chat_mensagens_reacoes")
        .delete()
        .eq("mensagem_id", mensagemId)
        .eq("emoji", emoji);

      if (currentUser.tipo === "clinica") {
        query = query.eq("usuario_id", currentUser.id);
      } else if (currentUser.medicoId) {
        query = query.eq("medico_id", currentUser.medicoId);
      } else if (currentUser.clinicaId) {
        query = query.eq("usuario_clinica_id", currentUser.id);
      }

      const { error } = await query;
      if (error) throw error;

      // Atualizar mensagens localmente
      const meuId = currentUser.medicoId || currentUser.id;
      setMensagens(prev => prev.map(msg => {
        if (msg.id === mensagemId) {
          return {
            ...msg,
            reacoes: (msg.reacoes || []).filter(r => {
              const reacaoUserId = r.medico_id || r.usuario_id || r.usuario_clinica_id;
              return !(r.emoji === emoji && reacaoUserId === meuId);
            }),
          };
        }
        return msg;
      }));
    } catch (error) {
      console.error("Erro ao remover reação:", error);
    }
  };

  // Toggle reação (adicionar se não existe, remover se já existe)
  const toggleReacao = async (mensagemId: string, emoji: string) => {
    if (!currentUser) return;

    const mensagem = mensagens.find(m => m.id === mensagemId);
    if (!mensagem) return;

    const meuId = currentUser.medicoId || currentUser.id;
    const minhaReacao = (mensagem.reacoes || []).find(r => {
      const reacaoUserId = r.medico_id || r.usuario_id || r.usuario_clinica_id;
      return r.emoji === emoji && reacaoUserId === meuId;
    });

    if (minhaReacao) {
      await removerReacao(mensagemId, emoji);
    } else {
      await adicionarReacao(mensagemId, emoji);
    }
  };

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
    arquivarConversa,
    excluirConversa,
    fixarConversa,
    uploadArquivo,
    usersTyping,
    sendTypingEvent,
    stopTyping,
    participantesConversa,
    toggleReacao,
  };
}
