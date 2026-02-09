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

  useEffect(() => {
    if (!clinicaId || !userId || !userName) {
      return;
    }

    console.log("[TrackAgentPresence] Starting heartbeat for:", userId, userName);
    
    // Initial presence update
    statusRef.current = "online";
    upsertPresence("online");
    setIsTracking(true);

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
  }, [clinicaId, userId, userName, upsertPresence]);

  const togglePause = useCallback(async () => {
    const newStatus = isPaused ? "online" : "pausa";
    setIsPaused(!isPaused);
    statusRef.current = newStatus;
    await upsertPresence(newStatus);
  }, [isPaused, upsertPresence]);

  return { isPaused, togglePause, isTracking };
}
