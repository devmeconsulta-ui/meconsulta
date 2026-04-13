import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";

export interface CaixaDefinicao {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
}

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

export function useCaixaClinica(clinicaId: string | undefined, caixaId?: string | null) {
  const [caixas, setCaixas] = useState<CaixaDefinicao[]>([]);
  const [caixaSelecionadoId, setCaixaSelecionadoId] = useState<string | null>(caixaId || null);
  const [loadingCaixas, setLoadingCaixas] = useState(true);

  const [state, setState] = useState<CaixaState>({
    caixaAberto: false,
    operacaoAberturaId: null,
    saldoAbertura: 0,
    saldoAtual: 0,
    movimentos: [],
    consultasPendentes: [],
    loading: true,
  });

  // Fetch all caixas for clinic
  const fetchCaixas = useCallback(async () => {
    if (!clinicaId) return;
    setLoadingCaixas(true);

    // @ts-ignore
    const { data, error } = await supabase
      .from("caixas")
      .select("*")
      .eq("clinica_id", clinicaId)
      .eq("ativo", true)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCaixas(data);
      // Auto-select first caixa if none selected
      if (!caixaSelecionadoId && data.length > 0) {
        setCaixaSelecionadoId(data[0].id);
      }
    }
    setLoadingCaixas(false);
  }, [clinicaId]);

  useEffect(() => {
    fetchCaixas();
  }, [fetchCaixas]);

  // Sync external caixaId prop
  useEffect(() => {
    if (caixaId) setCaixaSelecionadoId(caixaId);
  }, [caixaId]);

  // Buscar consultas pagas não sincronizadas do dia
  const fetchConsultasPendentes = useCallback(async () => {
    if (!clinicaId) return [];

    const hoje = new Date();
    
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id")
      .eq("clinica_id", clinicaId)
      .eq("ativo", true);

    const localIds = locaisData?.map(l => l.id) || [];

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

    if (localIds.length > 0) {
      query = query.or(`clinica_id.eq.${clinicaId},local_id.in.(${localIds.join(",")})`);
    } else {
      query = query.eq("clinica_id", clinicaId);
    }

    const { data } = await query;
    return (data as ConsultaNaoSincronizada[] | null) || [];
  }, [clinicaId]);

  const fetchCaixaStatus = useCallback(async () => {
    if (!clinicaId || !caixaSelecionadoId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const hoje = new Date();
      // @ts-ignore
      const { data: operacoes } = await supabase
        .from("caixa_operacoes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("caixa_id", caixaSelecionadoId)
        .gte("created_at", startOfDay(hoje).toISOString())
        .lte("created_at", endOfDay(hoje).toISOString())
        .order("created_at", { ascending: false })
        .limit(2);

      const ultimaOperacao = operacoes?.[0];
      const caixaAberto = ultimaOperacao?.tipo === "abertura";
      const operacaoAberturaId = caixaAberto ? ultimaOperacao.id : null;
      const saldoAbertura = caixaAberto ? Number(ultimaOperacao.saldo_inicial) : 0;

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

        movimentos.forEach((m) => {
          if (m.tipo === "entrada" || m.tipo === "reforco") {
            saldoAtual += m.valor;
          } else {
            saldoAtual -= m.valor;
          }
        });
      }

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
  }, [clinicaId, caixaSelecionadoId, fetchConsultasPendentes]);

  useEffect(() => {
    fetchCaixaStatus();
  }, [fetchCaixaStatus]);

  // Realtime
  useEffect(() => {
    if (!clinicaId || !state.caixaAberto) return;

    const channel = supabase
      .channel(`caixa-consultas-${clinicaId}-${caixaSelecionadoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "consultas",
          filter: `status_pagamento=eq.pago`,
        },
        async () => {
          const consultasPendentes = await fetchConsultasPendentes();
          setState(prev => ({ ...prev, consultasPendentes }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicaId, state.caixaAberto, caixaSelecionadoId, fetchConsultasPendentes]);

  const abrirCaixa = async (saldoInicial: number) => {
    if (!clinicaId || !caixaSelecionadoId) {
      return { data: null, error: { message: "Clínica ou caixa não identificado" } };
    }

    // @ts-ignore
    const { data, error } = await supabase
      .from("caixa_operacoes")
      .insert({
        clinica_id: clinicaId,
        caixa_id: caixaSelecionadoId,
        tipo: "abertura",
        saldo_inicial: saldoInicial,
      })
      .select()
      .single();

    if (!error && data) {
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
    if (!clinicaId || !caixaSelecionadoId) {
      return { data: null, error: { message: "Clínica ou caixa não identificado" } };
    }

    // @ts-ignore
    const { data, error } = await supabase
      .from("caixa_operacoes")
      .insert({
        clinica_id: clinicaId,
        caixa_id: caixaSelecionadoId,
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
    if (!clinicaId || !state.operacaoAberturaId || !caixaSelecionadoId) {
      return { data: null, error: { message: "Caixa não está aberto" } };
    }

    // @ts-ignore
    const { data, error } = await supabase
      .from("caixa_movimentos")
      .insert({
        clinica_id: clinicaId,
        caixa_id: caixaSelecionadoId,
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

  const sincronizarConsulta = async (consulta: ConsultaNaoSincronizada, formaPagamento: string) => {
    if (!clinicaId || !state.operacaoAberturaId || !caixaSelecionadoId) {
      return { data: null, error: { message: "Caixa não está aberto" } };
    }

    const nomePaciente = consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente";
    const nomeMedico = consulta.medico?.nome || "";
    const origemLabel = consulta.origem === "online" ? "Online" : "Interno";
    const descricao = `Consulta ${origemLabel} - ${nomePaciente}${nomeMedico ? ` (Dr. ${nomeMedico})` : ""}`;

    // @ts-ignore
    const { data: movimentoData, error: movimentoError } = await supabase
      .from("caixa_movimentos")
      .insert({
        clinica_id: clinicaId,
        caixa_id: caixaSelecionadoId,
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

  const sincronizarTodas = async (formaPagamentoFallback: string) => {
    const resultados = [];
    for (const consulta of state.consultasPendentes) {
      const formaReal = consulta.formas_pagamento?.[0]?.tipo || formaPagamentoFallback;
      const resultado = await sincronizarConsulta(consulta, formaReal);
      resultados.push(resultado);
    }
    return resultados;
  };

  // CRUD for caixas
  const criarCaixa = async (nome: string, descricao?: string, cor?: string) => {
    if (!clinicaId) return { data: null, error: { message: "Clínica não identificada" } };

    // @ts-ignore
    const { data, error } = await supabase
      .from("caixas")
      .insert({ clinica_id: clinicaId, nome, descricao: descricao || null, cor: cor || "#3b82f6" })
      .select()
      .single();

    if (!error) await fetchCaixas();
    return { data, error };
  };

  const editarCaixa = async (id: string, updates: { nome?: string; descricao?: string; cor?: string }) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from("caixas")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (!error) await fetchCaixas();
    return { data, error };
  };

  const excluirCaixa = async (id: string) => {
    // @ts-ignore
    const { error } = await supabase
      .from("caixas")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      await fetchCaixas();
      if (caixaSelecionadoId === id) {
        setCaixaSelecionadoId(caixas.find(c => c.id !== id)?.id || null);
      }
    }
    return { error };
  };

  const selecionarCaixa = (id: string) => {
    setCaixaSelecionadoId(id);
  };

  const caixaSelecionado = caixas.find(c => c.id === caixaSelecionadoId) || null;

  return {
    ...state,
    caixas,
    caixaSelecionado,
    caixaSelecionadoId,
    loadingCaixas,
    selecionarCaixa,
    criarCaixa,
    editarCaixa,
    excluirCaixa,
    abrirCaixa,
    fecharCaixa,
    registrarMovimento,
    sincronizarConsulta,
    sincronizarTodas,
    refetch: fetchCaixaStatus,
    refetchCaixas: fetchCaixas,
  };
}
