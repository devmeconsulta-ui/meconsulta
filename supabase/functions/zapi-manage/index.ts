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

async function getZapiConfig(serviceClient: any) {
  const { data, error } = await serviceClient
    .from("platform_integrations")
    .select("config, enabled")
    .eq("provider", "zapi")
    .single();

  if (error || !data) throw new Error("Configuração Z-API não encontrada no banco.");
  if (!data.enabled) throw new Error("Integração Z-API está desabilitada.");

  const cfg = data.config as Record<string, string>;
  const baseUrl = cfg.base_url || "https://api.z-api.io";
  const globalToken = cfg.global_token;
  const partnerToken = cfg.partner_token;

  if (!globalToken) throw new Error("global_token (Client-Token) não configurado.");

  return { baseUrl, globalToken, partnerToken };
}

function buildHeaders(globalToken: string, partnerToken?: string, withPartner = false) {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "Client-Token": globalToken,
  };
  if (withPartner && partnerToken) {
    h["Authorization"] = `Bearer ${partnerToken}`;
  }
  return h;
}

async function fetchZapi(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
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
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body.action;

    if (!action) return json({ ok: false, message: "action é obrigatório" }, 400);

    const { baseUrl, globalToken, partnerToken } = await getZapiConfig(serviceClient);

    // ─── test_connection ───
    if (action === "test_connection") {
      const resp = await fetchZapi(`${baseUrl}/instances`, {
        method: "GET",
        headers: buildHeaders(globalToken, partnerToken, true),
      });
      const data = await resp.json().catch(() => ({}));
      return json({ ok: resp.ok, status: resp.status, data });
    }

    // ─── create_instance ───
    if (action === "create_instance") {
      const { clinica_id, display_name } = body;
      if (!clinica_id || !display_name) return json({ ok: false, message: "clinica_id e display_name obrigatórios" }, 400);

      console.log(`[zapi-manage] Creating instance: ${display_name} for clinic: ${clinica_id}`);

      const createResp = await fetchZapi(`${baseUrl}/instances/integrator/on-demand`, {
        method: "POST",
        headers: buildHeaders(globalToken, partnerToken, true),
        body: JSON.stringify({ name: display_name }),
      }, 3, 1500);

      const payload = await createResp.json().catch(() => ({}));
      console.log("[zapi-manage] Create response:", JSON.stringify(payload), "HTTP:", createResp.status);

      if (!createResp.ok) {
        return json({ ok: false, message: `Z-API retornou erro: ${payload?.error || payload?.message || createResp.status}`, details: payload }, 502);
      }

      // Extract credentials from various response shapes
      const inst = payload?.data ?? payload?.instance ?? payload;
      const externalId = inst?.id || inst?.instanceId;
      const externalToken = inst?.token;

      if (!externalId || !externalToken) {
        return json({ ok: false, message: "Resposta da Z-API sem credenciais (id/token)", details: payload }, 502);
      }

      // Save to managed_instances
      const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=zapi&instance_id=PLACEHOLDER`;

      const { data: managed, error: dbErr } = await serviceClient
        .from("managed_instances")
        .insert({
          clinica_id,
          display_name,
          external_instance_id: String(externalId),
          external_token: externalToken,
          provider: "zapi",
          status: "disconnected",
        })
        .select()
        .single();

      if (dbErr) {
        console.error("[zapi-manage] DB error:", dbErr);
        return json({ ok: false, message: "Instância criada na Z-API mas erro ao salvar no banco", details: dbErr }, 500);
      }

      // Update webhook URL with actual managed ID
      const realWebhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=zapi&instance_id=${managed.id}`;
      await serviceClient.from("managed_instances").update({ webhook_configured: false }).eq("id", managed.id);

      // Auto setup webhooks
      try {
        const whResp = await fetchZapi(
          `${baseUrl}/instances/${externalId}/token/${externalToken}/update-every-webhooks`,
          {
            method: "PUT",
            headers: buildHeaders(globalToken),
            body: JSON.stringify({ value: realWebhookUrl, notifySentByMe: true }),
          },
          3, 1000,
        );
        const whData = await whResp.json().catch(() => ({}));
        if (whResp.ok && whData.value === true) {
          await serviceClient.from("managed_instances").update({ webhook_configured: true }).eq("id", managed.id);
          console.log("[zapi-manage] Webhooks configured");
        } else {
          console.warn("[zapi-manage] Webhook setup returned:", whData);
        }
      } catch (e) {
        console.warn("[zapi-manage] Webhook setup failed (non-blocking):", e);
      }

      return json({ ok: true, managed_instance: managed });
    }

    // ─── get_qr_code ───
    if (action === "get_qr_code") {
      const { managed_instance_id } = body;
      if (!managed_instance_id) return json({ ok: false, message: "managed_instance_id obrigatório" }, 400);

      const { data: mi } = await serviceClient.from("managed_instances").select("*").eq("id", managed_instance_id).single();
      if (!mi) return json({ ok: false, message: "Instância não encontrada" }, 404);

      const resp = await fetchZapi(
        `${baseUrl}/instances/${mi.external_instance_id}/token/${mi.external_token}/qr-code/image`,
        { method: "GET", headers: buildHeaders(globalToken) },
        3, 2000,
      );
      const data = await resp.json().catch(() => ({}));

      return json({ ok: resp.ok, qrcode: data?.value || data });
    }

    // ─── get_status ───
    if (action === "get_status") {
      const { managed_instance_id } = body;
      if (!managed_instance_id) return json({ ok: false, message: "managed_instance_id obrigatório" }, 400);

      const { data: mi } = await serviceClient.from("managed_instances").select("*").eq("id", managed_instance_id).single();
      if (!mi) return json({ ok: false, message: "Instância não encontrada" }, 404);

      const resp = await fetchZapi(
        `${baseUrl}/instances/${mi.external_instance_id}/token/${mi.external_token}/status`,
        { method: "GET", headers: buildHeaders(globalToken) },
      );
      const data = await resp.json().catch(() => ({}));

      const connected = data?.connected === true;
      const phoneNumber = data?.smartphoneConnected || data?.phoneConnected || data?.phone || null;

      // Update local status
      const newStatus = connected ? "online" : "disconnected";
      await serviceClient.from("managed_instances").update({
        status: newStatus,
        phone_number: phoneNumber,
        last_health_check: new Date().toISOString(),
        last_error: connected ? null : (data?.error || null),
      }).eq("id", managed_instance_id);

      return json({ ok: true, connected, status: newStatus, phone_number: phoneNumber, raw: data });
    }

    // ─── setup_webhooks ───
    if (action === "setup_webhooks") {
      const { managed_instance_id } = body;
      if (!managed_instance_id) return json({ ok: false, message: "managed_instance_id obrigatório" }, 400);

      const { data: mi } = await serviceClient.from("managed_instances").select("*").eq("id", managed_instance_id).single();
      if (!mi) return json({ ok: false, message: "Instância não encontrada" }, 404);

      const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=zapi&instance_id=${managed_instance_id}`;

      const resp = await fetchZapi(
        `${baseUrl}/instances/${mi.external_instance_id}/token/${mi.external_token}/update-every-webhooks`,
        {
          method: "PUT",
          headers: buildHeaders(globalToken),
          body: JSON.stringify({ value: webhookUrl, notifySentByMe: true }),
        },
        3, 1000,
      );
      const data = await resp.json().catch(() => ({}));
      const ok = resp.ok && data.value === true;

      await serviceClient.from("managed_instances").update({ webhook_configured: ok }).eq("id", managed_instance_id);

      return json({ ok, webhook_url: webhookUrl, response: data });
    }

    // ─── restart_instance ───
    if (action === "restart_instance") {
      const { managed_instance_id } = body;
      if (!managed_instance_id) return json({ ok: false, message: "managed_instance_id obrigatório" }, 400);

      const { data: mi } = await serviceClient.from("managed_instances").select("*").eq("id", managed_instance_id).single();
      if (!mi) return json({ ok: false, message: "Instância não encontrada" }, 404);

      const resp = await fetchZapi(
        `${baseUrl}/instances/${mi.external_instance_id}/token/${mi.external_token}/restart`,
        { method: "GET", headers: buildHeaders(globalToken) },
      );
      const data = await resp.json().catch(() => ({}));

      return json({ ok: resp.ok, data });
    }

    // ─── delete_instance ───
    if (action === "delete_instance") {
      const { managed_instance_id } = body;
      if (!managed_instance_id) return json({ ok: false, message: "managed_instance_id obrigatório" }, 400);

      const { data: mi } = await serviceClient.from("managed_instances").select("*").eq("id", managed_instance_id).single();
      if (!mi) return json({ ok: false, message: "Instância não encontrada" }, 404);

      const resp = await fetchZapi(
        `${baseUrl}/instances/${mi.external_instance_id}/token/${mi.external_token}/delete`,
        { method: "DELETE", headers: buildHeaders(globalToken) },
      );
      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        await serviceClient.from("managed_instances").update({ status: "deleted" }).eq("id", managed_instance_id);
      }

      return json({ ok: resp.ok, data });
    }

    return json({ ok: false, message: `Ação desconhecida: ${action}` }, 400);
  } catch (err: unknown) {
    console.error("[zapi-manage] Error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return json({ ok: false, message: msg }, 500);
  }
});
