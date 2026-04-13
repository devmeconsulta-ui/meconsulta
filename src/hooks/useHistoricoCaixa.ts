import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface FechamentoCaixa {
  id: string;
  data: string;
  horaAbertura: string;
  horaFechamento: string;
  saldoInicial: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
  observacoes: string | null;
  movimentos: {
    id: string;
    tipo: string;
    valor: number;
    descricao: string;
    forma_pagamento: string | null;
    hora: string;
  }[];
}

export function useHistoricoCaixa(clinicaId: string | undefined, caixaId?: string | null) {
  const [historico, setHistorico] = useState<FechamentoCaixa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistorico = useCallback(async () => {
    if (!clinicaId || !caixaId) return;

    setLoading(true);
    try {
      // Buscar todas as operações de fechamento (últimos 30 dias)
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const { data: fechamentos } = await supabase
        .from("caixa_operacoes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("tipo", "fechamento")
        .gte("created_at", dataLimite.toISOString())
        .order("created_at", { ascending: false });

      if (!fechamentos || fechamentos.length === 0) {
        setHistorico([]);
        setLoading(false);
        return;
      }

      // Para cada fechamento, buscar a abertura correspondente e os movimentos
      const historicoCompleto: FechamentoCaixa[] = [];

      for (const fechamento of fechamentos) {
        // Buscar abertura do mesmo dia
        const dataFechamento = new Date(fechamento.created_at);
        const inicioDia = new Date(dataFechamento);
        inicioDia.setHours(0, 0, 0, 0);
        const fimDia = new Date(dataFechamento);
        fimDia.setHours(23, 59, 59, 999);

        const { data: aberturas } = await supabase
          .from("caixa_operacoes")
          .select("*")
          .eq("clinica_id", clinicaId)
          .eq("tipo", "abertura")
          .gte("created_at", inicioDia.toISOString())
          .lte("created_at", fimDia.toISOString())
          .order("created_at", { ascending: false })
          .limit(1);

        const abertura = aberturas?.[0];
        if (!abertura) continue;

        // Buscar movimentos dessa abertura
        const { data: movimentos } = await supabase
          .from("caixa_movimentos")
          .select("*")
          .eq("operacao_abertura_id", abertura.id)
          .order("created_at", { ascending: true });

        const movimentosFormatados = movimentos?.map((m) => ({
          id: m.id,
          tipo: m.tipo,
          valor: Number(m.valor),
          descricao: m.descricao,
          forma_pagamento: m.forma_pagamento,
          hora: format(new Date(m.created_at), "HH:mm"),
        })) || [];

        const totalEntradas = movimentosFormatados
          .filter((m) => m.tipo === "entrada" || m.tipo === "reforco")
          .reduce((sum, m) => sum + m.valor, 0);

        const totalSaidas = movimentosFormatados
          .filter((m) => m.tipo === "saida" || m.tipo === "sangria")
          .reduce((sum, m) => sum + m.valor, 0);

        historicoCompleto.push({
          id: fechamento.id,
          data: format(dataFechamento, "dd/MM/yyyy"),
          horaAbertura: format(new Date(abertura.created_at), "HH:mm"),
          horaFechamento: format(dataFechamento, "HH:mm"),
          saldoInicial: Number(abertura.saldo_inicial) || 0,
          saldoFinal: Number(fechamento.saldo_final) || 0,
          totalEntradas,
          totalSaidas,
          observacoes: fechamento.observacoes,
          movimentos: movimentosFormatados,
        });
      }

      setHistorico(historicoCompleto);
    } catch (error) {
      console.error("Erro ao buscar histórico do caixa:", error);
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => {
    fetchHistorico();
  }, [fetchHistorico]);

  return {
    historico,
    loading,
    refetch: fetchHistorico,
  };
}
