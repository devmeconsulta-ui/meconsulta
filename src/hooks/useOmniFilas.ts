import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OmniInstancia {
  id: string;
  clinica_id: string;
  nome: string;
  numero_whatsapp: string | null;
  provider: string;
  zapi_instance_id: string | null;
  zapi_token: string | null;
  status: "disconnected" | "connecting" | "connected";
  webhook_url: string | null;
  servidor_url: string | null;
  webhooks_configured: boolean;
  webhooks_configured_at: string | null;
  configuracoes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OmniFila {
  id: string;
  clinica_id: string;
  instancia_id: string | null;
  nome: string;
  descricao: string | null;
  cor: string;
  atendimentos_max_agente: number;
  estrategia_distribuicao: string;
  fechar_por_inatividade_minutos: number;
  mensagem_boas_vindas: string | null;
  mensagem_fora_horario: string | null;
  mensagem_fechamento: string | null;
  mensagem_espera: string | null;
  horario_funcionamento: {
    inicio: string;
    fim: string;
    dias_semana: number[];
  };
  ativo: boolean;
  created_at: string;
  updated_at: string;
  instancia?: OmniInstancia;
}

function normalizeQrCodeValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;
    const candidates = [data.value, data.base64, data.qrcode, data.qrCode];
    const firstString = candidates.find((item) => typeof item === "string" && item.trim());
    return (firstString as string) || null;
  }
  return null;
}

