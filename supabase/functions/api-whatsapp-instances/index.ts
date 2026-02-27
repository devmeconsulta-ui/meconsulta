// Standardized endpoint: POST /api/whatsapp/instances
// Front calls: supabase.functions.invoke("api-whatsapp-instances", { body: { instanceName, historyWindow? } })
// Internally delegates to Z-API. Old "zapi-create-instance" kept temporarily.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZAPI_BASE = "https://api.z-api.io";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      console.warn(`[api-whatsapp-instances] Fetch attempt ${i + 1}/${retries} failed:`, error instanceof Error ? error.message : error);
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("All retry attempts failed");
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logToDb(supabase: any, clinicaId: string, instanciaId: string | null, acao: string, status: string, detalhes: any) {
  try {
    await supabase.from("whatsapp_logs").insert({ clinica_id: clinicaId, instancia_id: instanciaId, acao, status, detalhes });
  } catch (e) {
    console.error("[whatsapp_logs] Failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed. Use POST.", statusCode: 405 }, 405);
  }

  try {
    // --- Auth / context ---
    const authHeader = req.headers.get("authorization");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Pre-flight checks ---
    if (!ZAPI_CLIENT_TOKEN) {
      return jsonResponse({ ok: false, message: "Configuração Z-API ausente: defina ZAPI_CLIENT_TOKEN nas secrets.", statusCode: 500 }, 500);
    }

    // --- Parse body ---
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, message: "Body JSON inválido.", statusCode: 400 }, 400);
    }

    const instanceName: string = body.instanceName;
    const clinicaId: string = body.clinica_id;
    const historyWindow: string | undefined = body.historyWindow;

    if (!instanceName || !clinicaId) {
      return jsonResponse({ ok: false, message: "instanceName e clinica_id são obrigatórios.", statusCode: 400 }, 400);
    }

    console.log(`[api-whatsapp-instances] Creating: ${instanceName} for clinic: ${clinicaId} (historyWindow: ${historyWindow || "default"})`);

    // --- 1. Create instance on Z-API ---
    let createData: any;
    try {
      const createResp = await fetchWithRetry(
        `${ZAPI_BASE}/instances/integrator/on-demand`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
          body: JSON.stringify({ name: instanceName }),
        },
        3,
        1000
      );

      createData = await createResp.json();

      if (!createResp.ok) {
        console.error("[api-whatsapp-instances] Z-API error:", createData, "status:", createResp.status);
        await logToDb(supabase, clinicaId, null, "create_instance", "error", { response: createData, status: createResp.status });

        if (createResp.status === 401 || createResp.status === 403) {
          return jsonResponse({ ok: false, message: "Token Z-API inválido ou sem permissão (401/403).", statusCode: createResp.status }, 401);
        }
        if (createResp.status === 404) {
          return jsonResponse({ ok: false, message: "Endpoint Z-API não encontrado (404). Verifique o path e o tipo de instância.", statusCode: 404 }, 404);
        }
        return jsonResponse({
          ok: false,
          message: `Erro Z-API (HTTP ${createResp.status}): ${createData?.message || createData?.error || JSON.stringify(createData)}`,
          statusCode: createResp.status,
        }, 502);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection error";
      console.error("[api-whatsapp-instances] Z-API unreachable:", msg);
      await logToDb(supabase, clinicaId, null, "create_instance", "error", { error: msg });
      return jsonResponse({ ok: false, message: `Z-API indisponível: ${msg}`, statusCode: 503 }, 503);
    }

    console.log("[api-whatsapp-instances] Z-API response:", JSON.stringify(createData));

    const zapiInstanceId = createData.id || createData.instanceId;
    const zapiToken = createData.token;

    if (!zapiInstanceId || !zapiToken) {
      console.error("[api-whatsapp-instances] Missing credentials in Z-API response:", createData);
      await logToDb(supabase, clinicaId, null, "create_instance", "error", { response: createData });
      return jsonResponse({ ok: false, message: "Resposta inválida da Z-API (sem credenciais). Contate o suporte.", statusCode: 500 }, 500);
    }

    // --- 2. Configure webhooks ---
    const webhookUrl = `${SUPABASE_URL}/functions/v1/zapi-webhook`;
    let webhookOk = false;
    let webhookError: string | null = null;

    try {
      const whResp = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/update-every-webhooks`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
          body: JSON.stringify({ value: webhookUrl, notifySentByMe: true }),
        },
        3,
        1000
      );
      const whData = await whResp.json();
      if (whResp.ok && whData.value === true) {
        webhookOk = true;
        console.log("[api-whatsapp-instances] All webhooks configured (notifySentByMe=true)");
      } else {
        webhookError = JSON.stringify(whData);
        console.warn("[api-whatsapp-instances] update-every-webhooks unexpected:", whData);
      }
    } catch (err) {
      webhookError = err instanceof Error ? err.message : "Connection error";
      console.error("[api-whatsapp-instances] Webhook config failed:", webhookError);
    }

    // Fallback to individual endpoints
    if (!webhookOk) {
      console.log("[api-whatsapp-instances] Falling back to individual webhook endpoints");
      const endpoints = [
        "update-webhook-received-delivery",
        "update-webhook-message-status",
        "update-webhook-delivery",
        "update-webhook-disconnected",
        "update-webhook-connected",
      ];
      let allOk = true;
      for (const ep of endpoints) {
        try {
          const resp = await fetchWithRetry(
            `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/${ep}`,
            { method: "PUT", headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN }, body: JSON.stringify({ value: webhookUrl }) },
            2, 500
          );
          if (!resp.ok) { await resp.text(); allOk = false; } else { await resp.text(); }
        } catch { allOk = false; }
      }
      webhookOk = allOk;
    }

    // --- 3. QR Code ---
    let qrData: any = null;
    try {
      await new Promise(r => setTimeout(r, 2000));
      const qrResp = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/qr-code/image`,
        { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN } },
        3, 2000
      );
      qrData = await qrResp.json();
    } catch (err) {
      console.warn("[api-whatsapp-instances] QR fetch (non-blocking):", err);
    }

    // --- 4. Save to DB ---
    const { data: instancia, error: dbError } = await supabase
      .from("omni_instancias")
      .insert({
        clinica_id: clinicaId,
        nome: instanceName,
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
          history_window: historyWindow || null,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("[api-whatsapp-instances] DB save error:", dbError);
      await logToDb(supabase, clinicaId, null, "create_instance", "error", { error: dbError });
      return jsonResponse({ ok: false, message: "Instância criada na Z-API mas houve erro ao salvar no banco.", statusCode: 500, details: dbError }, 500);
    }

    // --- 5. Sync job ---
    await supabase.from("whatsapp_sync_jobs").insert({
      clinica_id: clinicaId,
      instancia_id: instancia.id,
      status: "queued",
    });

    // --- 6. Log success ---
    await logToDb(supabase, clinicaId, instancia.id, "create_instance", "success", {
      zapi_instance_id: zapiInstanceId,
      webhook_configured: webhookOk,
    });

    console.log(`[api-whatsapp-instances] Done: ${instancia.id}`);

    return jsonResponse({
      ok: true,
      success: true,
      instancia,
      qrcode: qrData?.value || qrData,
      webhook_configured: webhookOk,
    });
  } catch (error: unknown) {
    console.error("[api-whatsapp-instances] Unhandled:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ ok: false, message: `Erro interno: ${msg}`, statusCode: 500 }, 500);
  }
});
