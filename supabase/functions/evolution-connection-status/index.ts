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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { instancia_id } = await req.json();

    if (!instancia_id) {
      return new Response(
        JSON.stringify({ error: "instancia_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: instancia, error: fetchError } = await supabase
      .from("omni_instancias")
      .select("*")
      .eq("id", instancia_id)
      .single();

    if (fetchError || !instancia) {
      return new Response(
        JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch last_webhook_received_at and last_message_sent_at from DB
    const [lastWebhookRes, lastSentRes] = await Promise.all([
      supabase
        .from("whatsapp_logs")
        .select("created_at")
        .eq("instancia_id", instancia_id)
        .eq("acao", "webhook_received")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("omni_mensagens")
        .select("created_at")
        .eq("instancia_id", instancia_id)
        .eq("direcao", "saida")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const last_webhook_received_at = lastWebhookRes.data?.created_at || null;
    const last_message_sent_at = lastSentRes.data?.created_at || null;

    // If no Z-API credentials, return cached status
    if (!ZAPI_CLIENT_TOKEN || !instancia.zapi_instance_id || !instancia.zapi_token) {
      return new Response(
        JSON.stringify({
          success: true,
          provider: instancia.provider || "zapi",
          instance_id: instancia.id,
          status: instancia.status,
          numero_whatsapp: instancia.numero_whatsapp,
          qr_available: false,
          webhooks_configured: instancia.webhooks_configured ?? false,
          last_webhook_received_at,
          last_message_sent_at,
          from_cache: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query Z-API for real status
    try {
      const statusResponse = await fetchWithRetry(
        `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/status`,
        { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN } },
        3, 800
      );
      const statusData = await statusResponse.json();

      let dbStatus: string = "disconnected";
      const connected = statusData.connected || statusData.status === "connected" || statusData.status === "CONNECTED";
      if (connected) dbStatus = "connected";
      else if (statusData.status === "connecting") dbStatus = "connecting";

      let phoneNumber = instancia.numero_whatsapp;
      if (dbStatus === "connected" && statusData.phone) {
        phoneNumber = statusData.phone.replace(/\D/g, "");
      }

      // Check if QR code is available (only when not connected)
      let qrAvailable = false;
      if (dbStatus !== "connected") {
        try {
          const qrResp = await fetchWithRetry(
            `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/qr-code`,
            { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN } },
            1, 500
          );
          const qrData = await qrResp.json();
          qrAvailable = !!(qrData?.value || qrData?.base64);
        } catch {
          // QR check is non-blocking
        }
      }

      // Update DB if status changed
      const wasDisconnected = instancia.status !== "connected";
      if (dbStatus !== instancia.status || phoneNumber !== instancia.numero_whatsapp) {
        await supabase
          .from("omni_instancias")
          .update({ status: dbStatus, numero_whatsapp: phoneNumber })
          .eq("id", instancia_id);
      }

      // Auto-trigger history import when transitioning to connected (12h cooldown)
      if (dbStatus === "connected" && wasDisconnected) {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const lastImport = instancia.last_history_import_at;
        if (!lastImport || lastImport < twelveHoursAgo) {
          try {
            const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
            if (SUPABASE_ANON_KEY) {
              await supabase
                .from("omni_instancias")
                .update({ last_history_import_at: new Date().toISOString() })
                .eq("id", instancia_id);

              fetch(`${SUPABASE_URL}/functions/v1/zapi-sync-history`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ instancia_id, action: "start", days_back: 30 }),
              }).catch(err => console.warn("[Health] Sync trigger error:", err));
              console.log(`[Health] Triggered history import for ${instancia_id}`);
            }
          } catch (syncErr) {
            console.warn("[Health] Sync trigger error:", syncErr);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          provider: instancia.provider || "zapi",
          instance_id: instancia.id,
          status: dbStatus,
          numero_whatsapp: phoneNumber,
          qr_available: qrAvailable,
          webhooks_configured: instancia.webhooks_configured ?? false,
          last_webhook_received_at,
          last_message_sent_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      // Z-API unreachable — return cached + error status
      return new Response(
        JSON.stringify({
          success: true,
          provider: instancia.provider || "zapi",
          instance_id: instancia.id,
          status: "error",
          numero_whatsapp: instancia.numero_whatsapp,
          qr_available: false,
          webhooks_configured: instancia.webhooks_configured ?? false,
          last_webhook_received_at,
          last_message_sent_at,
          from_cache: true,
          error: "Z-API indisponível",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Error in health check:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
