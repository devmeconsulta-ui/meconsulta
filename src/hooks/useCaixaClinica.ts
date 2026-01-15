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
}

interface CaixaState {
  caixaAberto: boolean;
  operacaoAberturaId: string | null;
  saldoAbertura: number;
  saldoAtual: number;
  movimentos: MovimentoCaixa[];
  loading: boolean;
}

export function useCaixaClinica(clinicaId: string | undefined) {
  const [state, setState] = useState<CaixaState>({
    caixaAberto: false,
    operacaoAberturaId: null,
    saldoAbertura: 0,
    saldoAtual: 0,
    movimentos: [],
    loading: true,
  });

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

      setState({
        caixaAberto,
        operacaoAberturaId,
        saldoAbertura,
        saldoAtual,
        movimentos,
        loading: false,
      });
    } catch (error) {
      console.error("Erro ao buscar status do caixa:", error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [clinicaId]);

  useEffect(() => {
    fetchCaixaStatus();
  }, [fetchCaixaStatus]);

  const abrirCaixa = async (saldoInicial: number) => {
    if (!clinicaId) return;

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
      setState((prev) => ({
        ...prev,
        caixaAberto: true,
        operacaoAberturaId: data.id,
        saldoAbertura: saldoInicial,
        saldoAtual: saldoInicial,
        movimentos: [],
      }));
    }

    return { data, error };
  };

  const fecharCaixa = async (observacoes: string) => {
    if (!clinicaId) return;

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
      }));
    }

    return { data, error };
  };

  const registrarMovimento = async (
    movimento: Omit<MovimentoCaixa, "id" | "hora">
  ) => {
    if (!clinicaId || !state.operacaoAberturaId) return;

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

  return {
    ...state,
    abrirCaixa,
    fecharCaixa,
    registrarMovimento,
    refetch: fetchCaixaStatus,
  };
}
