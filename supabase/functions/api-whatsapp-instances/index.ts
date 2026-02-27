// Standardized endpoint: POST /api-whatsapp-instances
// Creates a Z-API instance via Client API, configures webhooks, and returns QR code.
// Uses ZAPI_CLIENT_TOKEN with standard client endpoints (NOT integrator).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZAPI_BASE = "https://api.z-api.io";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  // GUARD: block any integrator endpoint usage
  if (/integrator/i.test(url)) {
    throw new Error("Endpoint integrator não permitido. Use client API.");
  }
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
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!ZAPI_CLIENT_TOKEN) {
      return jsonResponse({ ok: false, message: "ZAPI_CLIENT_TOKEN não configurado. Adicione nas secrets do projeto.", statusCode: 500 }, 500);
    }

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

    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    };

    console.log(`[api-whatsapp-instances] Creating: ${instanceName} for clinic: ${clinicaId}`);

    // --- 1. Create instance on Z-API (Client API) ---
    const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=zapi&company=${clinicaId}`;

    let createData: any;
    let autoProvisioned = true;
    let createAttemptError: any = null;

    try {
      const createEndpoints = [
        `${ZAPI_BASE}/instances`,
        `${ZAPI_BASE}/instances/create`,
      ];

      const extractCredentials = (payload: any) => {
        const direct = payload?.data ?? payload?.instance ?? payload;
        if (direct?.id && direct?.token) return direct;
        const firstContent = Array.isArray(payload?.content) ? payload.content[0] : null;
        if (firstContent?.id && firstContent?.token) return firstContent;
        return null;
      };

      let lastError: any = null;
      for (const endpoint of createEndpoints) {
        const createResp = await fetchWithRetry(endpoint, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            name: instanceName,
            deliveryCallbackUrl: webhookUrl,
            receivedCallbackUrl: webhookUrl,
            disconnectedCallbackUrl: webhookUrl,
            connectedCallbackUrl: webhookUrl,
            messageStatusCallbackUrl: webhookUrl,
          }),
        }, 3, 1500);

        const payload = await createResp.json().catch(() => ({}));
        console.log(`[api-whatsapp-instances] Create attempt ${endpoint} HTTP:`, createResp.status);

        if (payload?.error === "NOT_FOUND") {
          lastError = payload;
          continue;
        }

        const credentials = extractCredentials(payload);
        if (!createResp.ok || !credentials) {
          lastError = payload;
          continue;
        }

        createData = credentials;
        break;
      }

      if (!createData) {
        autoProvisioned = false;
        createAttemptError = lastError;
        console.warn("[api-whatsapp-instances] Auto-create unavailable via Client API, continuing in pending mode.", lastError);
      }
    } catch (err) {
      autoProvisioned = false;
      createAttemptError = err instanceof Error ? err.message : err;
      console.warn("[api-whatsapp-instances] Auto-create failed, continuing in pending mode:", createAttemptError);
    }

    const zapiInstanceId = createData?.id || createData?.instanceId || null;
    const zapiToken = createData?.token || null;
    const hasRemoteCredentials = Boolean(zapiInstanceId && zapiToken);
    const initialWebhookError = !hasRemoteCredentials
      ? (typeof createAttemptError === "string" ? createAttemptError : JSON.stringify(createAttemptError || {}))
      : null;

    // --- 2. Configure webhooks (bulk endpoint with notifySentByMe) ---
    let webhookOk = false;
    let webhookError: string | null = initialWebhookError;

    if (hasRemoteCredentials) {
      try {
        const whResp = await fetchWithRetry(
          `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/update-every-webhooks`,
          {
            method: "PUT",
            headers: authHeaders,
            body: JSON.stringify({ value: webhookUrl, notifySentByMe: true }),
          },
          3,
          1000
        );
        const whData = await whResp.json();
        console.log("[api-whatsapp-instances] Webhooks response:", JSON.stringify(whData), "HTTP:", whResp.status);
        if (whResp.ok && whData.value === true) {
          webhookOk = true;
        } else {
          webhookError = JSON.stringify(whData);
        }
      } catch (err) {
        webhookError = err instanceof Error ? err.message : "Connection error";
      }

      // Fallback to individual webhook endpoints
      if (!webhookOk) {
        console.log("[api-whatsapp-instances] Fallback: individual webhook endpoints");
        const endpoints = [
          "update-webhook-received-delivery",  // ao receber
          "update-webhook-message-status",     // status da mensagem
          "update-webhook-delivery",           // ao enviar
          "update-webhook-disconnected",       // ao desconectar
          "update-webhook-connected",          // ao conectar
          "update-webhook-chat-presence",      // presença do chat
        ];
        let allOk = true;
        for (const ep of endpoints) {
          try {
            const resp = await fetchWithRetry(
              `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/${ep}`,
              { method: "PUT", headers: authHeaders, body: JSON.stringify({ value: webhookUrl }) },
              2, 500
            );
            if (!resp.ok) allOk = false;
            await resp.text();
          } catch {
            allOk = false;
          }
        }
        webhookOk = allOk;
      }
    }

    // --- 3. Get QR Code ---
    let qrData: any = null;
    if (hasRemoteCredentials) {
      try {
        await new Promise(r => setTimeout(r, 2000));
        const qrResp = await fetchWithRetry(
          `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/qr-code/image`,
          { method: "GET", headers: authHeaders },
          3, 2000
        );
        qrData = await qrResp.json();
        console.log("[api-whatsapp-instances] QR code HTTP:", qrResp.status);
      } catch (err) {
        console.warn("[api-whatsapp-instances] QR fetch (non-blocking):", err);
      }
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
        status: hasRemoteCredentials ? "connecting" : "disconnected",
        webhook_url: webhookUrl,
        servidor_url: ZAPI_BASE,
        webhooks_configured: webhookOk,
        webhooks_configured_at: webhookOk ? new Date().toISOString() : null,
        configuracoes: {
          zapi_response: createData || null,
          webhook_configured: webhookOk,
          webhook_error: webhookError,
          notify_sent_by_me: true,
          history_window: historyWindow || null,
          auto_provisioned: autoProvisioned,
          create_attempt_error: createAttemptError || null,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("[api-whatsapp-instances] DB save error:", dbError);
      await logToDb(supabase, clinicaId, null, "create_instance", "error", { error: dbError });
      return jsonResponse({ ok: false, message: "Erro ao salvar instância no banco.", statusCode: 500 }, 500);
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
      auto_provisioned: autoProvisioned,
    });

    console.log(`[api-whatsapp-instances] Done: ${instancia.id} (webhooks: ${webhookOk}, autoProvisioned: ${autoProvisioned})`);

    return jsonResponse({
      ok: true,
      success: true,
      instanceId: instancia.id,
      instancia,
      qrCodeBase64: qrData?.value || qrData || null,
      status: hasRemoteCredentials ? "connecting" : "disconnected",
      webhook_configured: webhookOk,
      ...(webhookOk ? {} : { warning: "Webhooks pendentes — mensagens podem não ser recebidas." }),
      ...(!autoProvisioned ? { warning_create: "Criação automática na Z-API não disponível com Client API. Instância salva como pendente." } : {}),
    });
  } catch (error: unknown) {
    console.error("[api-whatsapp-instances] Unhandled:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ ok: false, message: `Erro interno: ${msg}`, statusCode: 500 }, 500);
  }
});
