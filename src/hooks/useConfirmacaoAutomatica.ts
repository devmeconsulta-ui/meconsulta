import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ConfirmacaoAutomaticaConfig {
  id?: string;
  clinica_id: string;
  ativo: boolean;
  fila_id: string | null;
  horas_antes: number;
  mensagem_template: string | null;
  intervalo_envio_segundos: number;
  incluir_ordem_chegada: boolean;
  horario_envio: string;
  dias_semana: number[];
}

export function useConfirmacaoAutomatica(clinicaId: string | null) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["confirmacao-automatica-config", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return null;

      // @ts-ignore
      const { data, error } = await supabase
        .from("confirmacao_automatica_config")
        .select("*")
        .eq("clinica_id", clinicaId)
        .maybeSingle();

      if (error) throw error;
      return data as ConfirmacaoAutomaticaConfig | null;
    },
    enabled: !!clinicaId,
  });

  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<ConfirmacaoAutomaticaConfig>) => {
      if (!clinicaId) throw new Error("Clínica não encontrada");

      const payload = { ...newConfig, clinica_id: clinicaId };

      if (config?.id) {
        // @ts-ignore
        const { error } = await supabase
          .from("confirmacao_automatica_config")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        // @ts-ignore
        const { error } = await supabase
          .from("confirmacao_automatica_config")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmacao-automatica-config", clinicaId] });
      toast({ title: "Configuração salva!", description: "As configurações de envio automático foram atualizadas." });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  return { config, isLoading, saveConfig };
}
