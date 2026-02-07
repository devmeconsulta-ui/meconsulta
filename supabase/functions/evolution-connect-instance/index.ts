import { Hono } from "jsr:@hono/hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConnectInstanceRequest {
  instancia_id: string;
}

app.options("*", (c) => {
  return c.text("ok", 200, corsHeaders);
});

app.post("/", async (c) => {
  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return c.json({ error: "Evolution API não configurada" }, 500, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: ConnectInstanceRequest = await c.req.json();
    const { instancia_id } = body;

    if (!instancia_id) {
      return c.json({ error: "instancia_id é obrigatório" }, 400, corsHeaders);
    }

    // Buscar instância no banco
    const { data: instancia, error: fetchError } = await supabase
      .from("omni_instancias")
      .select("*")
      .eq("id", instancia_id)
      .single();

    if (fetchError || !instancia) {
      return c.json({ error: "Instância não encontrada" }, 404, corsHeaders);
    }

    console.log(`Connecting instance: ${instancia.evolution_instance_name}`);

    // Atualizar status para connecting
    await supabase
      .from("omni_instancias")
      .update({ status: "connecting" })
      .eq("id", instancia_id);

    // Buscar QR Code na Evolution API
    const qrResponse = await fetch(
      `${EVOLUTION_API_URL}/instance/connect/${instancia.evolution_instance_name}`,
      {
        method: "GET",
        headers: {
          "apikey": EVOLUTION_API_KEY,
        },
      }
    );

    const qrData = await qrResponse.json();

    if (!qrResponse.ok) {
      console.error("Evolution API error getting QR:", qrData);
      
      // Reverter status
      await supabase
        .from("omni_instancias")
        .update({ status: "disconnected" })
        .eq("id", instancia_id);

      return c.json({ error: "Erro ao gerar QR Code", details: qrData }, 500, corsHeaders);
    }

    console.log("QR Code generated successfully");

    return c.json({
      success: true,
      qrcode: qrData.base64 || qrData.qrcode?.base64 || qrData,
      pairingCode: qrData.pairingCode,
      instance: instancia.evolution_instance_name,
    }, 200, corsHeaders);
  } catch (error: unknown) {
    console.error("Error connecting instance:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Erro interno", details: message }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);
