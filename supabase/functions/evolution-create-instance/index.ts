import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateInstanceRequest {
  clinica_id: string;
  nome: string;
  instance_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution API credentials not configured");
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: CreateInstanceRequest = await req.json();
    const { clinica_id, nome, instance_name } = body;

    if (!clinica_id || !nome) {
      return new Response(
        JSON.stringify({ error: "clinica_id e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        webhookUrl: webhookUrl,
        webhookByEvents: true,
        webhookBase64: true,
        webhookEvents: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "CONNECTION_UPDATE",
          "QRCODE_UPDATED",
          "SEND_MESSAGE",
        ],
      }),
    });

    const evolutionData = await evolutionResponse.json();

    if (!evolutionResponse.ok) {
      console.error("Evolution API error:", evolutionData);
      return new Response(
        JSON.stringify({ error: "Erro ao criar instância na Evolution API", details: evolutionData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Evolution instance created:", evolutionData);

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
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar instância no banco", details: dbError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Instance saved to database:", instancia.id);

    return new Response(
      JSON.stringify({
        success: true,
        instancia,
        evolution_data: evolutionData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating instance:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