export function useOmniFilas(clinicaId: string | null) {
  const [filas, setFilas] = useState<OmniFila[]>([]);
  const [instancias, setInstancias] = useState<OmniInstancia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFilas = useCallback(async () => {
    if (!clinicaId) return;

    try {
      const { data, error } = await supabase
        .from("omni_filas")
        .select(`
          *,
          instancia:omni_instancias(*)
        `)
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Cast to handle JSON types properly
      const typedData = (data || []).map(fila => ({
        ...fila,
        horario_funcionamento: fila.horario_funcionamento as OmniFila['horario_funcionamento'],
        instancia: fila.instancia as OmniInstancia | undefined
      }));
      
      setFilas(typedData);
    } catch (error) {
      console.error("Error fetching filas:", error);
      toast.error("Erro ao carregar filas");
    }
  }, [clinicaId]);

  const fetchInstancias = useCallback(async () => {
    if (!clinicaId) return;

    try {
      const { data, error } = await supabase
        .from("omni_instancias")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setInstancias((data || []) as OmniInstancia[]);
    } catch (error) {
      console.error("Error fetching instancias:", error);
    }
  }, [clinicaId]);

  useEffect(() => {
    if (clinicaId) {
      setLoading(true);
      Promise.all([fetchFilas(), fetchInstancias()]).finally(() => setLoading(false));
    }
  }, [clinicaId, fetchFilas, fetchInstancias]);

  const createFila = async (data: Partial<OmniFila>) => {
    if (!clinicaId) return null;

    try {
      const insertData = {
        clinica_id: clinicaId,
        nome: data.nome || "Nova Fila",
        descricao: data.descricao,
        cor: data.cor || "#3b82f6",
        atendimentos_max_agente: data.atendimentos_max_agente || 5,
        estrategia_distribuicao: data.estrategia_distribuicao || "round_robin",
        fechar_por_inatividade_minutos: data.fechar_por_inatividade_minutos || 60,
        mensagem_boas_vindas: data.mensagem_boas_vindas,
        mensagem_fora_horario: data.mensagem_fora_horario,
        mensagem_fechamento: data.mensagem_fechamento,
        mensagem_espera: data.mensagem_espera,
        horario_funcionamento: data.horario_funcionamento || { inicio: "08:00", fim: "18:00", dias_semana: [1,2,3,4,5] },
        instancia_id: data.instancia_id,
        ativo: data.ativo ?? true,
      };

      const { data: fila, error } = await supabase
        .from("omni_filas")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await fetchFilas();
      toast.success("Fila criada com sucesso");
      return fila;
    } catch (error) {
      console.error("Error creating fila:", error);
      toast.error("Erro ao criar fila");
      return null;
    }
  };

  const updateFila = async (id: string, data: Partial<OmniFila>) => {
    try {
      const { error } = await supabase
        .from("omni_filas")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      await fetchFilas();
      toast.success("Fila atualizada com sucesso");
    } catch (error) {
      console.error("Error updating fila:", error);
      toast.error("Erro ao atualizar fila");
    }
  };

  const deleteFila = async (id: string) => {
    try {
      const { error } = await supabase
        .from("omni_filas")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchFilas();
      toast.success("Fila excluída com sucesso");
    } catch (error) {
      console.error("Error deleting fila:", error);
      toast.error("Erro ao excluir fila");
    }
  };

  const createInstancia = async (nome: string) => {
    if (!clinicaId) return null;

    try {
      console.log("[createInstancia] POST zapi-manage create_instance", { nome, clinicaId });

      const response = await supabase.functions.invoke("zapi-manage", {
        body: { action: "create_instance", clinica_id: clinicaId, display_name: nome },
      });

      console.log("[createInstancia] Response:", { error: response.error, data: response.data });

      if (response.error) {
        throw { message: response.error.message || String(response.error) };
      }

      const data = response.data;
      if (data?.ok === false) {
        throw { message: data.message || "Erro de configuração no backend" };
      }

      await fetchInstancias();

      if (data.warning) {
        toast.warning(`Instância criada com aviso: ${data.warning}`);
      } else {
        toast.success("Instância criada com sucesso!");
      }

      return { instancia: data.instancia, qrcode: normalizeQrCodeValue(data.qrCodeBase64), warning: data.warning };
    } catch (error: any) {
      console.error("[createInstancia] Error:", error);
      toast.error(error?.message || "Erro ao criar instância");
      return null;
    }
  };

  const connectInstancia = async (instanciaId: string) => {
    try {
      const response = await supabase.functions.invoke("zapi-manage", {
        body: { action: "get_qr_code", instancia_id: instanciaId },
      });

      if (response.error) throw response.error;
      return { ...response.data, qrcode: normalizeQrCodeValue(response.data?.qrcode) };
    } catch (error) {
      console.error("Error connecting instancia:", error);
      toast.error("Erro ao conectar instância");
      return null;
    }
  };

  const disconnectInstancia = async (instanciaId: string) => {
    try {
      const response = await supabase.functions.invoke("zapi-manage", {
        body: { action: "disconnect_instance", instancia_id: instanciaId },
      });

      if (response.error) throw response.error;

      await fetchInstancias();
      toast.success("Instância desconectada");
    } catch (error) {
      console.error("Error disconnecting instancia:", error);
      toast.error("Erro ao desconectar instância");
    }
  };

  const deleteInstancia = async (instanciaId: string) => {
    try {
      const response = await supabase.functions.invoke("zapi-manage", {
        body: { action: "delete_instance", instancia_id: instanciaId },
      });

      if (response.error) throw response.error;

      await Promise.all([fetchInstancias(), fetchFilas()]);
      toast.success("Instância excluída com sucesso");
      return true;
    } catch (error) {
      console.error("Error deleting instancia:", error);
      toast.error("Erro ao excluir instância");
      return false;
    }
  };

  const checkConnectionStatus = async (instanciaId: string) => {
    try {
      const response = await supabase.functions.invoke("zapi-manage", {
        body: { action: "get_status", instancia_id: instanciaId },
      });

      if (response.error) throw response.error;

      await fetchInstancias();
      return response.data;
    } catch (error) {
      console.error("Error checking connection status:", error);
      return null;
    }
  };

  return {
    filas,
    instancias,
    loading,
    refetch: () => Promise.all([fetchFilas(), fetchInstancias()]),
    createFila,
    updateFila,
    deleteFila,
    createInstancia,
    connectInstancia,
    disconnectInstancia,
    deleteInstancia,
    checkConnectionStatus,
  };
}
