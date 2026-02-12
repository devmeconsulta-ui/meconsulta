import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OmniContato {
  id: string;
  clinica_id: string;
  nome: string;
  telefone: string;
  documento: string | null;
  email: string | null;
  instagram: string | null;
  foto_url: string | null;
  etiquetas: string[];
  empresa: string | null;
  observacoes: string | null;
  paciente_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OmniAtendimento {
  id: string;
  clinica_id: string;
  fila_id: string | null;
  contato_id: string;
  agente_id: string | null;
  protocolo: number;
  status: "aguardando" | "em_atendimento" | "finalizado" | "abandonado";
  canal: "whatsapp" | "instagram" | "telegram";
  prioridade: "baixa" | "normal" | "alta" | "urgente";
  motivo_fechamento: string | null;
  avaliacao_nota: number | null;
  avaliacao_comentario: string | null;
  tempo_primeira_resposta: number | null;
  tempo_total_atendimento: number | null;
  data_abertura: string;
  data_primeira_resposta: string | null;
  data_fechamento: string | null;
  etiquetas: string[];
  created_at: string;
  updated_at: string;
  contato?: OmniContato;
  fila?: { id: string; nome: string; cor: string };
  agente?: { id: string; nome: string };
}

export interface OmniMensagem {
  id: string;
  atendimento_id: string;
  contato_id: string | null;
  agente_id: string | null;
  agente_nome?: string | null;
  tipo: "texto" | "imagem" | "audio" | "video" | "documento" | "localizacao" | "contato" | "sticker";
  direcao: "entrada" | "saida";
  conteudo: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
  whatsapp_message_id: string | null;
  status: "enviada" | "entregue" | "lida" | "erro";
  erro_descricao: string | null;
  created_at: string;
  encaminhada?: boolean;
}

interface UseOmniAtendimentosOptions {
  status?: string[];
  agenteId?: string;
  filaId?: string;
}

export function useOmniAtendimentos(clinicaId: string | null, options: UseOmniAtendimentosOptions = {}) {
  // Destructure options to get stable primitive values for dependencies
  const statusFilter = options.status;
  const agenteIdFilter = options.agenteId;
  const filaIdFilter = options.filaId;
  
  // Create stable string representations for dependency tracking
  const statusKey = statusFilter?.join(",") || "";
  const agenteKey = agenteIdFilter || "";
  const filaKey = filaIdFilter || "";

  const [atendimentos, setAtendimentos] = useState<OmniAtendimento[]>([]);
  const [mensagens, setMensagens] = useState<OmniMensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchAtendimentos = useCallback(async () => {
    if (!clinicaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("omni_atendimentos")
        .select(`
          *,
          contato:omni_contatos!contato_id(*),
          fila:omni_filas!fila_id(id, nome, cor),
          agente:usuarios_clinica!agente_id(id, nome)
        `)
        .eq("clinica_id", clinicaId)
        .order("data_abertura", { ascending: false });

      if (statusFilter?.length) {
        query = query.in("status", statusFilter);
      }

      if (agenteIdFilter) {
        query = query.eq("agente_id", agenteIdFilter);
      }

      if (filaIdFilter) {
        query = query.eq("fila_id", filaIdFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAtendimentos((data || []) as OmniAtendimento[]);
      setHasFetched(true);

      // Fetch all mensagens for dashboard metrics
      if (data && data.length > 0) {
        const { data: msgsData, error: msgsError } = await supabase
          .from("omni_mensagens")
          .select("*")
          .in("atendimento_id", data.map((a: any) => a.id));

        if (!msgsError) {
          setMensagens((msgsData || []) as OmniMensagem[]);
        }
      } else {
        setMensagens([]);
      }
    } catch (error) {
      console.error("Error fetching atendimentos:", error);
      toast.error("Erro ao carregar atendimentos");
    } finally {
      setLoading(false);
    }
  }, [clinicaId, statusKey, agenteKey, filaKey]);

  // Debounced refetch to prevent rapid successive fetches from realtime
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedFetch = useCallback(() => {
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    refetchTimeoutRef.current = setTimeout(() => {
      fetchAtendimentos();
      refetchTimeoutRef.current = null;
    }, 1000);
  }, [fetchAtendimentos]);

  useEffect(() => {
    fetchAtendimentos();

    // Subscribe to real-time updates
    if (clinicaId) {
      const channel = supabase
        .channel(`omni_atendimentos_${clinicaId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "omni_atendimentos",
            filter: `clinica_id=eq.${clinicaId}`,
          },
          () => {
            debouncedFetch();
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
            setAtendimentos(prev => {
              if (statusFilter?.length && !statusFilter.includes(updated.status)) {
                return prev.filter(a => a.id !== updated.id);
              }
              const exists = prev.some(a => a.id === updated.id);
              if (exists) {
                return prev.map(a => 
                  a.id === updated.id 
                    ? { ...a, ...updated, contato: a.contato, fila: a.fila, agente: a.agente }
                    : a
                );
              }
              debouncedFetch();
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
  }, [clinicaId, fetchAtendimentos, debouncedFetch]);

  const atribuirAtendimento = async (atendimentoId: string, agenteId: string) => {
    try {
      const { error } = await supabase
        .from("omni_atendimentos")
        .update({
          agente_id: agenteId,
          status: "em_atendimento",
          data_primeira_resposta: new Date().toISOString(),
        })
        .eq("id", atendimentoId);

      if (error) throw error;

      // Optimistic local update
      setAtendimentos(prev => prev.map(a => 
        a.id === atendimentoId 
          ? { ...a, agente_id: agenteId, status: "em_atendimento" as const }
          : a
      ));
      toast.success("Atendimento atribuído com sucesso");
    } catch (error) {
      console.error("Error assigning atendimento:", error);
      toast.error("Erro ao atribuir atendimento");
    }
  };

  const transferirAtendimento = async (
    atendimentoId: string,
    novoAgenteId?: string,
    novaFilaId?: string
  ) => {
    try {
      const atendimento = atendimentos.find((a) => a.id === atendimentoId);
      if (!atendimento) return;

      const { error } = await supabase
        .from("omni_atendimentos")
        .update({
          agente_id: novoAgenteId || null,
          fila_id: novaFilaId || atendimento.fila_id,
          transferido_de_agente_id: atendimento.agente_id,
          transferido_de_fila_id: atendimento.fila_id,
          status: novoAgenteId ? "em_atendimento" : "aguardando",
        })
        .eq("id", atendimentoId);

      if (error) throw error;

      // Optimistic local update
      setAtendimentos(prev => prev.map(a => 
        a.id === atendimentoId 
          ? { ...a, agente_id: novoAgenteId || null, fila_id: novaFilaId || a.fila_id, status: (novoAgenteId ? "em_atendimento" : "aguardando") as any }
          : a
      ));
      toast.success("Atendimento transferido com sucesso");
    } catch (error) {
      console.error("Error transferring atendimento:", error);
      toast.error("Erro ao transferir atendimento");
    }
  };

  const finalizarAtendimento = async (atendimentoId: string, motivoFechamento?: string) => {
    try {
      const atendimento = atendimentos.find((a) => a.id === atendimentoId);
      if (!atendimento) return;

      const tempoTotal = atendimento.data_abertura
        ? Math.floor((Date.now() - new Date(atendimento.data_abertura).getTime()) / 1000)
        : null;

      const { error } = await supabase
        .from("omni_atendimentos")
        .update({
          status: "finalizado",
          data_fechamento: new Date().toISOString(),
          motivo_fechamento: motivoFechamento,
          tempo_total_atendimento: tempoTotal,
        })
        .eq("id", atendimentoId);

      if (error) throw error;

      // Optimistic: remove from list
      setAtendimentos(prev => prev.filter(a => a.id !== atendimentoId));
      toast.success("Atendimento finalizado");
    } catch (error) {
      console.error("Error finalizing atendimento:", error);
      toast.error("Erro ao finalizar atendimento");
    }
  };

  return {
    atendimentos,
    mensagens,
    loading,
    refetch: fetchAtendimentos,
    atribuirAtendimento,
    transferirAtendimento,
    finalizarAtendimento,
  };
}

export function useOmniMensagens(atendimentoId: string | null) {
  const [mensagens, setMensagens] = useState<OmniMensagem[]>([]);
  const [historicoMensagens, setHistoricoMensagens] = useState<OmniMensagem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMensagens = useCallback(async () => {
    if (!atendimentoId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch current atendimento messages
      const { data, error } = await supabase
        .from("omni_mensagens")
        .select(`
          *,
          agente:usuarios_clinica!agente_id(id, nome)
        `)
        .eq("atendimento_id", atendimentoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      const mensagensComAgente = (data || []).map((msg: any) => ({
        ...msg,
        agente_nome: msg.agente?.nome || null,
        agente: undefined,
      })) as OmniMensagem[];
      
      setMensagens(mensagensComAgente);

      // Fetch previous atendimentos history for the same contact
      const { data: atendimentoData } = await supabase
        .from("omni_atendimentos")
        .select("contato_id")
        .eq("id", atendimentoId)
        .single();

      if (atendimentoData?.contato_id) {
        // Get all previous atendimento IDs for this contact (excluding current)
        const { data: prevAtendimentos } = await supabase
          .from("omni_atendimentos")
          .select("id")
          .eq("contato_id", atendimentoData.contato_id)
          .neq("id", atendimentoId)
          .order("data_abertura", { ascending: false })
          .limit(10);

        if (prevAtendimentos && prevAtendimentos.length > 0) {
          const prevIds = prevAtendimentos.map(a => a.id);
          const { data: histData } = await supabase
            .from("omni_mensagens")
            .select(`
              *,
              agente:usuarios_clinica!agente_id(id, nome)
            `)
            .in("atendimento_id", prevIds)
            .order("created_at", { ascending: true });

          if (histData) {
            const histMensagens = histData.map((msg: any) => ({
              ...msg,
              agente_nome: msg.agente?.nome || null,
              agente: undefined,
            })) as OmniMensagem[];
            setHistoricoMensagens(histMensagens);
          }
        } else {
          setHistoricoMensagens([]);
        }
      }
    } catch (error) {
      console.error("Error fetching mensagens:", error);
    } finally {
      setLoading(false);
    }
  }, [atendimentoId]);

  useEffect(() => {
    fetchMensagens();

    // Subscribe to real-time updates for this specific atendimento
    if (atendimentoId) {
      console.log(`[Realtime] Subscribing to omni_mensagens for atendimento: ${atendimentoId}`);
      
      const channel = supabase
        .channel(`omni_mensagens_realtime_${atendimentoId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "omni_mensagens",
            filter: `atendimento_id=eq.${atendimentoId}`,
          },
          (payload) => {
            console.log("[Realtime] New message received:", payload.new);
            setMensagens((prev) => {
              // Avoid duplicates
              const exists = prev.some((m) => m.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as OmniMensagem];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "omni_mensagens",
            filter: `atendimento_id=eq.${atendimentoId}`,
          },
          (payload) => {
            console.log("[Realtime] Message updated:", payload.new);
            setMensagens((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...payload.new as OmniMensagem, agente_nome: m.agente_nome } : m))
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "omni_mensagens",
            filter: `atendimento_id=eq.${atendimentoId}`,
          },
          (payload) => {
            console.log("[Realtime] Message deleted:", payload.old);
            setMensagens((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Subscription status for mensagens: ${status}`);
        });

      // Fallback polling para sincronizar status de mensagens - a cada 30 segundos
      const pollInterval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from("omni_mensagens")
            .select("id, status")
            .eq("atendimento_id", atendimentoId)
            .eq("direcao", "saida")
            .neq("status", "lida")
            .order("created_at", { ascending: false })
            .limit(20);

          if (data && data.length > 0) {
            setMensagens((prev) => {
              let updated = false;
              const newMensagens = prev.map((m) => {
                const serverMsg = data.find((d) => d.id === m.id);
                if (serverMsg && serverMsg.status !== m.status) {
                  updated = true;
                  return { ...m, status: serverMsg.status as OmniMensagem["status"] };
                }
                return m;
              });
              return updated ? newMensagens : prev;
            });
          }
        } catch (err) {
          console.error("[Polling] Error syncing message status:", err);
        }
      }, 30000);

      return () => {
        console.log(`[Realtime] Unsubscribing from omni_mensagens for atendimento: ${atendimentoId}`);
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [atendimentoId, fetchMensagens]);

  // Fire-and-forget message sending for instant UI response
  const enviarMensagem = (
    agenteId: string | null,
    tipo: OmniMensagem["tipo"],
    conteudo?: string,
    arquivoUrl?: string,
    arquivoNome?: string,
    arquivoTipo?: string
  ): void => {
    if (!atendimentoId) {
      toast.error("Atendimento não selecionado");
      return;
    }

    // Fire and forget - don't await, let it run in background
    supabase.functions.invoke("evolution-send-message", {
      body: {
        atendimento_id: atendimentoId,
        agente_id: agenteId,
        tipo,
        conteudo,
        arquivo_url: arquivoUrl,
        arquivo_nome: arquivoNome,
        arquivo_tipo: arquivoTipo,
      },
    }).then(response => {
      if (response.error) {
        console.error("Edge function error:", response.error);
        toast.error("Erro ao enviar mensagem");
        return;
      }
      
      if (response.data?.error) {
        const errorMsg = response.data.error;
        const details = response.data.details || "";
        console.error("Edge function error:", errorMsg, details);
        toast.error(errorMsg, { description: details });
      }
    }).catch(error => {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    });
  };

  const editarMensagem = async (mensagemId: string, novoConteudo: string) => {
    try {
      setMensagens(prev => prev.map(m => 
        m.id === mensagemId ? { ...m, conteudo: novoConteudo } : m
      ));

      const { data, error } = await supabase.functions.invoke("evolution-edit-message", {
        body: { mensagem_id: mensagemId, novo_conteudo: novoConteudo },
      });

      if (error || data?.error) {
        console.error("Error editing message:", error || data?.error);
        fetchMensagens();
        toast.error("Erro ao editar mensagem");
      }
    } catch (err) {
      console.error("Error editing message:", err);
      fetchMensagens();
      toast.error("Erro ao editar mensagem");
    }
  };

  const apagarMensagem = async (mensagemId: string) => {
    try {
      setMensagens(prev => prev.filter(m => m.id !== mensagemId));

      const { data, error } = await supabase.functions.invoke("evolution-delete-message", {
        body: { mensagem_id: mensagemId },
      });

      if (error || data?.error) {
        console.error("Error deleting message:", error || data?.error);
        fetchMensagens();
        toast.error("Erro ao apagar mensagem");
      } else {
        toast.success("Mensagem apagada");
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      fetchMensagens();
      toast.error("Erro ao apagar mensagem");
    }
  };

  return {
    mensagens,
    historicoMensagens,
    loading,
    refetch: fetchMensagens,
    enviarMensagem,
    editarMensagem,
    apagarMensagem,
  };
}
