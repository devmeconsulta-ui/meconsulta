import { useState, useEffect, useCallback } from "react";
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
}

interface UseOmniAtendimentosOptions {
  status?: string[];
  agenteId?: string;
  filaId?: string;
}

export function useOmniAtendimentos(clinicaId: string | null, options: UseOmniAtendimentosOptions = {}) {
  const [atendimentos, setAtendimentos] = useState<OmniAtendimento[]>([]);
  const [mensagens, setMensagens] = useState<OmniMensagem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAtendimentos = useCallback(async () => {
    if (!clinicaId) return;

    try {
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

      if (options.status?.length) {
        query = query.in("status", options.status);
      }

      if (options.agenteId) {
        query = query.eq("agente_id", options.agenteId);
      }

      if (options.filaId) {
        query = query.eq("fila_id", options.filaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAtendimentos((data || []) as OmniAtendimento[]);

      // Fetch all mensagens for dashboard metrics
      const { data: msgsData, error: msgsError } = await supabase
        .from("omni_mensagens")
        .select("*")
        .in("atendimento_id", (data || []).map((a: any) => a.id));

      if (!msgsError) {
        setMensagens((msgsData || []) as OmniMensagem[]);
      }
    } catch (error) {
      console.error("Error fetching atendimentos:", error);
      toast.error("Erro ao carregar atendimentos");
    } finally {
      setLoading(false);
    }
  }, [clinicaId, options.status, options.agenteId, options.filaId]);

  useEffect(() => {
    fetchAtendimentos();

    // Subscribe to real-time updates
    if (clinicaId) {
      const channel = supabase
        .channel(`omni_atendimentos_${clinicaId}`)
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

      await fetchAtendimentos();
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

      await fetchAtendimentos();
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

      await fetchAtendimentos();
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
  const [loading, setLoading] = useState(true);

  const fetchMensagens = useCallback(async () => {
    if (!atendimentoId) return;

    try {
      const { data, error } = await supabase
        .from("omni_mensagens")
        .select("*")
        .eq("atendimento_id", atendimentoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMensagens((data || []) as OmniMensagem[]);
    } catch (error) {
      console.error("Error fetching mensagens:", error);
    } finally {
      setLoading(false);
    }
  }, [atendimentoId]);

  useEffect(() => {
    fetchMensagens();

    // Subscribe to real-time updates
    if (atendimentoId) {
      const channel = supabase
        .channel(`omni_mensagens_${atendimentoId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "omni_mensagens",
            filter: `atendimento_id=eq.${atendimentoId}`,
          },
          (payload) => {
            setMensagens((prev) => [...prev, payload.new as OmniMensagem]);
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
            setMensagens((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as OmniMensagem) : m))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [atendimentoId, fetchMensagens]);

  const enviarMensagem = async (
    agenteId: string,
    tipo: OmniMensagem["tipo"],
    conteudo?: string,
    arquivoUrl?: string,
    arquivoNome?: string,
    arquivoTipo?: string
  ) => {
    if (!atendimentoId) return;

    try {
      const response = await supabase.functions.invoke("evolution-send-message", {
        body: {
          atendimento_id: atendimentoId,
          agente_id: agenteId,
          tipo,
          conteudo,
          arquivo_url: arquivoUrl,
          arquivo_nome: arquivoNome,
          arquivo_tipo: arquivoTipo,
        },
      });

      if (response.error) throw response.error;

      return response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
      return null;
    }
  };

  return {
    mensagens,
    loading,
    refetch: fetchMensagens,
    enviarMensagem,
  };
}
