import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseUnreadChatMessagesProps {
  clinicaId: string | null;
}

export function useUnreadChatMessages({ clinicaId }: UseUnreadChatMessagesProps) {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!clinicaId || !currentUser) {
      setUnreadCount(0);
      return;
    }

    try {
      // Buscar conversas da clínica com participantes
      const { data: conversas, error } = await supabase
        .from("chat_conversas")
        .select(`
          id,
          chat_participantes (
            id,
            usuario_id,
            usuario_clinica_id,
            medico_id,
            ultima_leitura
          )
        `)
        .eq("clinica_id", clinicaId);

      if (error) throw error;

      let totalUnread = 0;

      for (const conversa of conversas || []) {
        // Encontrar meu participante
        const meuParticipante = conversa.chat_participantes?.find((p: any) => {
          if (currentUser?.tipo === "clinica") {
            return p.usuario_id === currentUser.id;
          } else if (currentUser?.medicoId) {
            return p.medico_id === currentUser.medicoId;
          } else if (currentUser?.clinicaId) {
            return p.usuario_clinica_id === currentUser.id;
          }
          return false;
        });

        if (meuParticipante) {
          const { count } = await supabase
            .from("chat_mensagens")
            .select("*", { count: "exact", head: true })
            .eq("conversa_id", conversa.id)
            .gt("created_at", meuParticipante.ultima_leitura);
          
          totalUnread += count || 0;
        }
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error("Erro ao buscar mensagens não lidas:", error);
    }
  }, [clinicaId, currentUser]);

  // Carregar contagem inicial
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Escutar novas mensagens em tempo real
  useEffect(() => {
    if (!clinicaId) return;

    const channel = supabase
      .channel(`unread_messages_${clinicaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_mensagens",
        },
        () => {
          // Recarregar contagem quando nova mensagem chegar
          fetchUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_participantes",
        },
        () => {
          // Recarregar quando ultima_leitura for atualizada
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicaId, fetchUnreadCount]);

  return {
    unreadCount,
    refetch: fetchUnreadCount,
  };
}
