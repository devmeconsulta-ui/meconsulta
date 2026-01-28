import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Confirmacao {
  id: string;
  clinica_id: string;
  consulta_id: string;
  paciente_id: string | null;
  fila_id: string | null;
  telefone: string;
  mensagem_enviada: string | null;
  link_confirmacao: string | null;
  token_confirmacao: string;
  status: string;
  data_envio: string | null;
  data_resposta: string | null;
  whatsapp_message_id: string | null;
  erro_descricao: string | null;
  created_at: string;
}

interface ConfirmacaoComDetalhes extends Confirmacao {
  consulta: any;
}

interface SendConfirmationParams {
  consulta_ids: string[];
  fila_id: string;
  clinica_id: string;
  mensagem_template: string;
  intervalo_min?: number;
  intervalo_max?: number;
  agendar_para?: string | null; // ISO datetime para agendamento
}

interface Metrics {
  total: number;
  enviadas: number;
  confirmadas: number;
  recusadas: number;
  aguardando: number;
  erros: number;
  taxaConfirmacao: number;
}

export function useConfirmacaoAgenda(clinicaId: string | null) {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  // Buscar confirmações
  const {
    data: confirmacoes = [],
    isLoading: isLoadingConfirmacoes,
    refetch: refetchConfirmacoes,
  } = useQuery({
    queryKey: ["confirmacoes-agenda", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];

      // @ts-ignore - tipo complexo
      const { data, error } = await supabase
        .from("confirmacoes_agenda")
        .select(`
          *,
          consulta:consultas(
            id,
            data_hora,
            status_consulta,
            paciente:pacientes(id, nome, telefone),
            medico:medicos(id, nome, especialidade)
          )
        `)
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ConfirmacaoComDetalhes[];
    },
    enabled: !!clinicaId,
  });

  // Buscar métricas
  const metrics: Metrics = {
    total: confirmacoes.length,
    enviadas: confirmacoes.filter((c) => c.status === "enviada").length,
    confirmadas: confirmacoes.filter((c) => c.status === "confirmada").length,
    recusadas: confirmacoes.filter((c) => c.status === "recusada").length,
    aguardando: confirmacoes.filter((c) => c.status === "enviada").length,
    erros: confirmacoes.filter((c) => c.status === "erro").length,
    taxaConfirmacao:
      confirmacoes.length > 0
        ? Math.round(
            (confirmacoes.filter((c) => c.status === "confirmada").length /
              confirmacoes.filter((c) =>
                ["confirmada", "recusada"].includes(c.status)
              ).length) *
              100
          ) || 0
        : 0,
  };

  // Buscar consultas disponíveis para envio (sem confirmação pendente)
  const {
    data: consultasDisponiveis = [],
    isLoading: isLoadingConsultas,
    refetch: refetchConsultas,
  } = useQuery({
    queryKey: ["consultas-para-confirmacao", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];

      // Buscar IDs de consultas que já têm confirmação
      // @ts-ignore
      const { data: confirmadas } = await supabase
        .from("confirmacoes_agenda")
        .select("consulta_id")
        .eq("clinica_id", clinicaId)
        .in("status", ["pendente", "enviada", "confirmada"]);

      const idsConfirmados = confirmadas?.map((c) => c.consulta_id) || [];

      // Buscar consultas futuras sem confirmação
      const hoje = new Date().toISOString();

      // @ts-ignore - relacionamento ambíguo entre medicos e consultas
      let query = supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          status_pagamento,
          paciente:pacientes!consultas_paciente_id_fkey(id, nome, telefone),
          medico:medicos!consultas_medico_id_fkey(id, nome, especialidade),
          local:locais_atendimento!consultas_local_id_fkey(id, nome_local)
        `)
        .eq("clinica_id", clinicaId)
        .gte("data_hora", hoje)
        .in("status_consulta", ["agendada", "aguardando_pagamento", "confirmada", "paga"])
        .order("data_hora", { ascending: true });

      if (idsConfirmados.length > 0) {
        // Filtrar consultas que não estão na lista de confirmadas
        query = query.not("id", "in", `(${idsConfirmados.join(",")})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicaId,
  });

  // Enviar confirmações em lote
  const sendConfirmations = async (params: SendConfirmationParams) => {
    setIsSending(true);
    setSendProgress({ current: 0, total: params.consulta_ids.length });

    try {
      const baseUrl = window.location.origin;

      // Usar supabase.functions.invoke em vez de fetch direto
      const { data: result, error } = await supabase.functions.invoke(
        "send-confirmation-batch",
        {
          body: {
            ...params,
            base_url: baseUrl,
          },
        }
      );

      if (error) throw error;

      if (result?.success) {
        const isAgendado = !!params.agendar_para;
        toast({
          title: isAgendado ? "Envio agendado!" : "Envio concluído",
          description: isAgendado 
            ? `${result.agendadas} mensagens agendadas para envio`
            : `${result.enviadas} mensagens enviadas, ${result.falhas} falhas`,
        });

        // Atualizar dados
        refetchConfirmacoes();
        refetchConsultas();
      } else {
        throw new Error(result?.error || "Erro desconhecido");
      }

      return result;
    } catch (error: any) {
      toast({
        title: "Erro no envio",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSending(false);
      setSendProgress({ current: 0, total: 0 });
    }
  };

  // Buscar filas disponíveis
  const { data: filas = [] } = useQuery({
    queryKey: ["omni-filas-confirmacao", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];

      // @ts-ignore
      const { data, error } = await supabase
        .from("omni_filas")
        .select(`
          id,
          nome,
          instancia:omni_instancias(id, nome, status)
        `)
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);

      if (error) throw error;

      // Filtrar apenas filas com instância conectada
      return (data || []).filter(
        (f: any) => f.instancia?.status === "connected"
      );
    },
    enabled: !!clinicaId,
  });

  // Buscar médicos da clínica
  const { data: medicosClinica = [] } = useQuery({
    queryKey: ["medicos-clinica-confirmacao", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];

      // @ts-ignore
      const { data, error } = await supabase
        .from("clinicas_medicos")
        .select(`
          medico:medicos(id, nome, especialidade)
        `)
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);

      if (error) throw error;

      return (data || []).map((cm: any) => cm.medico).filter(Boolean);
    },
    enabled: !!clinicaId,
  });

  return {
    confirmacoes,
    consultasDisponiveis,
    filas,
    medicosClinica,
    metrics,
    isLoadingConfirmacoes,
    isLoadingConsultas,
    isSending,
    sendProgress,
    sendConfirmations,
    refetchConfirmacoes,
    refetchConsultas,
  };
}
