import { Hono } from "jsr:@hono/hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_BASE = "https://api.z-api.io";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1}/${retries} failed:`, error instanceof Error ? error.message : error);
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("All retry attempts failed");
}

app.options("*", (c) => {
  return c.text("ok", 200, corsHeaders);
});

app.post("*", async (c) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { instancia_id } = await c.req.json();

    if (!instancia_id) {
      return c.json({ error: "instancia_id é obrigatório" }, 400, corsHeaders);
    }

    const { data: instancia, error: fetchError } = await supabase
      .from("omni_instancias")
      .select("*")
      .eq("id", instancia_id)
      .single();

    if (fetchError || !instancia) {
      return c.json({ error: "Instância não encontrada" }, 404, corsHeaders);
    }

    // ===== Z-API PROVIDER =====
    if (instancia.provider === "zapi") {
      const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

      // Try to disconnect on Z-API
      if (ZAPI_CLIENT_TOKEN && instancia.zapi_instance_id && instancia.zapi_token) {
        try {
          await fetchWithRetry(
            `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/disconnect`,
            { method: "DELETE", headers: { "Client-Token": ZAPI_CLIENT_TOKEN } },
            2, 500
          );
        } catch (err) {
          console.warn("[Z-API] Disconnect error (proceeding):", err);
        }
      }

      // Unlink queues
      const { data: filasUsando } = await supabase
        .from("omni_filas")
        .select("id")
        .eq("instancia_id", instancia_id);

      if (filasUsando?.length) {
        await supabase
          .from("omni_filas")
          .update({ instancia_id: null })
          .eq("instancia_id", instancia_id);
      }

      // Delete sync jobs
      await supabase
        .from("whatsapp_sync_jobs")
        .delete()
        .eq("instancia_id", instancia_id);

      // Delete from DB
      const { error: deleteError } = await supabase
        .from("omni_instancias")
        .delete()
        .eq("id", instancia_id);

      if (deleteError) {
        return c.json({ error: "Erro ao excluir instância", details: deleteError }, 500, corsHeaders);
      }

      return c.json({
        success: true,
        message: "Instância Z-API excluída com sucesso",
        filas_desvinculadas: filasUsando?.length || 0,
      }, 200, corsHeaders);
    }

    // ===== EVOLUTION PROVIDER =====
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return c.json({ error: "Evolution API não configurada" }, 500, corsHeaders);
    }

    console.log(`Deleting instance: ${instancia.evolution_instance_name}`);

    try {
      await fetchWithRetry(
        `${EVOLUTION_API_URL}/instance/logout/${instancia.evolution_instance_name}`,
        { method: "DELETE", headers: { "apikey": EVOLUTION_API_KEY } },
        2, 500
      );
    } catch (logoutError) {
      console.warn("Error during logout (proceeding):", logoutError);
    }

    try {
      const deleteResponse = await fetchWithRetry(
        `${EVOLUTION_API_URL}/instance/delete/${instancia.evolution_instance_name}`,
        { method: "DELETE", headers: { "apikey": EVOLUTION_API_KEY } },
        3, 800
      );
      if (!deleteResponse.ok) {
        const deleteData = await deleteResponse.json();
        console.error("Evolution API error during delete:", deleteData);
      }
    } catch (evoError) {
      console.warn("Evolution API unreachable during delete (proceeding):", evoError);
    }

    const { data: filasUsando } = await supabase
      .from("omni_filas")
      .select("id")
      .eq("instancia_id", instancia_id);

    if (filasUsando?.length) {
      await supabase
        .from("omni_filas")
        .update({ instancia_id: null })
        .eq("instancia_id", instancia_id);
    }

    const { error: deleteError } = await supabase
      .from("omni_instancias")
      .delete()
      .eq("id", instancia_id);

    if (deleteError) {
      return c.json({ error: "Erro ao excluir instância do banco", details: deleteError }, 500, corsHeaders);
    }

    return c.json({
      success: true,
      message: "Instância excluída com sucesso",
      filas_desvinculadas: filasUsando?.length || 0,
    }, 200, corsHeaders);
  } catch (error: unknown) {
    console.error("Error deleting instance:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Erro interno", details: message }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);
