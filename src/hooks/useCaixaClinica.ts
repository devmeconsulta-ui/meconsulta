import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";

interface MovimentoCaixa {
  id: string;
  tipo: "entrada" | "saida" | "sangria" | "reforco";
  valor: number;
  descricao: string;
  forma_pagamento?: string;
  hora: string;
  consulta_id?: string;
}

interface ConsultaNaoSincronizada {
  id: string;
  valor_consulta: number;
  nome_paciente_consulta: string | null;
  origem: string;
  medico?: { nome: string } | null;
  paciente?: { nome: string } | null;
  formas_pagamento?: { tipo: string; valor: number }[] | null;
}

interface CaixaState {
  caixaAberto: boolean;
  operacaoAberturaId: string | null;
  saldoAbertura: number;
  saldoAtual: number;
  movimentos: MovimentoCaixa[];
  consultasPendentes: ConsultaNaoSincronizada[];
  loading: boolean;
}

export function useCaixaClinica(clinicaId: string | undefined) {
  const [state, setState] = useState<CaixaState>({
    caixaAberto: false,
    operacaoAberturaId: null,
    saldoAbertura: 0,
    saldoAtual: 0,
    movimentos: [],
    consultasPendentes: [],
    loading: true,
  });

  // Buscar consultas pagas não sincronizadas do dia
  const fetchConsultasPendentes = useCallback(async () => {
    if (!clinicaId) return [];

    const hoje = new Date();
    
    // Buscar locais da clínica para pegar consultas por local também
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id")
      .eq("clinica_id", clinicaId)
      .eq("ativo", true);

    const localIds = locaisData?.map(l => l.id) || [];

    // Buscar consultas pagas de hoje que não foram sincronizadas
    let query = supabase
      .from("consultas")
      .select(`
        id,
        valor_consulta,
        nome_paciente_consulta,
        origem,
        formas_pagamento,
        medico:medicos!consultas_medico_id_fkey(nome),
        paciente:pacientes!consultas_paciente_id_fkey(nome)
      `)
      .eq("status_pagamento", "pago")
      .eq("sincronizado_caixa", false)
      .gte("data_hora", startOfDay(hoje).toISOString())
      .lte("data_hora", endOfDay(hoje).toISOString());

    // Filtrar por clínica ou local
    if (localIds.length > 0) {
      query = query.or(`clinica_id.eq.${clinicaId},local_id.in.(${localIds.join(",")})`);
    } else {
      query = query.eq("clinica_id", clinicaId);
    }

    const { data } = await query;
    return data || [];
  }, [clinicaId]);

  const fetchCaixaStatus = useCallback(async () => {
    if (!clinicaId) return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      // Buscar última operação do dia
      const hoje = new Date();
      const { data: operacoes } = await supabase
        .from("caixa_operacoes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .gte("created_at", startOfDay(hoje).toISOString())
        .lte("created_at", endOfDay(hoje).toISOString())
        .order("created_at", { ascending: false })
        .limit(2);

      // Verificar se está aberto (última operação é abertura)
      const ultimaOperacao = operacoes?.[0];
      const caixaAberto = ultimaOperacao?.tipo === "abertura";
      const operacaoAberturaId = caixaAberto ? ultimaOperacao.id : null;
      const saldoAbertura = caixaAberto ? Number(ultimaOperacao.saldo_inicial) : 0;

      // Se está aberto, buscar movimentos do dia
      let movimentos: MovimentoCaixa[] = [];
      let saldoAtual = saldoAbertura;

      if (caixaAberto && operacaoAberturaId) {
        const { data: movimentosData } = await supabase
          .from("caixa_movimentos")
          .select("*")
          .eq("clinica_id", clinicaId)
          .eq("operacao_abertura_id", operacaoAberturaId)
          .order("created_at", { ascending: false });

        movimentos =
          movimentosData?.map((m) => ({
            id: m.id,
            tipo: m.tipo as "entrada" | "saida" | "sangria" | "reforco",
            valor: Number(m.valor),
            descricao: m.descricao,
            forma_pagamento: m.forma_pagamento || undefined,
            hora: format(new Date(m.created_at), "HH:mm"),
          })) || [];

        // Calcular saldo atual
        movimentos.forEach((m) => {
          if (m.tipo === "entrada" || m.tipo === "reforco") {
            saldoAtual += m.valor;
          } else {
            saldoAtual -= m.valor;
          }
        });
      }

      // Buscar consultas pendentes de sincronização
      const consultasPendentes = caixaAberto ? await fetchConsultasPendentes() : [];

      setState({
        caixaAberto,
        operacaoAberturaId,
        saldoAbertura,
        saldoAtual,
        movimentos,
        consultasPendentes,
        loading: false,
      });
    } catch (error) {
      console.error("Erro ao buscar status do caixa:", error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [clinicaId, fetchConsultasPendentes]);

  useEffect(() => {
    fetchCaixaStatus();
  }, [fetchCaixaStatus]);

  // Configurar realtime para consultas pagas
  useEffect(() => {
    if (!clinicaId || !state.caixaAberto) return;

    const channel = supabase
      .channel(`caixa-consultas-${clinicaId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "consultas",
          filter: `status_pagamento=eq.pago`,
        },
        async (payload) => {
          // Quando uma consulta é marcada como paga, atualizar lista de pendentes
          const consultasPendentes = await fetchConsultasPendentes();
          setState(prev => ({ ...prev, consultasPendentes }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicaId, state.caixaAberto, fetchConsultasPendentes]);

  const abrirCaixa = async (saldoInicial: number) => {
    if (!clinicaId) {
      return { data: null, error: { message: "Clínica não identificada" } };
    }

    const { data, error } = await supabase
      .from("caixa_operacoes")
      .insert({
        clinica_id: clinicaId,
        tipo: "abertura",
        saldo_inicial: saldoInicial,
      })
      .select()
      .single();

    if (!error && data) {
      // Buscar consultas pendentes após abrir o caixa
      const consultasPendentes = await fetchConsultasPendentes();
      
      setState((prev) => ({
        ...prev,
        caixaAberto: true,
        operacaoAberturaId: data.id,
        saldoAbertura: saldoInicial,
        saldoAtual: saldoInicial,
        movimentos: [],
        consultasPendentes,
      }));
    }

    return { data, error };
  };

  const fecharCaixa = async (observacoes: string) => {
    if (!clinicaId) {
      return { data: null, error: { message: "Clínica não identificada" } };
    }

    const { data, error } = await supabase
      .from("caixa_operacoes")
      .insert({
        clinica_id: clinicaId,
        tipo: "fechamento",
        saldo_final: state.saldoAtual,
        observacoes,
      })
      .select()
      .single();

    if (!error) {
      setState((prev) => ({
        ...prev,
        caixaAberto: false,
        operacaoAberturaId: null,
        saldoAbertura: 0,
        saldoAtual: 0,
        movimentos: [],
        consultasPendentes: [],
      }));
    }

    return { data, error };
  };

  const registrarMovimento = async (
    movimento: Omit<MovimentoCaixa, "id" | "hora">
  ) => {
    if (!clinicaId || !state.operacaoAberturaId) {
      return { data: null, error: { message: "Caixa não está aberto" } };
    }

    const { data, error } = await supabase
      .from("caixa_movimentos")
      .insert({
        clinica_id: clinicaId,
        operacao_abertura_id: state.operacaoAberturaId,
        tipo: movimento.tipo,
        valor: movimento.valor,
        descricao: movimento.descricao,
        forma_pagamento: movimento.forma_pagamento || null,
      })
      .select()
      .single();

    if (!error && data) {
      const novoMovimento: MovimentoCaixa = {
        id: data.id,
        tipo: data.tipo as "entrada" | "saida" | "sangria" | "reforco",
        valor: Number(data.valor),
        descricao: data.descricao,
        forma_pagamento: data.forma_pagamento || undefined,
        hora: format(new Date(data.created_at), "HH:mm"),
      };

      setState((prev) => {
        let novoSaldo = prev.saldoAtual;
        if (novoMovimento.tipo === "entrada" || novoMovimento.tipo === "reforco") {
          novoSaldo += novoMovimento.valor;
        } else {
          novoSaldo -= novoMovimento.valor;
        }

        return {
          ...prev,
          saldoAtual: novoSaldo,
          movimentos: [novoMovimento, ...prev.movimentos],
        };
      });
    }

    return { data, error };
  };

  // Sincronizar uma consulta paga com o caixa
  const sincronizarConsulta = async (consulta: ConsultaNaoSincronizada, formaPagamento: string) => {
    if (!clinicaId || !state.operacaoAberturaId) {
      return { data: null, error: { message: "Caixa não está aberto" } };
    }

    const nomePaciente = consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente";
    const nomeMedico = consulta.medico?.nome || "";
    const origemLabel = consulta.origem === "online" ? "Online" : "Interno";
    const descricao = `Consulta ${origemLabel} - ${nomePaciente}${nomeMedico ? ` (Dr. ${nomeMedico})` : ""}`;

    // Criar movimento no caixa
    const { data: movimentoData, error: movimentoError } = await supabase
      .from("caixa_movimentos")
      .insert({
        clinica_id: clinicaId,
        operacao_abertura_id: state.operacaoAberturaId,
        tipo: "entrada",
        valor: consulta.valor_consulta,
        descricao,
        forma_pagamento: formaPagamento,
      })
      .select()
      .single();

    if (movimentoError) {
      return { data: null, error: movimentoError };
    }

    // Marcar consulta como sincronizada
    const { error: updateError } = await supabase
      .from("consultas")
      .update({
        sincronizado_caixa: true,
        caixa_movimento_id: movimentoData.id,
      })
      .eq("id", consulta.id);

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Atualizar estado local
    const novoMovimento: MovimentoCaixa = {
      id: movimentoData.id,
      tipo: "entrada",
      valor: Number(movimentoData.valor),
      descricao: movimentoData.descricao,
      forma_pagamento: movimentoData.forma_pagamento || undefined,
      hora: format(new Date(movimentoData.created_at), "HH:mm"),
      consulta_id: consulta.id,
    };

    setState((prev) => ({
      ...prev,
      saldoAtual: prev.saldoAtual + novoMovimento.valor,
      movimentos: [novoMovimento, ...prev.movimentos],
      consultasPendentes: prev.consultasPendentes.filter((c) => c.id !== consulta.id),
    }));

    return { data: movimentoData, error: null };
  };

  // Sincronizar todas as consultas pendentes de uma vez
  const sincronizarTodas = async (formaPagamento: string) => {
    const resultados = [];
    for (const consulta of state.consultasPendentes) {
      const resultado = await sincronizarConsulta(consulta, formaPagamento);
      resultados.push(resultado);
    }
    return resultados;
  };

  return {
    ...state,
    abrirCaixa,
    fecharCaixa,
    registrarMovimento,
    sincronizarConsulta,
    sincronizarTodas,
    refetch: fetchCaixaStatus,
  };
}
