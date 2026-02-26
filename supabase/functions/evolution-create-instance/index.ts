import { Hono } from "jsr:@hono/hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateInstanceRequest {
  clinica_id: string;
  nome: string;
  instance_name?: string;
}

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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution API credentials not configured");
      return c.json({ error: "Evolution API não configurada" }, 500, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: CreateInstanceRequest = await c.req.json();
    const { clinica_id, nome, instance_name } = body;

    if (!clinica_id || !nome) {
      return c.json({ error: "clinica_id e nome são obrigatórios" }, 400, corsHeaders);
    }

    const evolutionInstanceName = instance_name || `clinic_${clinica_id.substring(0, 8)}_${Date.now()}`;
    const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;

    console.log(`Creating Evolution instance: ${evolutionInstanceName}`);

    // Criar instância com retry
    const evolutionResponse = await fetchWithRetry(
      `${EVOLUTION_API_URL}/instance/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName: evolutionInstanceName,
          integration: "WHATSAPP-BAILEYS",
          token: EVOLUTION_API_KEY,
          qrcode: true,
        }),
      },
      4,
      1000
    );

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      console.error("Evolution API error:", evolutionData);
      return c.json({ error: "Erro ao criar instância na Evolution API", details: evolutionData }, 500, corsHeaders);
    }

    console.log("Evolution instance created:", evolutionData);

    // Configurar webhook com retry
    console.log(`Configuring webhook for instance: ${evolutionInstanceName}`);

    const webhookConfig = {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: true,
        webhookBase64: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "MESSAGES_SET",
          "CONNECTION_UPDATE",
          "SEND_MESSAGE",
        ],
      },
    };

    let webhookOk = false;
    let webhookData: any = {};
    try {
      const webhookResponse = await fetchWithRetry(
        `${EVOLUTION_API_URL}/webhook/set/${evolutionInstanceName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
          },
          body: JSON.stringify(webhookConfig),
        },
        3,
        800
      );

      webhookData = await webhookResponse.json();
      webhookOk = webhookResponse.ok;

      if (!webhookOk) {
        console.warn("Webhook configuration warning:", webhookData);
      } else {
        console.log("Webhook configured successfully:", webhookData);
      }
    } catch (whErr) {
      console.warn("Webhook configuration failed (non-blocking):", whErr);
    }

    // Salvar instância no banco
    const { data: instancia, error: dbError } = await supabase
      .from("omni_instancias")
      .insert({
        clinica_id,
        nome,
        evolution_instance_name: evolutionInstanceName,
        status: "disconnected",
        webhook_url: webhookUrl,
        servidor_url: EVOLUTION_API_URL,
        configuracoes: {
          integration: "WHATSAPP-BAILEYS",
          created_at_evolution: evolutionData,
          webhook_config: webhookConfig,
          webhook_configured: webhookOk,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return c.json({ error: "Erro ao salvar instância no banco", details: dbError }, 500, corsHeaders);
    }

    console.log("Instance saved to database:", instancia.id);

    return c.json({
      success: true,
      instancia,
      evolution_data: evolutionData,
      webhook_configured: webhookOk,
      webhook_data: webhookData,
    }, 200, corsHeaders);
  } catch (error: unknown) {
    console.error("Error creating instance:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Erro interno", details: message }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);
