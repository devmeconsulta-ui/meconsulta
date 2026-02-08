import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingUser {
  id: string;
  nome: string;
  tipo: "agente" | "ia";
}

interface UseTypingIndicatorProps {
  atendimentoId: string | null;
  currentUserId: string | null;
  currentUserNome: string | null;
}

export function useTypingIndicator({ 
  atendimentoId, 
  currentUserId, 
  currentUserNome 
}: UseTypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing presence
  useEffect(() => {
    if (!atendimentoId) {
      setTypingUsers([]);
      return;
    }

    const channel = supabase.channel(`typing:${atendimentoId}`, {
      config: {
        presence: {
          key: currentUserId || "anonymous",
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];

        Object.entries(state).forEach(([key, presences]) => {
          if (key !== currentUserId && Array.isArray(presences)) {
            presences.forEach((presence: any) => {
              if (presence.is_typing) {
                users.push({
                  id: key,
                  nome: presence.nome || "Alguém",
                  tipo: presence.tipo || "agente",
                });
              }
            });
          }
        });

        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && currentUserId) {
          await channel.track({
            id: currentUserId,
            nome: currentUserNome,
            is_typing: false,
            tipo: "agente",
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [atendimentoId, currentUserId, currentUserNome]);

  // Broadcast typing status
  const setIsTyping = useCallback(
    async (isTyping: boolean) => {
      if (!channelRef.current || !currentUserId) return;
      if (isTypingRef.current === isTyping) return;

      isTypingRef.current = isTyping;

      await channelRef.current.track({
        id: currentUserId,
        nome: currentUserNome,
        is_typing: isTyping,
        tipo: "agente",
      });
    },
    [currentUserId, currentUserNome]
  );

  // Handle input change - set typing with auto-clear
  const handleTypingStart = useCallback(() => {
    setIsTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  }, [setIsTyping]);

  // Stop typing immediately (on send or blur)
  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
  }, [setIsTyping]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    handleTypingStart,
    handleTypingStop,
  };
}

// Hook for AI typing indicator (used by edge functions)
export function useAITypingIndicator(atendimentoId: string | null) {
  const [isAITyping, setIsAITyping] = useState(false);
  const [aiName, setAIName] = useState<string | null>(null);

  useEffect(() => {
    if (!atendimentoId) {
      setIsAITyping(false);
      setAIName(null);
      return;
    }

    const channel = supabase.channel(`ai-typing:${atendimentoId}`);

    channel
      .on("broadcast", { event: "ai_typing" }, (payload) => {
        setIsAITyping(payload.payload.is_typing);
        setAIName(payload.payload.agente_nome || "IA");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [atendimentoId]);

  return { isAITyping, aiName };
}
