// Standardized endpoint: POST /api-whatsapp-instances
// Registers an existing Z-API instance (created in the Z-API admin panel).
// The user provides instanceId + token + name.
// This function configures webhooks and saves to DB.
// NO integrator endpoint is used.

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Parse body ---
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, message: "Body JSON inválido.", statusCode: 400 }, 400);
    }

    const instanceName: string = body.instanceName;
    const clinicaId: string = body.clinica_id;
    const zapiInstanceId: string = body.zapiInstanceId;
    const zapiToken: string = body.zapiToken;

    if (!instanceName || !clinicaId || !zapiInstanceId || !zapiToken) {
      return jsonResponse({
        ok: false,
        message: "Campos obrigatórios: instanceName, clinica_id, zapiInstanceId, zapiToken.",
        statusCode: 400,
      }, 400);
    }

    console.log(`[api-whatsapp-instances] Registering instance: ${instanceName} (Z-API ID: ${zapiInstanceId}) for clinic: ${clinicaId}`);

    // Build Client-Token header (optional — only sent if configured)
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ZAPI_CLIENT_TOKEN) {
      headers["Client-Token"] = ZAPI_CLIENT_TOKEN;
    }

    // --- 1. Validate instance by fetching status from Z-API (normal client endpoint) ---
    // Endpoint: GET /instances/{instanceId}/token/{token}/status
    let instanceValid = false;
    try {
      const statusResp = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/status`,
        { method: "GET", headers },
        2,
        1000
      );
      const statusData = await statusResp.json();
      console.log("[api-whatsapp-instances] Status check response:", JSON.stringify(statusData), "HTTP:", statusResp.status);

      if (statusResp.ok) {
        instanceValid = true;
      } else if (statusResp.status === 401 || statusResp.status === 403) {
        return jsonResponse({
          ok: false,
          message: "Instance ID ou Token inválidos. Verifique no painel Z-API.",
          statusCode: 401,
        }, 401);
      }
    } catch (err) {
      console.warn("[api-whatsapp-instances] Status check failed (non-blocking):", err instanceof Error ? err.message : err);
      // Continue anyway — instance might still work
      instanceValid = true;
    }

    // --- 2. Configure webhooks using normal client endpoints ---
    const webhookUrl = `${SUPABASE_URL}/functions/v1/zapi-webhook?provider=zapi&company=${clinicaId}`;
    let webhookOk = false;
    let webhookError: string | null = null;

    // Try bulk webhook endpoint first
    try {
      const whResp = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/update-every-webhooks`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: webhookUrl, notifySentByMe: true }),
        },
        3,
        1000
      );
      const whData = await whResp.json();
      console.log("[api-whatsapp-instances] update-every-webhooks response:", JSON.stringify(whData), "HTTP:", whResp.status);
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
            { method: "PUT", headers, body: JSON.stringify({ value: webhookUrl }) },
            2, 500
          );
          if (!resp.ok) { await resp.text(); allOk = false; } else { await resp.text(); }
        } catch { allOk = false; }
      }
      webhookOk = allOk;
    }

    // --- 3. Try to get QR Code ---
    let qrData: any = null;
    try {
      const qrResp = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/qr-code/image`,
        { method: "GET", headers },
        2, 1000
      );
      qrData = await qrResp.json();
      console.log("[api-whatsapp-instances] QR code response HTTP:", qrResp.status);
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
          registered_manually: true,
          webhook_configured: webhookOk,
          webhook_error: webhookError,
          notify_sent_by_me: true,
          instance_valid: instanceValid,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("[api-whatsapp-instances] DB save error:", dbError);
      await logToDb(supabase, clinicaId, null, "register_instance", "error", { error: dbError });
      return jsonResponse({ ok: false, message: "Erro ao salvar instância no banco.", statusCode: 500, details: dbError }, 500);
    }

    // --- 5. Sync job ---
    await supabase.from("whatsapp_sync_jobs").insert({
      clinica_id: clinicaId,
      instancia_id: instancia.id,
      status: "queued",
    });

    // --- 6. Log success ---
    await logToDb(supabase, clinicaId, instancia.id, "register_instance", "success", {
      zapi_instance_id: zapiInstanceId,
      webhook_configured: webhookOk,
    });

    console.log(`[api-whatsapp-instances] Done: ${instancia.id} (webhooks: ${webhookOk})`);

    return jsonResponse({
      ok: true,
      success: true,
      instanceId: instancia.id,
      instancia,
      qrCodeBase64: qrData?.value || qrData || null,
      status: "connecting",
      webhook_configured: webhookOk,
      ...(webhookOk ? {} : { warning: "Webhooks pendentes. Reconecte ou reconfigure manualmente." }),
    });
  } catch (error: unknown) {
    console.error("[api-whatsapp-instances] Unhandled:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ ok: false, message: `Erro interno: ${msg}`, statusCode: 500 }, 500);
  }
});
