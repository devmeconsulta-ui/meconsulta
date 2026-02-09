import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PresenceData {
  id: string;
  nome: string;
  online_at: string;
  status: "online" | "pausa";
}

export function useAgentPresence(clinicaId: string | null, userId: string | null, userName: string | null) {
  const [onlineAgents, setOnlineAgents] = useState<Set<string>>(new Set());
  const [pausedAgents, setPausedAgents] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!clinicaId) return;

    const channelName = `agent_presence:${clinicaId}`;
    
    // Create channel for reading presence (don't track here - that's done in layouts)
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId || "reader",
        },
      },
    });

    channelRef.current = channel;

    const handleSync = () => {
      const state = channel.presenceState<PresenceData>();
      
      console.log("[AgentPresence] Sync event, raw state:", state);
      
      const online = new Set<string>();
      const paused = new Set<string>();
      
      Object.values(state).forEach((presences) => {
        presences.forEach((p) => {
          console.log("[AgentPresence] Processing presence:", p);
          if (p.id) {
            if (p.status === "online") {
              online.add(p.id);
            } else if (p.status === "pausa") {
              paused.add(p.id);
            }
          }
        });
      });
      
      console.log("[AgentPresence] Online agents:", Array.from(online));
      console.log("[AgentPresence] Paused agents:", Array.from(paused));
      setOnlineAgents(online);
      setPausedAgents(paused);
    };

    channel
      .on("presence", { event: "sync" }, handleSync)
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("[AgentPresence] Join event:", key, newPresences);
        handleSync();
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("[AgentPresence] Leave event:", key, leftPresences);
        handleSync();
      })
      .subscribe(async (status) => {
        console.log("[AgentPresence] Reader subscription status:", status);
        // If we have userId and userName, also track our own presence
        if (status === "SUBSCRIBED" && userId && userName) {
          console.log("[AgentPresence] Also tracking own presence:", { userId, userName });
          await channel.track({
            id: userId,
            nome: userName,
            online_at: new Date().toISOString(),
            status: "online" as const,
          });
        }
      });

    return () => {
      console.log("[AgentPresence] Cleaning up reader channel");
      supabase.removeChannel(channel);
    };
  }, [clinicaId, userId, userName]);

  const getAgentStatus = useCallback((agentId: string): "online" | "pausa" | "offline" => {
    if (onlineAgents.has(agentId)) return "online";
    if (pausedAgents.has(agentId)) return "pausa";
    return "offline";
  }, [onlineAgents, pausedAgents]);

  return {
    onlineAgents,
    pausedAgents,
    getAgentStatus,
    onlineCount: onlineAgents.size,
    pausedCount: pausedAgents.size,
  };
}

// Hook for tracking own presence (to be used in layout)
export function useTrackAgentPresence(clinicaId: string | null, userId: string | null, userName: string | null) {
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!clinicaId || !userId || !userName) {
      console.log("[TrackAgentPresence] Missing required params:", { clinicaId, userId, userName });
      return;
    }

    // Prevent duplicate channel creation
    if (hasTrackedRef.current) {
      console.log("[TrackAgentPresence] Already tracking, skipping");
      return;
    }

    const channelName = `agent_presence:${clinicaId}`;
    console.log("[TrackAgentPresence] Creating channel:", channelName, "for user:", userId);
    
    const ch = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    ch.subscribe(async (status) => {
      console.log("[TrackAgentPresence] Subscription status:", status);
      if (status === "SUBSCRIBED") {
        console.log("[TrackAgentPresence] Tracking presence for:", { userId, userName });
        hasTrackedRef.current = true;
        await ch.track({
          id: userId,
          nome: userName,
          online_at: new Date().toISOString(),
          status: "online" as const,
        });
      }
    });

    setChannel(ch);

    return () => {
      console.log("[TrackAgentPresence] Cleaning up channel for:", userId);
      hasTrackedRef.current = false;
      supabase.removeChannel(ch);
    };
  }, [clinicaId, userId, userName]);

  const togglePause = useCallback(async () => {
    if (!channel || !userId || !userName) return;
    
    const newStatus = isPaused ? "online" : "pausa";
    setIsPaused(!isPaused);
    
    console.log("[TrackAgentPresence] Toggling status to:", newStatus);
    await channel.track({
      id: userId,
      nome: userName,
      online_at: new Date().toISOString(),
      status: newStatus,
    });
  }, [channel, userId, userName, isPaused]);

  return { isPaused, togglePause };
}
