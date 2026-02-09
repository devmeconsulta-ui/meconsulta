import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PresenceData {
  id: string;
  nome: string;
  online_at: string;
  status: "online" | "pausa";
}

// Hook for READING agent presence (used in OmniAgentes to display status)
export function useAgentPresence(clinicaId: string | null, userId: string | null, userName: string | null) {
  const [onlineAgents, setOnlineAgents] = useState<Set<string>>(new Set());
  const [pausedAgents, setPausedAgents] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!clinicaId) {
      console.log("[AgentPresence] No clinicaId, skipping subscription");
      return;
    }

    const channelName = `agent_presence:${clinicaId}`;
    console.log("[AgentPresence] Setting up reader for channel:", channelName);
    
    // Use a unique key for the reader to avoid conflicts with trackers
    const readerKey = userId ? `reader_${userId}` : `reader_${Date.now()}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: readerKey,
        },
      },
    });

    channelRef.current = channel;

    const handleSync = () => {
      const state = channel.presenceState<PresenceData>();
      
      console.log("[AgentPresence] 📊 Sync event - Full state:", JSON.stringify(state, null, 2));
      
      const online = new Set<string>();
      const paused = new Set<string>();
      
      Object.entries(state).forEach(([key, presences]) => {
        // Skip reader keys - they don't represent actual agents
        if (key.startsWith("reader_")) return;
        
        presences.forEach((p) => {
          console.log("[AgentPresence] Processing presence for key:", key, "data:", p);
          if (p.id) {
            if (p.status === "online") {
              online.add(p.id);
              console.log("[AgentPresence] ✅ Added to online:", p.id, p.nome);
            } else if (p.status === "pausa") {
              paused.add(p.id);
              console.log("[AgentPresence] ⏸️ Added to paused:", p.id, p.nome);
            }
          }
        });
      });
      
      console.log("[AgentPresence] Final counts - Online:", online.size, "Paused:", paused.size);
      setOnlineAgents(new Set(online));
      setPausedAgents(new Set(paused));
    };

    channel
      .on("presence", { event: "sync" }, () => {
        console.log("[AgentPresence] Received sync event");
        handleSync();
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("[AgentPresence] 🟢 Join event - key:", key, "presences:", newPresences);
        handleSync();
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("[AgentPresence] 🔴 Leave event - key:", key, "presences:", leftPresences);
        handleSync();
      })
      .subscribe((status) => {
        console.log("[AgentPresence] Reader subscription status:", status);
        if (status === "SUBSCRIBED") {
          isSubscribedRef.current = true;
          console.log("[AgentPresence] ✅ Reader subscribed successfully");
          // Immediately check current state after subscribing
          setTimeout(handleSync, 500);
        } else if (status === "CHANNEL_ERROR") {
          console.error("[AgentPresence] ❌ Reader channel error");
          isSubscribedRef.current = false;
        }
      });

    return () => {
      console.log("[AgentPresence] Cleaning up reader channel");
      isSubscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clinicaId, userId]);

  const getAgentStatus = useCallback((agentId: string): "online" | "pausa" | "offline" => {
    const isOnline = onlineAgents.has(agentId);
    const isPaused = pausedAgents.has(agentId);
    console.log(`[AgentPresence] getAgentStatus(${agentId}):`, { isOnline, isPaused, onlineAgents: Array.from(onlineAgents) });
    if (isOnline) return "online";
    if (isPaused) return "pausa";
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Don't do anything if we don't have all required params
    if (!clinicaId || !userId || !userName) {
      console.log("[TrackAgentPresence] Waiting for required params:", { 
        clinicaId: clinicaId || "missing", 
        userId: userId || "missing", 
        userName: userName || "missing" 
      });
      return;
    }

    // Clean up previous channel if it exists
    if (channelRef.current) {
      console.log("[TrackAgentPresence] Cleaning up previous channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `agent_presence:${clinicaId}`;
    console.log("[TrackAgentPresence] Creating channel:", channelName, "for user:", userId, userName);
    
    const ch = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = ch;

    ch.subscribe(async (status) => {
      console.log("[TrackAgentPresence] Subscription status:", status, "for user:", userId);
      if (status === "SUBSCRIBED") {
        console.log("[TrackAgentPresence] ✅ Successfully subscribed! Tracking presence for:", { userId, userName });
        setIsTracking(true);
        try {
          const trackResult = await ch.track({
            id: userId,
            nome: userName,
            online_at: new Date().toISOString(),
            status: "online" as const,
          });
          console.log("[TrackAgentPresence] Track result:", trackResult);
        } catch (err) {
          console.error("[TrackAgentPresence] Error tracking:", err);
        }
      } else if (status === "CHANNEL_ERROR") {
        console.error("[TrackAgentPresence] ❌ Channel error for:", userId);
        setIsTracking(false);
      } else if (status === "CLOSED") {
        console.log("[TrackAgentPresence] Channel closed for:", userId);
        setIsTracking(false);
      }
    });

    return () => {
      console.log("[TrackAgentPresence] Cleanup: removing channel for:", userId);
      setIsTracking(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clinicaId, userId, userName]);

  const togglePause = useCallback(async () => {
    if (!channelRef.current || !userId || !userName) return;
    
    const newStatus = isPaused ? "online" : "pausa";
    setIsPaused(!isPaused);
    
    console.log("[TrackAgentPresence] Toggling status to:", newStatus);
    await channelRef.current.track({
      id: userId,
      nome: userName,
      online_at: new Date().toISOString(),
      status: newStatus,
    });
  }, [userId, userName, isPaused]);

  return { isPaused, togglePause, isTracking };
}
