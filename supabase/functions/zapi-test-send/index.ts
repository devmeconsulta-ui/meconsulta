import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_BASE = "https://api.z-api.io";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: string) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  return phone;
}

async function parseResponse(resp: Response) {
  const text = await resp.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function fetchEvolutionInstance(baseUrl: string, apiKey: string, instanceName: string) {
  const resp = await fetch(`${baseUrl}/instance/fetchInstances`, {
    method: "GET",
    headers: { "Content-Type": "application/json", apikey: apiKey },
  });
  const data = await parseResponse(resp);
  const arr = Array.isArray(data) ? data : ((data as { instances?: unknown[] } | null)?.instances || []);
  return (arr as Record<string, unknown>[]).find((item) => {
    const instance = item.instance as Record<string, unknown> | undefined;
    return String(item.name || instance?.instanceName || "") === instanceName;
  }) || null;
}

async function isEvolutionConnected(baseUrl: string, apiKey: string, instanceName: string) {
  try {
    const statusResp = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", apikey: apiKey },
    });
    const statusData = await parseResponse(statusResp) as Record<string, unknown> | null;
    const instance = statusData?.instance as Record<string, unknown> | undefined;
    const state = String(instance?.state || statusData?.state || "").toLowerCase();
    if (state === "open" || state === "connected") return true;
  } catch (error) {
    console.warn("[zapi-test-send] connectionState falhou:", error);
  }

  const listed = await fetchEvolutionInstance(baseUrl, apiKey, instanceName);
  const listedInstance = listed?.instance as Record<string, unknown> | undefined;
  const listedState = String(listed?.connectionStatus || listedInstance?.state || "").toLowerCase();
  return listedState === "open" || listedState === "connected";
}

async function sendEvolutionText(baseUrl: string, apiKey: string, instanceName: string, phone: string, message: string) {
  const endpoint = `${baseUrl}/message/sendText/${instanceName}`;
  const headers = { "Content-Type": "application/json", apikey: apiKey };

  const first = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ number: phone, text: message }),
  });
  const firstData = await parseResponse(first);
  if (first.ok) return { ok: true, data: firstData };

  const fallback = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ number: phone, textMessage: { text: message } }),
  });
  const fallbackData = await parseResponse(fallback);
  return { ok: fallback.ok, data: fallback.ok ? fallbackData : { first: firstData, fallback: fallbackData } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const EVOLUTION_API_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { instancia_id, telefone } = await req.json();

    if (!instancia_id || !telefone) {
      return json({ error: "instancia_id e telefone são obrigatórios" }, 400);
    }

    // Fetch instance
    const { data: instancia, error: instErr } = await supabase
      .from("omni_instancias")
      .select("*")
      .eq("id", instancia_id)
      .single();

    if (instErr || !instancia) {
      return json({ error: "Instância não encontrada" }, 404);
    }

    // Normalize phone
    const phone = normalizePhone(telefone);

    const message = "✅ Integração MeConsulta + WhatsApp ativa";
    let success = false;
    let errorMsg: string | null = null;
    let responseData: any = null;

    if (instancia.provider === "zapi") {
      if (instancia.status !== "connected") {
        errorMsg = "Instância não está conectada";
      } else
      if (!ZAPI_CLIENT_TOKEN || !instancia.zapi_instance_id || !instancia.zapi_token) {
        errorMsg = "Credenciais Z-API ausentes";
      } else {
        const endpoint = `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/send-text`;
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Client-Token": ZAPI_CLIENT_TOKEN,
          },
          body: JSON.stringify({ phone, message }),
        });
        responseData = await parseResponse(resp);
        success = resp.ok;
        if (!resp.ok) {
          errorMsg = JSON.stringify(responseData);
        }
      }
    } else if (instancia.provider === "evolution") {
      const instanceName = instancia.zapi_instance_id;
      const apiKey = EVOLUTION_API_KEY || instancia.zapi_token;
      if (!EVOLUTION_API_URL || !apiKey || !instanceName) {
        errorMsg = "Credenciais Evolution ausentes";
      } else {
        const connected = await isEvolutionConnected(EVOLUTION_API_URL, apiKey, instanceName);
        if (!connected) {
          errorMsg = "Instância não está conectada no Evolution";
        } else {
          await supabase.from("omni_instancias").update({ status: "connected" }).eq("id", instancia.id);
          await supabase.from("managed_instances").update({ status: "online", last_health_check: new Date().toISOString(), last_error: null }).eq("omni_instancia_id", instancia.id);

          const result = await sendEvolutionText(EVOLUTION_API_URL, apiKey, instanceName, phone, message);
          responseData = result.data;
          success = result.ok;
          if (!result.ok) errorMsg = JSON.stringify(responseData);
        }
      }
    } else {
      errorMsg = `Provider não suportado para teste: ${instancia.provider || "desconhecido"}`;
    }

    // Log the test
    await supabase.from("whatsapp_message_logs").insert({
      clinica_id: instancia.clinica_id,
      instancia_id: instancia.id,
      provider: instancia.provider || "zapi",
      to: phone,
      payload: { message, type: "test_send", response: responseData },
      success,
      error: errorMsg,
    });

    return json({ success, error: errorMsg, response: responseData });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return json({ error: msg }, 500);
  }
});
