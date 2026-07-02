// Evolution API v2 orchestrator
// Mantém o nome "zapi-manage" e o contrato (actions/respostas) por compatibilidade com o frontend.
// Internamente usa Evolution API. Campos legados (zapi_instance_id, zapi_token) armazenam
// agora o instanceName e a apikey da Evolution, respectivamente. provider passa a ser "evolution".
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

const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

function evoHeaders(apikey?: string) {
  return { "Content-Type": "application/json", apikey: apikey || EVO_KEY };
}

async function evoFetch(path: string, init: RequestInit, retries = 3, delay = 800): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${EVO_URL}${path}`, init);
      return r;
    } catch (e) {
      lastErr = e;
      console.warn(`[zapi-manage] evoFetch attempt ${i + 1}/${retries} failed:`, e);
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("evoFetch failed");
}

const WEBHOOK_EVENTS = [
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "CONNECTION_UPDATE",
  "CONTACTS_UPSERT",
  "QRCODE_UPDATED",
];

async function setWebhook(instanceName: string, apikey: string, webhookUrl: string): Promise<boolean> {
  try {
    const r = await evoFetch(`/webhook/set/${instanceName}`, {
      method: "POST",
      headers: evoHeaders(apikey),
      body: JSON.stringify({
        webhook: {
          url: webhookUrl,
          enabled: true,
          webhookByEvents: false,
          webhookBase64: true,
          events: WEBHOOK_EVENTS,
        },
      }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn("[zapi-manage] setWebhook non-OK", r.status, txt.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[zapi-manage] setWebhook error:", e);
    return false;
  }
}

function safeName(input: string, suffix: string) {
  const base = String(input || "wa").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "wa";
  return `${base}-${suffix.slice(0, 8)}`;
}

type EvolutionInstance = Record<string, unknown> & {
  instance?: Record<string, unknown>;
  name?: string;
  connectionStatus?: string;
  ownerJid?: string;
  profileName?: string;
  token?: string;
};

function getEvolutionInstanceName(item: EvolutionInstance): string {
  return String(item?.name || item?.instance?.instanceName || "");
}

function getEvolutionStatus(item: EvolutionInstance): string {
  return String(item?.connectionStatus || item?.instance?.state || "").toLowerCase();
}

function getEvolutionPhone(item: EvolutionInstance): string | null {
  const user = item?.instance?.user as Record<string, unknown> | undefined;
  const raw = item?.ownerJid || item?.instance?.owner || item?.instance?.wuid || item?.instance?.number || user?.id || null;
  return raw ? String(raw).replace(/@.*/, "").replace(/\D/g, "") : null;
}

async function findEvolutionInstance(instanceName: string): Promise<EvolutionInstance | null> {
  const r = await evoFetch(`/instance/fetchInstances`, { method: "GET", headers: evoHeaders() });
  const data = await r.json().catch(() => []);
  const arr = Array.isArray(data) ? data : (data?.instances || []);
  return (arr as EvolutionInstance[]).find((item) => getEvolutionInstanceName(item) === instanceName) || null;
}

// Executa ações pós-conexão: garante webhook configurado e vincula filas órfãs
// (mesma clínica, ativas e sem instancia_id) a esta instância.
async function onInstanceConnected(
  svc: ReturnType<typeof createClient>,
  supabaseUrl: string,
  inst: Record<string, unknown>,
): Promise<{ webhook_configured: boolean; linked_filas: number }> {
  const instId = String(inst.id);
  const clinicaId = inst.clinica_id ? String(inst.clinica_id) : null;
  const evoName = inst.zapi_instance_id ? String(inst.zapi_instance_id) : null;
  const apikey = (inst.zapi_token as string) || EVO_KEY;
  const webhookUrl = `${supabaseUrl}/functions/v1/webhook-receiver?provider=evolution&instance_id=${instId}`;

  // 1) Garante webhook configurado no Evolution
  let webhookOk = Boolean(inst.webhooks_configured);
  const currentUrl = String(inst.webhook_url || "");
  if (evoName && (!webhookOk || currentUrl !== webhookUrl)) {
    webhookOk = await setWebhook(evoName, apikey, webhookUrl);
    await svc.from("omni_instancias").update({
      webhook_url: webhookUrl,
      webhooks_configured: webhookOk,
      webhooks_configured_at: webhookOk ? new Date().toISOString() : null,
    }).eq("id", instId);
    await svc.from("managed_instances").update({ webhook_configured: webhookOk }).eq("omni_instancia_id", instId);
  }

  // 2) Vincula filas ativas da mesma clínica que estão sem instância
  let linked = 0;
  if (clinicaId) {
    const { data: filas } = await svc
      .from("omni_filas")
      .select("id")
      .eq("clinica_id", clinicaId)
      .is("instancia_id", null)
      .eq("ativo", true);
    const ids = (filas || []).map((f: { id: string }) => f.id);
    if (ids.length) {
      const { error: upErr } = await svc.from("omni_filas").update({ instancia_id: instId }).in("id", ids);
      if (!upErr) linked = ids.length;
      else console.warn("[zapi-manage] falha ao vincular filas:", upErr);
    }
  }

  return { webhook_configured: webhookOk, linked_filas: linked };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Use POST" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!EVO_URL || !EVO_KEY) {
      return json({ ok: false, message: "EVOLUTION_API_URL/EVOLUTION_API_KEY não configurados" }, 200);
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body.action;
    if (!action) return json({ ok: false, message: "action é obrigatório" }, 400);

    // ─── test_connection ───
    if (action === "test_connection") {
      const r = await evoFetch(`/instance/fetchInstances`, { method: "GET", headers: evoHeaders() });
      const data = await r.json().catch(() => ({}));
      return json({ ok: r.ok, status: r.status, data });
    }

    // ─── create_instance ───
    if (action === "create_instance") {
      const { clinica_id, display_name, force } = body;
      if (!clinica_id || !display_name) {
        return json({ ok: false, message: "clinica_id e display_name obrigatórios" }, 400);
      }

      const instanceName = safeName(display_name, clinica_id);
      console.log(`[zapi-manage] create_instance: ${instanceName} (clinic: ${clinica_id})`);

      // ─── Validação: já existe instância desta clínica no Evolution? ───
      if (!force) {
        try {
          const clinicSuffix = clinica_id.slice(0, 8).toLowerCase();
          const listResp = await evoFetch(`/instance/fetchInstances`, { method: "GET", headers: evoHeaders() });
          const listData = await listResp.json().catch(() => []);
          const arr = Array.isArray(listData) ? listData : (listData?.instances || []);

          const existing = arr.filter((i: Record<string, unknown>) => {
            const n = String(i?.name || (i as { instance?: { instanceName?: string } })?.instance?.instanceName || "").toLowerCase();
            return n.includes(clinicSuffix);
          });

          const openOrConnecting = existing.find((i: Record<string, unknown>) => {
            const s = String(i?.connectionStatus || (i as { instance?: { state?: string } })?.instance?.state || "").toLowerCase();
            return s === "open" || s === "connected" || s === "connecting";
          });

          if (openOrConnecting) {
            const st = String(openOrConnecting?.connectionStatus || "").toLowerCase();
            const isOpen = st === "open" || st === "connected";
            const evName = String(openOrConnecting?.name || "");
            const profileName = openOrConnecting?.profileName as string | undefined;
            const ownerJid = openOrConnecting?.ownerJid as string | undefined;
            const phone = ownerJid ? String(ownerJid).replace(/@.*/, "").replace(/\D/g, "") : null;

            // Check whether it is already adopted locally
            const { data: local } = await svc
              .from("omni_instancias")
              .select("id, nome")
              .eq("clinica_id", clinica_id)
              .eq("zapi_instance_id", evName)
              .maybeSingle();

            return json({
              ok: false,
              duplicate: true,
              message: isOpen
                ? `Já existe uma instância conectada para esta clínica${profileName ? ` (${profileName})` : ""}${phone ? ` – número ${phone}` : ""}. Use essa em vez de criar uma nova.`
                : `Já existe uma instância em pareamento para esta clínica. Aguarde escanear o QR ou exclua a atual antes de criar outra.`,
              existing: {
                evolution_instance_name: evName,
                connection_status: st,
                profile_name: profileName || null,
                phone_number: phone,
                omni_instancia_id: local?.id || null,
                already_adopted: !!local,
              },
            }, 200);
          }
        } catch (e) {
          console.warn("[zapi-manage] duplicate check failed (non-blocking):", e);
        }
      }



      const createResp = await evoFetch(`/instance/create`, {
        method: "POST",
        headers: evoHeaders(),
        body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
      });
      const payload = await createResp.json().catch(() => ({}));
      console.log("[zapi-manage] create response HTTP:", createResp.status);

      if (!createResp.ok) {
        return json({
          ok: false,
          message: `Evolution retornou erro ${createResp.status}: ${payload?.message || payload?.error || "Unknown"}`,
          details: payload,
        }, 200);
      }

      const instanceApiKey: string =
        payload?.hash?.apikey || payload?.hash || payload?.apikey || EVO_KEY;
      const externalId: string =
        payload?.instance?.instanceId || payload?.instance?.instanceName || instanceName;
      const qrCodeBase64: string | null = payload?.qrcode?.base64 || null;

      const placeholderWebhook = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=evolution&instance_id=PLACEHOLDER`;
      const { data: instancia, error: dbErr } = await svc
        .from("omni_instancias")
        .insert({
          clinica_id,
          nome: display_name,
          provider: "evolution",
          zapi_instance_id: instanceName,     // legacy column reused: stores Evolution instanceName
          zapi_token: instanceApiKey,         // legacy column reused: stores Evolution instance apikey
          status: "connecting",
          webhook_url: placeholderWebhook,
          servidor_url: EVO_URL,
          webhooks_configured: false,
          configuracoes: { evolution_response: payload },
        })
        .select()
        .single();

      if (dbErr) {
        console.error("[zapi-manage] DB insert error:", dbErr);
        return json({ ok: false, message: "Instância criada na Evolution mas erro ao salvar", details: dbErr }, 500);
      }

      // Mirror to managed_instances for webhook routing
      const { data: managed } = await svc
        .from("managed_instances")
        .insert({
          clinica_id,
          display_name,
          external_instance_id: String(externalId),
          external_token: instanceApiKey,
          provider: "evolution",
          status: "disconnected",
          omni_instancia_id: instancia.id,
          evolution_instance_name: instanceName,
          evolution_api_key: instanceApiKey,
        })
        .select()
        .single();

      // Configure webhook pointing to real instancia id
      const realWebhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=evolution&instance_id=${instancia.id}`;
      const webhookOk = await setWebhook(instanceName, instanceApiKey, realWebhookUrl);

      await svc.from("omni_instancias").update({
        webhook_url: realWebhookUrl,
        webhooks_configured: webhookOk,
        webhooks_configured_at: webhookOk ? new Date().toISOString() : null,
      }).eq("id", instancia.id);

      if (managed) {
        await svc.from("managed_instances").update({ webhook_configured: webhookOk }).eq("id", managed.id);
      }

      return json({
        ok: true,
        instancia,
        managed_instance: managed,
        qrCodeBase64,
        webhook_configured: webhookOk,
        ...(webhookOk ? {} : { warning: "Webhooks pendentes — configure manualmente se necessário." }),
      });
    }

    // ─── get_qr_code ───
    if (action === "get_qr_code") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).maybeSingle();
      if (!inst) return json({ ok: true, connected: false, status: "not_found", message: "Instância não encontrada" });
      const name = inst.zapi_instance_id;
      const apikey = inst.zapi_token || EVO_KEY;
      if (!name) return json({ ok: false, message: "Instância sem instanceName" }, 400);

      try {
        const existing = await findEvolutionInstance(name);
        const listedState = existing ? getEvolutionStatus(existing) : "";
        const alreadyConnected = listedState === "open" || listedState === "connected";
        if (alreadyConnected) {
          const phoneNumber = existing ? getEvolutionPhone(existing) : inst.numero_whatsapp || null;
          await svc.from("omni_instancias").update({
            status: "connected",
            numero_whatsapp: phoneNumber,
          }).eq("id", instancia_id);

          await svc.from("managed_instances").update({
            status: "online",
            phone_number: phoneNumber,
            last_health_check: new Date().toISOString(),
            last_error: null,
          }).eq("omni_instancia_id", instancia_id);

          const post = await onInstanceConnected(svc, SUPABASE_URL, { ...inst, status: "connected", numero_whatsapp: phoneNumber });

          return json({
            ok: true,
            connected: true,
            status: "connected",
            phone_number: phoneNumber,
            webhook_configured: post.webhook_configured,
            linked_filas: post.linked_filas,
            message: "Esta instância já está pareada no Evolution. Não é necessário escanear QR Code novamente.",
          });
        }
      } catch (e) {
        console.warn("[zapi-manage] fetchInstances pre-connect check failed:", e);
      }

      const r = await evoFetch(`/instance/connect/${name}`, { method: "GET", headers: evoHeaders(apikey) });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        return json({
          ok: false,
          message: `Falha ao obter QR Code (${r.status}): ${data?.message || data?.error || "Erro Evolution"}`,
          status_code: r.status,
          raw: data,
        }, 200);
      }

      // Evolution retorna `base64` = PNG do QR; `code` = string crua de pareamento (NÃO é imagem).
      // Usar apenas base64 para não quebrar a renderização da imagem no front.
      let qrcode: string | null = data?.base64 || data?.qrcode || null;
      if (qrcode && !qrcode.startsWith("data:")) {
        qrcode = `data:image/png;base64,${qrcode}`;
      }
      if (!qrcode) {
        return json({
          ok: false,
          message: "QR Code indisponível agora (instância pode já estar conectada). Tente novamente em alguns segundos.",
          raw: data,
        }, 200);
      }

      return json({ ok: true, qrcode, pairingCode: data?.pairingCode || data?.code || null, raw: data });
    }

    // ─── get_status ───
    if (action === "get_status") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).maybeSingle();
      if (!inst) return json({ ok: true, connected: false, status: "not_found", phone_number: null, message: "Instância não encontrada" });
      const name = inst.zapi_instance_id;
      const apikey = inst.zapi_token || EVO_KEY;
      if (!name) return json({ ok: false, message: "Instância sem instanceName" }, 400);

      const r = await evoFetch(`/instance/connectionState/${name}`, { method: "GET", headers: evoHeaders(apikey) });
      const data = await r.json().catch(() => ({}));

      let listed: EvolutionInstance | null = null;
      try {
        listed = await findEvolutionInstance(name);
      } catch (e) {
        console.warn("[zapi-manage] fetchInstances status fallback failed:", e);
      }

      if (!r.ok && !listed) {
        console.warn("[zapi-manage] connectionState non-OK:", r.status, data);
        return json({ ok: true, connected: false, status: "disconnected", phone_number: null, raw: data });
      }

      const connectionState = String(data?.instance?.state || data?.state || "").toLowerCase();
      const listedState = listed ? getEvolutionStatus(listed) : "";
      const state = listedState === "open" || listedState === "connected" ? listedState : connectionState;
      const connected = state === "open" || state === "connected";
      const newStatus = connected ? "connected" : (state === "connecting" ? "connecting" : "disconnected");

      // Try to fetch phone number when open
      let phoneNumber: string | null = null;
      if (connected) {
        phoneNumber = listed ? getEvolutionPhone(listed) : null;
        try {
          const f = await evoFetch(`/instance/fetchInstances?instanceName=${encodeURIComponent(name)}`, {
            method: "GET", headers: evoHeaders(apikey),
          });
          const fdata = await f.json().catch(() => ({}));
          const arr = Array.isArray(fdata) ? fdata : (fdata?.instances || []);
          const me = arr[0]?.instance || arr[0] || {};
          const wid = me?.owner || me?.wuid || me?.user?.id || me?.number || null;
          if (wid) phoneNumber = String(wid).replace(/@.*/, "").replace(/\D/g, "");
        } catch (e) {
          console.warn("[zapi-manage] fetchInstances error:", e);
        }
      }

      await svc.from("omni_instancias").update({
        status: newStatus,
        numero_whatsapp: phoneNumber,
      }).eq("id", instancia_id);

      await svc.from("managed_instances").update({
        status: connected ? "online" : "disconnected",
        phone_number: phoneNumber,
        last_health_check: new Date().toISOString(),
        last_error: connected ? null : (data?.message || null),
      }).eq("omni_instancia_id", instancia_id);

      let webhookConfigured: boolean | undefined;
      let linkedFilas: number | undefined;
      if (connected) {
        const post = await onInstanceConnected(svc, SUPABASE_URL, { ...inst, status: "connected", numero_whatsapp: phoneNumber });
        webhookConfigured = post.webhook_configured;
        linkedFilas = post.linked_filas;
      }

      return json({ ok: true, connected, status: newStatus, phone_number: phoneNumber, webhook_configured: webhookConfigured, linked_filas: linkedFilas, raw: data });
    }

    // ─── setup_webhooks ───
    if (action === "setup_webhooks") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst || !inst.zapi_instance_id) {
        return json({ ok: false, message: "Instância não encontrada ou sem instanceName" }, 404);
      }
      const apikey = inst.zapi_token || EVO_KEY;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-receiver?provider=evolution&instance_id=${instancia_id}`;

      const ok = await setWebhook(inst.zapi_instance_id, apikey, webhookUrl);

      await svc.from("omni_instancias").update({
        webhook_url: webhookUrl,
        webhooks_configured: ok,
        webhooks_configured_at: ok ? new Date().toISOString() : null,
      }).eq("id", instancia_id);

      await svc.from("managed_instances").update({ webhook_configured: ok }).eq("omni_instancia_id", instancia_id);

      return json({ ok, webhook_url: webhookUrl });
    }

    // ─── restart_instance ───
    if (action === "restart_instance") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst || !inst.zapi_instance_id) return json({ ok: false, message: "Instância não encontrada" }, 404);
      const apikey = inst.zapi_token || EVO_KEY;

      const r = await evoFetch(`/instance/restart/${inst.zapi_instance_id}`, { method: "POST", headers: evoHeaders(apikey) });
      const data = await r.json().catch(() => ({}));
      return json({ ok: r.ok, data });
    }

    // ─── disconnect_instance ───
    if (action === "disconnect_instance") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst || !inst.zapi_instance_id) return json({ ok: false, message: "Instância não encontrada" }, 404);
      const apikey = inst.zapi_token || EVO_KEY;

      const r = await evoFetch(`/instance/logout/${inst.zapi_instance_id}`, { method: "DELETE", headers: evoHeaders(apikey) });
      const data = await r.json().catch(() => ({}));

      await svc.from("omni_instancias").update({ status: "disconnected", numero_whatsapp: null }).eq("id", instancia_id);
      await svc.from("managed_instances").update({ status: "disconnected", phone_number: null }).eq("omni_instancia_id", instancia_id);

      return json({ ok: r.ok, data });
    }

    // ─── delete_instance ───
    if (action === "delete_instance") {
      const { instancia_id } = body;
      if (!instancia_id) return json({ ok: false, message: "instancia_id obrigatório" }, 400);

      const { data: inst } = await svc.from("omni_instancias").select("*").eq("id", instancia_id).single();
      if (!inst) return json({ ok: false, message: "Instância não encontrada" }, 404);

      if (inst.zapi_instance_id) {
        const apikey = inst.zapi_token || EVO_KEY;
        try {
          // try logout first then delete
          await evoFetch(`/instance/logout/${inst.zapi_instance_id}`, { method: "DELETE", headers: evoHeaders(apikey) });
        } catch (e) {
          console.warn("[zapi-manage] logout failed (non-blocking):", e);
        }
        try {
          await evoFetch(`/instance/delete/${inst.zapi_instance_id}`, { method: "DELETE", headers: evoHeaders(apikey) });
        } catch (e) {
          console.warn("[zapi-manage] delete failed (non-blocking):", e);
        }
      }

      await svc.from("managed_instances").delete().eq("omni_instancia_id", instancia_id);
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
