import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DisconnectedQueue {
  filaId: string;
  filaNome: string;
  instanciaId: string;
  instanciaNome: string;
}

interface ConnectionMonitorResult {
  hasDisconnectedQueues: boolean;
  disconnectedQueues: DisconnectedQueue[];
  isChecking: boolean;
  lastCheck: Date | null;
  checkNow: () => Promise<void>;
}

export function useOmniConnectionMonitor(clinicaId: string | null): ConnectionMonitorResult {
  const [disconnectedQueues, setDisconnectedQueues] = useState<DisconnectedQueue[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnections = useCallback(async () => {
    if (!clinicaId) return;

    setIsChecking(true);
    try {
      // Fetch all queues with their instances
      const { data: filas, error } = await supabase
        .from("omni_filas")
        .select(`
          id,
          nome,
          ativo,
          instancia:omni_instancias!instancia_id(id, nome, status, evolution_instance_name)
        `)
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);

      if (error) throw error;

      const disconnected: DisconnectedQueue[] = [];

      for (const fila of filas || []) {
        const instancia = fila.instancia as any;
        
        if (!instancia) {
          // Queue has no instance linked
          continue;
        }

        if (instancia.status === "disconnected") {
          disconnected.push({
            filaId: fila.id,
            filaNome: fila.nome,
            instanciaId: instancia.id,
            instanciaNome: instancia.nome,
          });
        } else {
          // Verify real-time connection with Evolution API
          try {
            const response = await supabase.functions.invoke("evolution-connection-status", {
              body: { instancia_id: instancia.id },
            });

            if (response.data?.status !== "connected" && response.data?.state !== "open") {
              // Update local DB to reflect disconnection
              await supabase
                .from("omni_instancias")
                .update({ status: "disconnected" })
                .eq("id", instancia.id);

              disconnected.push({
                filaId: fila.id,
                filaNome: fila.nome,
                instanciaId: instancia.id,
                instanciaNome: instancia.nome,
              });
            }
          } catch (err) {
            console.error("Error checking Evolution connection:", err);
          }
        }
      }

      setDisconnectedQueues(disconnected);
      setLastCheck(new Date());
    } catch (error) {
      console.error("Error checking connections:", error);
    } finally {
      setIsChecking(false);
    }
  }, [clinicaId]);

  // Check on mount and every 30 seconds
  useEffect(() => {
    checkConnections();
    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, [checkConnections]);

  // Listen for instance status changes
  useEffect(() => {
    if (!clinicaId) return;

    const channel = supabase
      .channel(`omni_connection_monitor_${clinicaId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "omni_instancias",
        },
        (payload) => {
          // Re-check when any instance status changes
          checkConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicaId, checkConnections]);

  return {
    hasDisconnectedQueues: disconnectedQueues.length > 0,
    disconnectedQueues,
    isChecking,
    lastCheck,
    checkNow: checkConnections,
  };
}
