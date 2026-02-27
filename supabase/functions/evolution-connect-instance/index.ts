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

    const { instancia_id, sync_history_days } = await req.json();

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
          JSON.stringify({ error: "Z-API credentials missing" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("omni_instancias")
        .update({ status: "connecting" })
        .eq("id", instancia_id);

      // Get QR Code from Z-API
      try {
        const qrResponse = await fetchWithRetry(
          `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/qr-code/image`,
          { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN } },
          4, 2000
        );

        const qrData = await qrResponse.json();

        if (!qrResponse.ok) {
          await supabase.from("omni_instancias").update({ status: "disconnected" }).eq("id", instancia_id);
          return new Response(
            JSON.stringify({ error: "Erro ao gerar QR Code Z-API", details: qrData }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            qrcode: qrData.value || qrData.base64 || qrData,
            instance: instancia.zapi_instance_id,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        await supabase.from("omni_instancias").update({ status: "disconnected" }).eq("id", instancia_id);
        return new Response(
          JSON.stringify({ error: "Z-API indisponível", details: err instanceof Error ? err.message : "Connection error" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    await supabase.from("omni_instancias").update({ status: "connecting" }).eq("id", instancia_id);

    // Configure sync history if specified
    if (sync_history_days && sync_history_days > 0) {
      try {
        const settingsResponse = await fetchWithRetry(
          `${EVOLUTION_API_URL}/settings/set/${instancia.evolution_instance_name}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
            body: JSON.stringify({
              rejectCall: false, groupsIgnore: true, alwaysOnline: false,
              readMessages: false, readStatus: false, syncFullHistory: true,
              daysLimitImportMessages: sync_history_days,
            }),
          },
          3, 800
        );
        if (!settingsResponse.ok) {
          const d = await settingsResponse.json();
          console.warn("Could not set sync settings:", d);
        } else {
          await settingsResponse.text();
        }
      } catch (err) {
        console.warn("Error setting sync history:", err);
      }
    }

    // Get QR Code from Evolution
    try {
      const qrResponse = await fetchWithRetry(
        `${EVOLUTION_API_URL}/instance/connect/${instancia.evolution_instance_name}`,
        { method: "GET", headers: { "apikey": EVOLUTION_API_KEY } },
        4, 1000
      );

      const qrData = await qrResponse.json();

      if (!qrResponse.ok) {
        await supabase.from("omni_instancias").update({ status: "disconnected" }).eq("id", instancia_id);
        return new Response(
          JSON.stringify({ error: "Erro ao gerar QR Code", details: qrData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          qrcode: qrData.base64 || qrData.qrcode?.base64 || qrData,
          pairingCode: qrData.pairingCode,
          instance: instancia.evolution_instance_name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      await supabase.from("omni_instancias").update({ status: "disconnected" }).eq("id", instancia_id);
      return new Response(
        JSON.stringify({ error: "Servidor Evolution API indisponível", details: err instanceof Error ? err.message : "Connection error" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Error connecting instance:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
