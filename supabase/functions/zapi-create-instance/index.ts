import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ZAPI_CLIENT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Z-API Client Token não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { clinica_id, nome } = await req.json();

    if (!clinica_id || !nome) {
      return new Response(
        JSON.stringify({ error: "clinica_id e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Z-API] Creating instance: ${nome}`);

    // 1. Create instance on Z-API
    const createResponse = await fetchWithRetry(
      `${ZAPI_BASE}/instances/integrator/on-demand`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({
          name: nome,
        }),
      },
      3,
      1000
    );

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      console.error("[Z-API] Create error:", createData);
      return new Response(
        JSON.stringify({ error: "Erro ao criar instância na Z-API", details: createData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Z-API] Instance created:", JSON.stringify(createData));

    const zapiInstanceId = createData.id || createData.instanceId;
    const zapiToken = createData.token;

    if (!zapiInstanceId || !zapiToken) {
      console.error("[Z-API] Missing instanceId or token in response:", createData);
      return new Response(
        JSON.stringify({ error: "Resposta inválida da Z-API (sem instanceId/token)", details: createData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Configure webhooks
    const webhookBaseUrl = `${SUPABASE_URL}/functions/v1/zapi-webhook`;
    // Use update-webhook-received-delivery to also receive "enviadas por mim" (fromMe=true)
    // This is critical: outgoing messages sent from phone/WhatsApp Web arrive via ReceivedCallback
    // Docs: https://developer.z-api.io/webhooks/on-message-received#update-webhook-received-delivery
    const webhookUrls = [
      { endpoint: "update-webhook-received-delivery", url: webhookBaseUrl },
      { endpoint: "update-webhook-message-status", url: webhookBaseUrl },
      { endpoint: "update-webhook-delivery", url: webhookBaseUrl },
      { endpoint: "update-webhook-disconnected", url: webhookBaseUrl },
    ];

    let webhookOk = true;
    for (const wh of webhookUrls) {
      try {
        const whResp = await fetchWithRetry(
          `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/${wh.endpoint}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Client-Token": ZAPI_CLIENT_TOKEN,
            },
            body: JSON.stringify({ value: wh.url }),
          },
          2,
          500
        );
        if (!whResp.ok) {
          const whData = await whResp.json();
          console.warn(`[Z-API] Webhook ${wh.endpoint} warning:`, whData);
          webhookOk = false;
        } else {
          await whResp.text();
          console.log(`[Z-API] Webhook ${wh.endpoint} configured`);
        }
      } catch (err) {
        console.warn(`[Z-API] Webhook ${wh.endpoint} failed:`, err);
        webhookOk = false;
      }
    }

    // 3. Get QR Code
    let qrData: any = null;
    try {
      // Wait a moment for instance to be ready
      await new Promise(r => setTimeout(r, 2000));

      const qrResponse = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/qr-code/image`,
        {
          method: "GET",
          headers: { "Client-Token": ZAPI_CLIENT_TOKEN },
        },
        3,
        2000
      );

      qrData = await qrResponse.json();
      console.log("[Z-API] QR Code response received");
    } catch (err) {
      console.warn("[Z-API] Error getting QR (non-blocking):", err);
    }

    // 4. Save to database
    const { data: instancia, error: dbError } = await supabase
      .from("omni_instancias")
      .insert({
        clinica_id,
        nome,
        provider: "zapi",
        zapi_instance_id: zapiInstanceId,
        zapi_token: zapiToken,
        evolution_instance_name: null,
        status: "disconnected",
        webhook_url: webhookBaseUrl,
        servidor_url: ZAPI_BASE,
        configuracoes: {
          zapi_response: createData,
          webhook_configured: webhookOk,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Z-API] DB error:", dbError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar instância", details: dbError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create sync job
    await supabase
      .from("whatsapp_sync_jobs")
      .insert({
        clinica_id,
        instancia_id: instancia.id,
        status: "queued",
      });

    console.log(`[Z-API] Instance saved: ${instancia.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        instancia,
        qrcode: qrData?.value || qrData,
        webhook_configured: webhookOk,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[Z-API] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
