import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePendingConfirmations(pacienteId: string | undefined) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pacienteId) {
      setLoading(false);
      return;
    }

    fetchCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("pending-confirmations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consultas",
          filter: `paciente_id=eq.${pacienteId}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pacienteId]);

  async function fetchCount() {
    if (!pacienteId) return;

    const now = new Date().toISOString();

    const { count: pendingCount, error } = await supabase
      .from("consultas")
      .select("*", { count: "exact", head: true })
      .eq("paciente_id", pacienteId)
      .eq("status_pagamento", "pago")
      .in("status_consulta", ["confirmada", "atendida_medico"])
      .or("finalizado_paciente.eq.false,finalizado_paciente.is.null")
      .lt("data_hora", now);

    if (!error) {
      setCount(pendingCount || 0);
    }
    setLoading(false);
  }

  return { count, loading, refetch: fetchCount };
}
