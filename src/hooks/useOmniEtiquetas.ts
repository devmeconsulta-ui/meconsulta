import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OmniEtiqueta {
  id: string;
  clinica_id: string;
  nome: string;
  cor: string;
  descricao: string | null;
  created_at: string;
}

export function useOmniEtiquetas(clinicaId: string | null) {
  const [etiquetas, setEtiquetas] = useState<OmniEtiqueta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEtiquetas = useCallback(async () => {
    if (!clinicaId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("omni_etiquetas")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("nome");

      if (error) throw error;
      setEtiquetas((data || []) as OmniEtiqueta[]);
    } catch (error) {
      console.error("Error fetching etiquetas:", error);
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => {
    fetchEtiquetas();
  }, [fetchEtiquetas]);

  const criarEtiqueta = async (nome: string, cor: string) => {
    if (!clinicaId) return null;

    try {
      const { data, error } = await supabase
        .from("omni_etiquetas")
        .insert({
          clinica_id: clinicaId,
          nome,
          cor,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchEtiquetas();
      toast.success("Etiqueta criada com sucesso");
      return data;
    } catch (error) {
      console.error("Error creating etiqueta:", error);
      toast.error("Erro ao criar etiqueta");
      return null;
    }
  };

  return {
    etiquetas,
    loading,
    refetch: fetchEtiquetas,
    criarEtiqueta,
  };
}
