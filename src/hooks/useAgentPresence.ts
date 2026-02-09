import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PresenceState {
  [key: string]: {
    id: string;
    nome: string;
    online_at: string;
    status: "online" | "pausa";
  }[];
}

export function useAgentPresence(clinicaId: string | null, userId: string | null, userName: string | null) {
  const [onlineAgents, setOnlineAgents] = useState<Set<string>>(new Set());
  const [pausedAgents, setPausedAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!clinicaId || !userId) return;

    const channelName = `agent_presence:${clinicaId}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          id: string;
          nome: string;
          online_at: string;
          status: "online" | "pausa";
        }>();
        
        console.log("[AgentPresence] Sync event, state:", state);
        
        const online = new Set<string>();
        const paused = new Set<string>();
        
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p.status === "online") {
              online.add(p.id);
            } else if (p.status === "pausa") {
              paused.add(p.id);
            }
          });
        });
        
        console.log("[AgentPresence] Online agents:", Array.from(online));
        setOnlineAgents(online);
        setPausedAgents(paused);
      })
      .subscribe(async (status) => {
        console.log("[AgentPresence] Subscription status:", status);
        if (status === "SUBSCRIBED" && userId && userName) {
          console.log("[AgentPresence] Tracking user:", { userId, userName });
          await channel.track({
            id: userId,
            nome: userName,
            online_at: new Date().toISOString(),
            status: "online" as const,
          });
        }
      });

    return () => {
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

  useEffect(() => {
    if (!clinicaId || !userId || !userName) return;

    const channelName = `agent_presence:${clinicaId}`;
    
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
        console.log("[TrackAgentPresence] Tracking presence:", { userId, userName });
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
      supabase.removeChannel(ch);
    };
  }, [clinicaId, userId, userName]);

  const togglePause = useCallback(async () => {
    if (!channel || !userId || !userName) return;
    
    const newStatus = isPaused ? "online" : "pausa";
    setIsPaused(!isPaused);
    
    await channel.track({
      id: userId,
      nome: userName,
      online_at: new Date().toISOString(),
      status: newStatus,
    });
  }, [channel, userId, userName, isPaused]);

  return { isPaused, togglePause };
}
