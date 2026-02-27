import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SyncJob {
  id: string;
  status: string;
  progress_chats_total: number | null;
  progress_chats_done: number | null;
  progress_messages_done: number | null;
  last_error: string | null;
  last_synced_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

interface SyncProgress {
  job: SyncJob | null;
  loading: boolean;
}

export function useSyncProgress(instanciaIds: string[]) {
  const [progressMap, setProgressMap] = useState<Record<string, SyncProgress>>({});

  const fetchStatus = useCallback(async (instanciaId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("zapi-sync-history", {
        body: { instancia_id: instanciaId, action: "status" },
      });

      if (error) return;

      setProgressMap((prev) => ({
        ...prev,
        [instanciaId]: { job: data?.job || null, loading: false },
      }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (instanciaIds.length === 0) return;

    // Initial fetch for all instances
    instanciaIds.forEach((id) => {
      setProgressMap((prev) => ({
        ...prev,
        [id]: { job: prev[id]?.job || null, loading: true },
      }));
      fetchStatus(id);
    });

    // Poll every 5s only for active jobs
    const interval = setInterval(() => {
      instanciaIds.forEach((id) => {
        const current = progressMap[id];
        const status = current?.job?.status;
        if (status === "queued" || status === "running") {
          fetchStatus(id);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [instanciaIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return progressMap;
}
