import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const ONLINE_THRESHOLD = 45000; // Consider offline after 45 seconds without heartbeat

interface AgentPresenceRow {
  id: string;
  usuario_clinica_id: string;
  clinica_id: string;
  status: "online" | "pausa" | "offline";
  last_seen: string;
}

/**
 * Hook for READING agent presence status from the database.
 * Used in OmniAgentes to display agent status indicators.
 */
export function useAgentPresence(clinicaId: string | null) {
  const [presenceMap, setPresenceMap] = useState<Map<string, AgentPresenceRow>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPresence = useCallback(async () => {
    if (!clinicaId) return;
    
    const { data, error } = await supabase
      .from("agent_presence")
      .select("*")
      .eq("clinica_id", clinicaId);
    
    if (error) {
      console.error("[AgentPresence] Error fetching presence:", error);
      return;
    }

    if (data) {
      const map = new Map<string, AgentPresenceRow>();
      data.forEach((row: any) => {
        map.set(row.usuario_clinica_id, row as AgentPresenceRow);
      });
      setPresenceMap(map);
    }
  }, [clinicaId]);

  useEffect(() => {
    if (!clinicaId) return;

    // Fetch immediately
    fetchPresence();

    // Poll every 10 seconds
    pollRef.current = setInterval(fetchPresence, 10000);

    // Also subscribe to realtime changes for instant updates
    const channel = supabase
      .channel(`agent_presence_changes:${clinicaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_presence",
          filter: `clinica_id=eq.${clinicaId}`,
        },
        () => {
          // Refetch on any change
          fetchPresence();
        }
      )
      .subscribe();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [clinicaId, fetchPresence]);

  const getAgentStatus = useCallback((agentId: string): "online" | "pausa" | "offline" => {
    const presence = presenceMap.get(agentId);
    if (!presence) return "offline";
    
    // Check if the last_seen is within the threshold
    const lastSeen = new Date(presence.last_seen).getTime();
    const now = Date.now();
    
    if (now - lastSeen > ONLINE_THRESHOLD) {
      return "offline";
    }
    
    return presence.status as "online" | "pausa" | "offline";
  }, [presenceMap]);

  // Calculate counts
  const onlineCount = Array.from(presenceMap.values()).filter((p) => {
    const lastSeen = new Date(p.last_seen).getTime();
    return Date.now() - lastSeen <= ONLINE_THRESHOLD && p.status === "online";
  }).length;

  const pausedCount = Array.from(presenceMap.values()).filter((p) => {
    const lastSeen = new Date(p.last_seen).getTime();
    return Date.now() - lastSeen <= ONLINE_THRESHOLD && p.status === "pausa";
  }).length;

  return {
    getAgentStatus,
    onlineCount,
    pausedCount,
    refetch: fetchPresence,
  };
}

/**
 * Hook for TRACKING own presence in the database.
 * Used in layout components to announce the current user as online.
 * Sends a heartbeat every 15 seconds to update last_seen.
 */
export function useTrackAgentPresence(clinicaId: string | null, userId: string | null, userName: string | null) {
  const [isPaused, setIsPaused] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<"online" | "pausa">("online");

  const upsertPresence = useCallback(async (status: "online" | "pausa" | "offline") => {
    if (!clinicaId || !userId) return;

    const { error } = await supabase
      .from("agent_presence")
      .upsert(
        {
          usuario_clinica_id: userId,
          clinica_id: clinicaId,
          status,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "usuario_clinica_id" }
      );

    if (error) {
      console.error("[TrackAgentPresence] Error upserting presence:", error);
    }
  }, [clinicaId, userId]);

  // Distribute waiting atendimentos to this agent when they come online
  const distributeWaitingAtendimentos = useCallback(async () => {
    if (!clinicaId || !userId) return;

    try {
      // 1. Find queues this agent belongs to
      const { data: agentQueues } = await supabase
        .from("omni_agentes")
        .select("fila_id")
        .eq("usuario_clinica_id", userId)
        .eq("status", "online");

      if (!agentQueues || agentQueues.length === 0) return;

      const filaIds = agentQueues.map((q) => q.fila_id).filter(Boolean) as string[];
      if (filaIds.length === 0) return;

      // 2. Get queue configs
      const { data: filas } = await supabase
        .from("omni_filas")
        .select("id, estrategia_distribuicao, atendimentos_max_agente")
        .in("id", filaIds)
        .eq("ativo", true);

      if (!filas || filas.length === 0) return;

      // 3. Count current active atendimentos for this agent
      const { data: activeAtendimentos } = await supabase
        .from("omni_atendimentos")
        .select("id")
        .eq("agente_id", userId)
        .in("status", ["em_atendimento"]);

      const currentLoad = activeAtendimentos?.length || 0;

      // 4. For each queue, grab waiting atendimentos
      for (const fila of filas) {
        if (fila.estrategia_distribuicao === "manual") continue;

        const maxAtendimentos = fila.atendimentos_max_agente || 5;
        const slotsAvailable = maxAtendimentos - currentLoad;
        if (slotsAvailable <= 0) break;

        const { data: waiting } = await supabase
          .from("omni_atendimentos")
          .select("id")
          .eq("fila_id", fila.id)
          .eq("clinica_id", clinicaId)
          .eq("status", "aguardando")
          .is("agente_id", null)
          .order("data_abertura", { ascending: true })
          .limit(slotsAvailable);

        if (!waiting || waiting.length === 0) continue;

        for (const atendimento of waiting) {
          const { error } = await supabase
            .from("omni_atendimentos")
            .update({
              agente_id: userId,
              status: "em_atendimento",
              data_primeira_resposta: new Date().toISOString(),
            })
            .eq("id", atendimento.id)
            .eq("status", "aguardando"); // Optimistic lock

          if (!error) {
            console.log(`[AutoDistrib] Assigned waiting atendimento ${atendimento.id} to agent ${userId}`);
          }
        }
      }
    } catch (err) {
      console.error("[AutoDistrib] Error distributing on login:", err);
    }
  }, [clinicaId, userId]);

  useEffect(() => {
    if (!clinicaId || !userId || !userName) {
      return;
    }

    console.log("[TrackAgentPresence] Starting heartbeat for:", userId, userName);
    
    // Initial presence update
    statusRef.current = "online";
    upsertPresence("online");
    setIsTracking(true);

    // When agent comes online, distribute waiting atendimentos
    distributeWaitingAtendimentos();

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      upsertPresence(statusRef.current);
    }, HEARTBEAT_INTERVAL);

    // Set offline on page unload
    const handleUnload = () => {
      // Use sendBeacon for reliability on page close
      const url = `${import.meta.env.VITE_SUPABASE_URL || ""}/rest/v1/agent_presence?usuario_clinica_id=eq.${userId}`;
      const body = JSON.stringify({ status: "offline", last_seen: new Date().toISOString() });
      
      try {
        navigator.sendBeacon(
          url,
          new Blob([body], { type: "application/json" })
        );
      } catch {
        // Fallback - best effort
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      console.log("[TrackAgentPresence] Stopping heartbeat for:", userId);
      setIsTracking(false);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", handleUnload);
      
      // Mark as offline on cleanup
      upsertPresence("offline");
    };
  }, [clinicaId, userId, userName, upsertPresence, distributeWaitingAtendimentos]);

  const togglePause = useCallback(async () => {
    const newStatus = isPaused ? "online" : "pausa";
    setIsPaused(!isPaused);
    statusRef.current = newStatus;
    await upsertPresence(newStatus);
    
    // When resuming from pause, distribute waiting atendimentos
    if (newStatus === "online") {
      distributeWaitingAtendimentos();
    }
  }, [isPaused, upsertPresence, distributeWaitingAtendimentos]);

  return { isPaused, togglePause, isTracking };
}
