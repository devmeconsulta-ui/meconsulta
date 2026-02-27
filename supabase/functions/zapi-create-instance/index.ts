import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_BASE = "https://api.z-api.io";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  // GUARD: block any integrator endpoint usage
  if (/integrator/i.test(url)) {
    throw new Error("Endpoint integrator não permitido. Use client API.");
  }
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

async function logError(supabase: any, clinicaId: string, instanciaId: string | null, acao: string, detalhes: any) {
  try {
    await supabase.from("whatsapp_logs").insert({
      clinica_id: clinicaId,
      instancia_id: instanciaId,
      acao,
      status: "error",
      detalhes,
    });
  } catch (e) {
    console.error("[whatsapp_logs] Failed to log:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // === PRE-FLIGHT CHECKLIST ===
    if (!ZAPI_CLIENT_TOKEN) {
      return new Response(
        JSON.stringify({ ok: false, message: "Configuração Z-API ausente: defina ZAPI_CLIENT_TOKEN nas secrets do projeto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ZAPI_BASE || ZAPI_BASE.trim() === "") {
      return new Response(
        JSON.stringify({ ok: false, message: "Configuração Z-API ausente: ZAPI_BASE_URL não definida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { clinica_id, nome } = await req.json();

    if (!clinica_id || !nome) {
      return new Response(
        JSON.stringify({ ok: false, message: "clinica_id e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Z-API] Creating instance: ${nome} for clinic: ${clinica_id}`);

    // 1. Create instance on Z-API
    let createData: any;
    try {
      const createResponse = await fetchWithRetry(
        `${ZAPI_BASE}/instances/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Client-Token": ZAPI_CLIENT_TOKEN,
          },
          body: JSON.stringify({ name: nome }),
        },
        3, 1000
      );

      createData = await createResponse.json();

      if (!createResponse.ok) {
        console.error("[Z-API] Create error:", createData, "status:", createResponse.status);
        await logError(supabase, clinica_id, null, "zapi_create_instance", { response: createData, status: createResponse.status });

        // Specific HTTP status messages
        if (createResponse.status === 401 || createResponse.status === 403) {
          return new Response(
            JSON.stringify({ ok: false, message: "Token Z-API inválido ou sem permissão (401/403)" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (createResponse.status === 404) {
          return new Response(
            JSON.stringify({ ok: false, message: "Endpoint Z-API não encontrado (404). Verifique o path e o tipo de instância (web/mobile)." }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ ok: false, message: `Erro Z-API (HTTP ${createResponse.status}): ${createData?.message || createData?.error || JSON.stringify(createData)}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection error";
      console.error("[Z-API] Create failed:", message);
      await logError(supabase, clinica_id, null, "zapi_create_instance", { error: message });
      return new Response(
        JSON.stringify({ ok: false, message: `Z-API indisponível: ${message}` }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Z-API] Instance created:", JSON.stringify(createData));

    const zapiInstanceId = createData.id || createData.instanceId;
    const zapiToken = createData.token;

    if (!zapiInstanceId || !zapiToken) {
      console.error("[Z-API] Missing instanceId or token in response:", createData);
      await logError(supabase, clinica_id, null, "zapi_create_instance_missing_creds", { response: createData });
      return new Response(
        JSON.stringify({ error: "Resposta inválida da Z-API (sem credenciais). Contate o suporte." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Configure ALL webhooks via single endpoint (update-every-webhooks)
    // This sets: Ao enviar, Ao receber, Ao conectar, Ao desconectar, Presença do chat, Status da mensagem
    // notifySentByMe=true enables "Notificar as enviadas por mim também"
    const webhookUrl = `${SUPABASE_URL}/functions/v1/zapi-webhook`;
    let webhookOk = false;
    let webhookError: string | null = null;

    try {
      console.log(`[Z-API] Configuring all webhooks via update-every-webhooks`);
      const whResp = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/update-every-webhooks`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
          body: JSON.stringify({
            value: webhookUrl,
            notifySentByMe: true,
          }),
        },
        3, 1000
      );

      const whData = await whResp.json();
      if (whResp.ok && whData.value === true) {
        webhookOk = true;
        console.log("[Z-API] All webhooks configured successfully (notifySentByMe=true)");
      } else {
        webhookError = JSON.stringify(whData);
        console.warn("[Z-API] update-every-webhooks returned unexpected:", whData);
      }
    } catch (err) {
      webhookError = err instanceof Error ? err.message : "Connection error";
      console.error("[Z-API] update-every-webhooks failed:", webhookError);
    }

    // If bulk failed, try individual endpoints as fallback
    if (!webhookOk) {
      console.log("[Z-API] Falling back to individual webhook endpoints");
      const individualEndpoints = [
        "update-webhook-received-delivery",  // Ao receber (inclui enviadas por mim)
        "update-webhook-message-status",     // Status da mensagem
        "update-webhook-delivery",           // Ao enviar
        "update-webhook-disconnected",       // Ao desconectar
        "update-webhook-connected",          // Ao conectar
      ];

      let allOk = true;
      for (const endpoint of individualEndpoints) {
        try {
          const resp = await fetchWithRetry(
            `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/${endpoint}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
              body: JSON.stringify({ value: webhookUrl }),
            },
            2, 500
          );
          if (!resp.ok) {
            const data = await resp.json();
            console.warn(`[Z-API] ${endpoint} warning:`, data);
            allOk = false;
          } else {
            await resp.text();
            console.log(`[Z-API] ${endpoint} configured`);
          }
        } catch (err) {
          console.warn(`[Z-API] ${endpoint} failed:`, err);
          allOk = false;
        }
      }
      webhookOk = allOk;
    }

    // 3. Get QR Code
    let qrData: any = null;
    try {
      await new Promise(r => setTimeout(r, 2000));
      const qrResponse = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/qr-code/image`,
        { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN } },
        3, 2000
      );
      qrData = await qrResponse.json();
      console.log("[Z-API] QR Code response received");
    } catch (err) {
      console.warn("[Z-API] Error getting QR (non-blocking):", err);
    }

    // 4. Save to database — always provider="zapi"
    const { data: instancia, error: dbError } = await supabase
      .from("omni_instancias")
      .insert({
        clinica_id,
        nome,
        provider: "zapi",
        zapi_instance_id: zapiInstanceId,
        zapi_token: zapiToken,
        evolution_instance_name: null,
        status: "connecting",
        webhook_url: webhookUrl,
        servidor_url: ZAPI_BASE,
        webhooks_configured: webhookOk,
        webhooks_configured_at: webhookOk ? new Date().toISOString() : null,
        configuracoes: {
          zapi_response: createData,
          webhook_configured: webhookOk,
          webhook_error: webhookError,
          notify_sent_by_me: true,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Z-API] DB error:", dbError);
      await logError(supabase, clinica_id, null, "zapi_create_db_save", { error: dbError });
      return new Response(
        JSON.stringify({ error: "Instância criada na Z-API mas houve erro ao salvar no banco.", details: dbError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create sync job
    await supabase.from("whatsapp_sync_jobs").insert({
      clinica_id,
      instancia_id: instancia.id,
      status: "queued",
    });

    // 6. Log success
    await supabase.from("whatsapp_logs").insert({
      clinica_id,
      instancia_id: instancia.id,
      acao: "zapi_create_instance",
      status: "success",
      detalhes: { zapi_instance_id: zapiInstanceId, webhook_configured: webhookOk },
    }).catch(() => {});

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
      JSON.stringify({ error: "Erro interno ao criar instância. Tente novamente.", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
