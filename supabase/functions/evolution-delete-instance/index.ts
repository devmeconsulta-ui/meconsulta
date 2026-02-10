import { Hono } from "jsr:@hono/hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteInstanceRequest {
  instancia_id: string;
}

app.options("*", (c) => {
  return c.text("ok", 200, corsHeaders);
});

app.post("*", async (c) => {
  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return c.json({ error: "Evolution API não configurada" }, 500, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: DeleteInstanceRequest = await c.req.json();
    const { instancia_id } = body;

    if (!instancia_id) {
      return c.json({ error: "instancia_id é obrigatório" }, 400, corsHeaders);
    }

    // Buscar instância
    const { data: instancia, error: fetchError } = await supabase
      .from("omni_instancias")
      .select("*")
      .eq("id", instancia_id)
      .single();

    if (fetchError || !instancia) {
      return c.json({ error: "Instância não encontrada" }, 404, corsHeaders);
    }

    console.log(`Deleting instance: ${instancia.evolution_instance_name}`);

    // Primeiro tentar fazer logout (desconectar) na Evolution API
    try {
      const logoutResponse = await fetch(
        `${EVOLUTION_API_URL}/instance/logout/${instancia.evolution_instance_name}`,
        {
          method: "DELETE",
          headers: {
            "apikey": EVOLUTION_API_KEY,
          },
        }
      );
      const logoutData = await logoutResponse.json();
      console.log("Logout response:", logoutData);
    } catch (logoutError) {
      console.warn("Error during logout (may already be disconnected):", logoutError);
    }

    // Deletar instância na Evolution API
    const deleteResponse = await fetch(
      `${EVOLUTION_API_URL}/instance/delete/${instancia.evolution_instance_name}`,
      {
        method: "DELETE",
        headers: {
          "apikey": EVOLUTION_API_KEY,
        },
      }
    );

    const deleteData = await deleteResponse.json();

    if (!deleteResponse.ok) {
      console.error("Evolution API error during delete:", deleteData);
      // Continua mesmo se a Evolution API falhar (pode já ter sido deletada)
    } else {
      console.log("Instance deleted from Evolution API:", deleteData);
    }

    // Verificar se há filas usando esta instância
    const { data: filasUsando } = await supabase
      .from("omni_filas")
      .select("id")
      .eq("instancia_id", instancia_id);

    if (filasUsando && filasUsando.length > 0) {
      // Desvincular filas da instância
      await supabase
        .from("omni_filas")
        .update({ instancia_id: null })
        .eq("instancia_id", instancia_id);
      
      console.log(`Unlinked ${filasUsando.length} queues from instance`);
    }

    // Deletar instância do banco de dados
    const { error: deleteError } = await supabase
      .from("omni_instancias")
      .delete()
      .eq("id", instancia_id);

    if (deleteError) {
      console.error("Database delete error:", deleteError);
      return c.json({ error: "Erro ao excluir instância do banco", details: deleteError }, 500, corsHeaders);
    }

    console.log("Instance deleted successfully from database");

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
