import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OmniNotaInterna {
  id: string;
  atendimento_id: string;
  clinica_id: string;
  criado_por_usuario_id: string | null;
  criado_por_nome: string;
  destinatario_agente_id: string | null;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

export function useOmniNotasInternas(atendimentoId: string | null) {
  const [notas, setNotas] = useState<OmniNotaInterna[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotas = useCallback(async () => {
    if (!atendimentoId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("omni_notas_internas")
        .select("*")
        .eq("atendimento_id", atendimentoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setNotas((data || []) as OmniNotaInterna[]);
    } catch (error) {
      console.error("Error fetching notas internas:", error);
    } finally {
      setLoading(false);
    }
  }, [atendimentoId]);

  useEffect(() => {
    fetchNotas();

    // Subscribe to real-time updates
    if (atendimentoId) {
      console.log(`[Realtime] Subscribing to omni_notas_internas for atendimento: ${atendimentoId}`);
      
      const channel = supabase
        .channel(`omni_notas_internas_${atendimentoId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "omni_notas_internas",
            filter: `atendimento_id=eq.${atendimentoId}`,
          },
          (payload) => {
            console.log("[Realtime] New nota interna received:", payload.new);
            setNotas((prev) => {
              const exists = prev.some((n) => n.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as OmniNotaInterna];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "omni_notas_internas",
            filter: `atendimento_id=eq.${atendimentoId}`,
          },
          (payload) => {
            console.log("[Realtime] Nota interna updated:", payload.new);
            setNotas((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as OmniNotaInterna) : n))
            );
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Subscription status for notas internas: ${status}`);
        });

      return () => {
        console.log(`[Realtime] Unsubscribing from omni_notas_internas for atendimento: ${atendimentoId}`);
        supabase.removeChannel(channel);
      };
    }
  }, [atendimentoId, fetchNotas]);

  const criarNota = async (
    clinicaId: string,
    criadoPorUsuarioId: string | null,
    criadoPorNome: string,
    destinatarioAgenteId: string | null,
    mensagem: string
  ) => {
    if (!atendimentoId) return null;

    try {
      const { data, error } = await supabase
        .from("omni_notas_internas")
        .insert({
          atendimento_id: atendimentoId,
          clinica_id: clinicaId,
          criado_por_usuario_id: criadoPorUsuarioId,
          criado_por_nome: criadoPorNome,
          destinatario_agente_id: destinatarioAgenteId,
          mensagem,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Nota enviada ao atendente");
      return data;
    } catch (error) {
      console.error("Error creating nota interna:", error);
      toast.error("Erro ao enviar nota");
      return null;
    }
  };

  const marcarComoLida = async (notaId: string) => {
    try {
      const { error } = await supabase
        .from("omni_notas_internas")
        .update({ lida: true })
        .eq("id", notaId);

      if (error) throw error;

      setNotas((prev) =>
        prev.map((n) => (n.id === notaId ? { ...n, lida: true } : n))
      );
    } catch (error) {
      console.error("Error marking nota as read:", error);
    }
  };

  return {
    notas,
    loading,
    refetch: fetchNotas,
    criarNota,
    marcarComoLida,
  };
}
