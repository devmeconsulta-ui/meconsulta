// Evolution API v2 — Create Instance
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EVO_URL || !EVO_KEY) {
      return new Response(JSON.stringify({ error: "EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { clinica_id, nome } = await req.json();
    if (!clinica_id || !nome) {
      return new Response(JSON.stringify({ error: "clinica_id e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Gera nome único para a instância na Evolution
    const safeName = String(nome).toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
    const instanceName = `${safeName}-${clinica_id.slice(0, 8)}`;

    // Cria instância na Evolution API v2
    const createResp = await fetch(`${EVO_URL}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
    const createData = await createResp.json();
    console.log("[evolution-v2-create] create response:", JSON.stringify(createData).slice(0, 500));

    if (!createResp.ok) {
      return new Response(JSON.stringify({ error: "Falha ao criar instância", details: createData }),
        { status: createResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const instanceApiKey = createData?.hash?.apikey || createData?.hash || createData?.apikey || EVO_KEY;
    const instanceId = createData?.instance?.instanceId || createData?.instance?.instanceName || instanceName;

    // Configura webhook automaticamente
    const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-v2-webhook`;
    try {
      await fetch(`${EVO_URL}/webhook/set/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: instanceApiKey },
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            enabled: true,
            webhookByEvents: false,
            webhookBase64: true,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "CONNECTION_UPDATE",
              "CONTACTS_UPSERT",
              "SEND_MESSAGE",
              "QRCODE_UPDATED",
            ],
          },
        }),
      });
    } catch (whErr) {
      console.warn("[evolution-v2-create] webhook set failed:", whErr);
    }

    // Persiste em managed_instances
    const { data: row, error: dbErr } = await supabase
      .from("managed_instances")
      .insert({
        clinica_id,
        nome,
        provider: "evolution",
        evolution_instance_name: instanceName,
        evolution_api_key: instanceApiKey,
        external_instance_id: instanceId,
        external_token: instanceApiKey,
        status: "connecting",
      })
      .select()
      .single();

    if (dbErr) {
      console.error("[evolution-v2-create] db error:", dbErr);
      return new Response(JSON.stringify({ error: "Falha ao salvar instância", details: dbErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      instance: row,
      qrcode: createData?.qrcode?.base64 || null,
      pairingCode: createData?.qrcode?.pairingCode || null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[evolution-v2-create] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
