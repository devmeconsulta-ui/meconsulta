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

    // ===== Z-API PROVIDER =====
    if (instancia.provider === "zapi") {
      const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
      if (!ZAPI_CLIENT_TOKEN || !instancia.zapi_instance_id || !instancia.zapi_token) {
        return new Response(
          JSON.stringify({ success: true, status: instancia.status, numero_whatsapp: instancia.numero_whatsapp, from_cache: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const statusResponse = await fetchWithRetry(
          `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/status`,
          { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN } },
          3, 800
        );
        const statusData = await statusResponse.json();
        
        let dbStatus = "disconnected";
        const connected = statusData.connected || statusData.status === "connected" || statusData.status === "CONNECTED";
        if (connected) dbStatus = "connected";
        else if (statusData.status === "connecting") dbStatus = "connecting";

        // Get phone number if connected
        let phoneNumber = instancia.numero_whatsapp;
        if (dbStatus === "connected" && statusData.phone) {
          phoneNumber = statusData.phone.replace(/\D/g, "");
        }

        const wasDisconnected = instancia.status !== "connected";
        if (dbStatus !== instancia.status || phoneNumber !== instancia.numero_whatsapp) {
          await supabase
            .from("omni_instancias")
            .update({ status: dbStatus, numero_whatsapp: phoneNumber })
            .eq("id", instancia_id);
        }

        // Auto-trigger history import when transitioning to connected (with 12h cooldown)
        if (dbStatus === "connected" && wasDisconnected) {
          const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
          const lastImport = instancia.last_history_import_at;
          const shouldImport = !lastImport || lastImport < twelveHoursAgo;

          if (shouldImport) {
            try {
              const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
              if (SUPABASE_ANON_KEY) {
                // Mark import timestamp immediately to prevent duplicate triggers
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
                }).catch(err => console.warn("[ConnectionStatus] Sync trigger error:", err));
                console.log(`[ConnectionStatus] Triggered history import for instance ${instancia_id}`);
              }
            } catch (syncErr) {
              console.warn("[ConnectionStatus] Sync trigger error:", syncErr);
            }
          } else {
            console.log(`[ConnectionStatus] Skipping import - last import at ${lastImport} (within 12h)`);
          }
        }

        return new Response(
          JSON.stringify({ success: true, status: dbStatus, numero_whatsapp: phoneNumber }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: true, status: instancia.status, numero_whatsapp: instancia.numero_whatsapp, from_cache: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ===== EVOLUTION PROVIDER (existing logic) =====
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking connection status for: ${instancia.evolution_instance_name}`);

    let statusData;
    let statusOk = false;

    try {
      const statusResponse = await fetchWithRetry(
        `${EVOLUTION_API_URL}/instance/connectionState/${instancia.evolution_instance_name}`,
        { method: "GET", headers: { "apikey": EVOLUTION_API_KEY } },
        3, 800
      );
      statusData = await statusResponse.json();
      statusOk = statusResponse.ok;
    } catch (err) {
      return new Response(
        JSON.stringify({ success: true, status: instancia.status, numero_whatsapp: instancia.numero_whatsapp, from_cache: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!statusOk) {
      return new Response(
        JSON.stringify({ success: true, status: instancia.status, numero_whatsapp: instancia.numero_whatsapp, from_cache: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const state = statusData.state || statusData.instance?.state;
    let dbStatus = "disconnected";
    if (state === "open" || state === "connected") dbStatus = "connected";
    else if (state === "connecting") dbStatus = "connecting";

    if (dbStatus !== instancia.status) {
      await supabase.from("omni_instancias").update({ status: dbStatus }).eq("id", instancia_id);
    }

    return new Response(
      JSON.stringify({ success: true, status: dbStatus, numero_whatsapp: instancia.numero_whatsapp, evolution_state: state }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error checking connection status:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
