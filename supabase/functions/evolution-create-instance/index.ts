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
      console.error("Evolution API credentials not configured");
      return c.json({ error: "Evolution API não configurada" }, 500, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: CreateInstanceRequest = await c.req.json();
    const { clinica_id, nome, instance_name } = body;

    if (!clinica_id || !nome) {
      return c.json({ error: "clinica_id e nome são obrigatórios" }, 400, corsHeaders);
    }

    // Gera um nome único para a instância
    const evolutionInstanceName = instance_name || `clinic_${clinica_id.substring(0, 8)}_${Date.now()}`;

    // Configuração do webhook que receberá os eventos
    const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-webhook`;

    console.log(`Creating Evolution instance: ${evolutionInstanceName}`);

    // Criar instância na Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
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
    });

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      console.error("Evolution API error:", evolutionData);
      return c.json({ error: "Erro ao criar instância na Evolution API", details: evolutionData }, 500, corsHeaders);
    }

    console.log("Evolution instance created:", evolutionData);

    // Configurar webhook separadamente (Evolution API v2)
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

    const webhookResponse = await fetch(`${EVOLUTION_API_URL}/webhook/set/${evolutionInstanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify(webhookConfig),
    });

    const webhookData = await webhookResponse.json();

    if (!webhookResponse.ok) {
      console.warn("Webhook configuration warning:", webhookData);
      // Não falha se o webhook não configurar, apenas loga o aviso
    } else {
      console.log("Webhook configured successfully:", webhookData);
    }

    // Salvar instância no banco de dados
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
          webhook_configured: webhookResponse.ok,
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
      webhook_configured: webhookResponse.ok,
      webhook_data: webhookData,
    }, 200, corsHeaders);
  } catch (error: unknown) {
    console.error("Error creating instance:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: "Erro interno", details: message }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);
