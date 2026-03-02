import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ZAPI_BASE = "https://api.z-api.io";

function getZapiCredentials() {
  const globalToken = Deno.env.get("ZAPI_CLIENT_TOKEN");
  const partnerToken = Deno.env.get("ZAPI_PARTNER_TOKEN");
  if (!globalToken) throw new Error("ZAPI_CLIENT_TOKEN não configurado nos secrets.");
  if (!partnerToken) throw new Error("ZAPI_PARTNER_TOKEN não configurado nos secrets.");
  return { globalToken, partnerToken };
}

function clientHeaders(globalToken: string) {
  return { "Content-Type": "application/json", "Client-Token": globalToken };
}

function integratorHeaders(globalToken: string, partnerToken: string) {
  return { "Content-Type": "application/json", "Client-Token": globalToken, "Authorization": `Bearer ${partnerToken}` };
}

async function fetchZapi(url: string, options: RequestInit, retries = 3, delay = 1500): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, options);
      return resp;
    } catch (err) {
      console.warn(`[zapi-manage] Fetch attempt ${i + 1}/${retries} failed:`, err);
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("All retry attempts failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Use POST" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body.action;
    if (!action) return json({ ok: false, message: "action é obrigatório" }, 400);

    const { globalToken, partnerToken } = getZapiCredentials();

    // ─── test_connection ───
    if (action === "test_connection") {
      const resp = await fetchZapi(`${ZAPI_BASE}/instances`, {
        method: "GET",
        headers: integratorHeaders(globalToken, partnerToken),
      });
      const data = await resp.json().catch(() => ({}));
      return json({ ok: resp.ok, status: resp.status, data });
    }

    // ─── create_instance ───
    if (action === "create_instance") {
      const { clinica_id, display_name } = body;
      if (!clinica_id || !display_name) return json({ ok: false, message: "clinica_id e display_name obrigatórios" }, 400);

      console.log(`[zapi-manage] Creating instance: ${display_name} for clinic: ${clinica_id}`);

      // 1. Create via Integrator API
      const createResp = await fetchZapi(`${ZAPI_BASE}/instances/integrator/on-demand`, {
        method: "POST",
        headers: integratorHeaders(globalToken, partnerToken),
        body: JSON.stringify({ name: display_name }),
      });
      const payload = await createResp.json().catch(() => ({}));
      console.log("[zapi-manage] Create response:", JSON.stringify(payload), "HTTP:", createResp.status);

      if (!createResp.ok) {
        return json({ ok: false, message: `Z-API retornou erro ${createResp.status}: ${payload?.error || payload?.message || "Unknown"}`, details: payload }, 502);
      }

      const inst = payload?.data ?? payload?.instance ?? payload;
      const externalId = inst?.id || inst?.instanceId;
      const externalToken = inst?.token;

      if (!externalId || !externalToken) {
        return json({ ok: false, message: "Resposta da Z-API sem credenciais (id/token)", details: payload }, 502);
      }

      // 2. Save to omni_instancias
      const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=zapi&instance_id=PLACEHOLDER`;

      const { data: instancia, error: dbErr } = await svc
        .from("omni_instancias")
        .insert({
          clinica_id,
          nome: display_name,
          provider: "zapi",
          zapi_instance_id: String(externalId),
          zapi_token: externalToken,
          status: "connecting",
          webhook_url: webhookUrl,
          servidor_url: ZAPI_BASE,
          webhooks_configured: false,
          configuracoes: { zapi_response: payload },
        })
        .select()
        .single();

      if (dbErr) {
        console.error("[zapi-manage] DB error:", dbErr);
        return json({ ok: false, message: "Instância criada na Z-API mas erro ao salvar no banco", details: dbErr }, 500);
      }

      // 3. Also save to managed_instances for internal tracking
      const { data: managed } = await svc
        .from("managed_instances")
        .insert({
          clinica_id,
          display_name,
          external_instance_id: String(externalId),
          external_token: externalToken,
          provider: "zapi",
          status: "disconnected",
          omni_instancia_id: instancia.id,
        })
        .select()
        .single();

      // 4. Setup webhooks with real ID
      const realWebhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=zapi&instance_id=${instancia.id}`;
      let webhookOk = false;

      try {
        const whResp = await fetchZapi(
          `${ZAPI_BASE}/instances/${externalId}/token/${externalToken}/update-every-webhooks`,
          {
            method: "PUT",
            headers: clientHeaders(globalToken),
            body: JSON.stringify({ value: realWebhookUrl, notifySentByMe: true }),
          },
        );
        const whData = await whResp.json().catch(() => ({}));
        webhookOk = whResp.ok && whData.value === true;
        console.log("[zapi-manage] Webhooks:", webhookOk, whData);
      } catch (e) {
        console.warn("[zapi-manage] Webhook setup failed (non-blocking):", e);
      }

      // Update webhook status
      await svc.from("omni_instancias").update({
        webhook_url: realWebhookUrl,
        webhooks_configured: webhookOk,
        webhooks_configured_at: webhookOk ? new Date().toISOString() : null,
      }).eq("id", instancia.id);

      if (managed) {
        await svc.from("managed_instances").update({ webhook_configured: webhookOk }).eq("id", managed.id);
      }

      // 5. Get QR Code
      let qrData: any = null;
      try {
        await new Promise(r => setTimeout(r, 2000));
        const qrResp = await fetchZapi(
          `${ZAPI_BASE}/instances/${externalId}/token/${externalToken}/qr-code/image`,
          { method: "GET", headers: clientHeaders(globalToken) },
        );
        qrData = await qrResp.json().catch(() => ({}));
        console.log("[zapi-manage] QR code HTTP:", qrResp.status);
      } catch (err) {
        console.warn("[zapi-manage] QR fetch (non-blocking):", err);
      }

      return json({
        ok: true,
        instancia,
        managed_instance: managed,
        qrCodeBase64: qrData?.value || qrData || null,
        webhook_configured: webhookOk,
        ...(webhookOk ? {} : { warning: "Webhooks pendentes — configure manualmente se necessário." }),
      });
    }

    // ─── get_qr_code ───
    if (action === "get_qr_code") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst) return json({ ok: false, message: "Instância não encontrada" }, 404);
      if (!inst.zapi_instance_id || !inst.zapi_token) return json({ ok: false, message: "Instância sem credenciais Z-API" }, 400);

      const resp = await fetchZapi(
        `${ZAPI_BASE}/instances/${inst.zapi_instance_id}/token/${inst.zapi_token}/qr-code/image`,
        { method: "GET", headers: clientHeaders(globalToken) },
        3, 2000,
      );
      const data = await resp.json().catch(() => ({}));
      const qrCode =
        (typeof data?.value === "string" && data.value) ||
        (typeof data?.base64 === "string" && data.base64) ||
        (typeof data?.qrcode === "string" && data.qrcode) ||
        (typeof data?.qrCode === "string" && data.qrCode) ||
        (typeof data === "string" ? data : null);

      if (!resp.ok) {
        return json({ ok: false, message: "Falha ao obter QR Code na Z-API", status_code: resp.status, raw: data }, 502);
      }

      if (!qrCode) {
        return json({ ok: false, message: "QR Code não disponível agora (instância pode já estar conectada)" }, 409);
      }

      return json({ ok: true, qrcode: qrCode });
    }

    // ─── get_status ───
    if (action === "get_status") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst) return json({ ok: false, message: "Instância não encontrada" }, 404);
      if (!inst.zapi_instance_id || !inst.zapi_token) return json({ ok: false, message: "Instância sem credenciais Z-API" }, 400);

      const resp = await fetchZapi(
        `${ZAPI_BASE}/instances/${inst.zapi_instance_id}/token/${inst.zapi_token}/status`,
        { method: "GET", headers: clientHeaders(globalToken) },
      );
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        return json({ ok: false, message: "Falha ao consultar status na Z-API", status_code: resp.status, raw: data }, 502);
      }

      const rawStatus = String(data?.status || "").toLowerCase();
      const connected =
        data?.connected === true ||
        rawStatus === "connected" ||
        rawStatus === "open";
      const phoneNumber = data?.smartphoneConnected || data?.phoneConnected || data?.phone || null;
      const newStatus = connected ? "connected" : "disconnected";

      // Update omni_instancias
      await svc.from("omni_instancias").update({
        status: newStatus,
        numero_whatsapp: phoneNumber,
      }).eq("id", instancia_id);

      // Update managed_instances if exists
      await svc.from("managed_instances").update({
        status: connected ? "online" : "disconnected",
        phone_number: phoneNumber,
        last_health_check: new Date().toISOString(),
        last_error: connected ? null : (data?.error || null),
      }).eq("omni_instancia_id", instancia_id);

      return json({ ok: true, connected, status: newStatus, phone_number: phoneNumber, raw: data });
    }

    // ─── setup_webhooks ───
    if (action === "setup_webhooks") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst || !inst.zapi_instance_id || !inst.zapi_token) return json({ ok: false, message: "Instância não encontrada ou sem credenciais" }, 404);

      const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=zapi&instance_id=${instancia_id}`;

      const resp = await fetchZapi(
        `${ZAPI_BASE}/instances/${inst.zapi_instance_id}/token/${inst.zapi_token}/update-every-webhooks`,
        {
          method: "PUT",
          headers: clientHeaders(globalToken),
          body: JSON.stringify({ value: webhookUrl, notifySentByMe: true }),
        },
      );
      const data = await resp.json().catch(() => ({}));
      const ok = resp.ok && data.value === true;

      await svc.from("omni_instancias").update({
        webhook_url: webhookUrl,
        webhooks_configured: ok,
        webhooks_configured_at: ok ? new Date().toISOString() : null,
      }).eq("id", instancia_id);

      return json({ ok, webhook_url: webhookUrl, response: data });
    }

    // ─── restart_instance ───
    if (action === "restart_instance") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst || !inst.zapi_instance_id || !inst.zapi_token) return json({ ok: false, message: "Instância não encontrada" }, 404);

      const resp = await fetchZapi(
        `${ZAPI_BASE}/instances/${inst.zapi_instance_id}/token/${inst.zapi_token}/restart`,
        { method: "GET", headers: clientHeaders(globalToken) },
      );
      const data = await resp.json().catch(() => ({}));
      return json({ ok: resp.ok, data });
    }

    // ─── disconnect_instance ───
    if (action === "disconnect_instance") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst || !inst.zapi_instance_id || !inst.zapi_token) return json({ ok: false, message: "Instância não encontrada" }, 404);

      const resp = await fetchZapi(
        `${ZAPI_BASE}/instances/${inst.zapi_instance_id}/token/${inst.zapi_token}/disconnect`,
        { method: "GET", headers: clientHeaders(globalToken) },
      );
      const data = await resp.json().catch(() => ({}));

      await svc.from("omni_instancias").update({ status: "disconnected", numero_whatsapp: null }).eq("id", instancia_id);
      await svc.from("managed_instances").update({ status: "disconnected", phone_number: null }).eq("omni_instancia_id", instancia_id);

      return json({ ok: resp.ok, data });
    }

    // ─── delete_instance ───
    if (action === "delete_instance") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst) return json({ ok: false, message: "Instância não encontrada" }, 404);

      // Delete from Z-API if credentials exist
      if (inst.zapi_instance_id && inst.zapi_token) {
        try {
          await fetchZapi(
            `${ZAPI_BASE}/instances/${inst.zapi_instance_id}/token/${inst.zapi_token}/delete`,
            { method: "DELETE", headers: clientHeaders(globalToken) },
          );
        } catch (e) {
          console.warn("[zapi-manage] Z-API delete failed (non-blocking):", e);
        }
      }

      // Delete from managed_instances
      await svc.from("managed_instances").delete().eq("omni_instancia_id", instancia_id);
      // Delete from omni_instancias
      await svc.from("omni_instancias").delete().eq("id", instancia_id);

      return json({ ok: true });
    }

    return json({ ok: false, message: `Ação desconhecida: ${action}` }, 400);
  } catch (err: unknown) {
    console.error("[zapi-manage] Error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return json({ ok: false, message: msg }, 500);
  }
});
