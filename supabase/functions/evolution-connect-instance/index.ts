import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConnectInstanceRequest {
  instancia_id: string;
  sync_history_days?: number;
}

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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: ConnectInstanceRequest = await req.json();
    const { instancia_id, sync_history_days } = body;

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
      console.error("Error fetching instance:", fetchError);
      return new Response(
        JSON.stringify({ error: "Instância não encontrada", details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Connecting instance: ${instancia.evolution_instance_name}`);

    await supabase
      .from("omni_instancias")
      .update({ status: "connecting" })
      .eq("id", instancia_id);

    // If sync_history_days is specified, configure the instance settings
    if (sync_history_days && sync_history_days > 0) {
      console.log(`Configuring sync history for ${sync_history_days} days`);

      try {
        const settingsResponse = await fetchWithRetry(
          `${EVOLUTION_API_URL}/settings/set/${instancia.evolution_instance_name}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
              rejectCall: false,
              groupsIgnore: true,
              alwaysOnline: false,
              readMessages: false,
              readStatus: false,
              syncFullHistory: true,
              daysLimitImportMessages: sync_history_days,
            }),
          },
          3,
          800
        );

        const settingsData = await settingsResponse.json();
        console.log("Settings response:", settingsData);

        if (!settingsResponse.ok) {
          console.warn("Could not set sync history settings:", settingsData);
        }
      } catch (settingsErr) {
        console.warn("Error setting sync history:", settingsErr);
      }
    }

    // Buscar QR Code na Evolution API com retry
    let qrData;
    try {
      const qrResponse = await fetchWithRetry(
        `${EVOLUTION_API_URL}/instance/connect/${instancia.evolution_instance_name}`,
        {
          method: "GET",
          headers: { "apikey": EVOLUTION_API_KEY },
        },
        4,
        1000
      );

      qrData = await qrResponse.json();

      if (!qrResponse.ok) {
        console.error("Evolution API error getting QR:", qrData);

        await supabase
          .from("omni_instancias")
          .update({ status: "disconnected" })
          .eq("id", instancia_id);

        return new Response(
          JSON.stringify({ error: "Erro ao gerar QR Code", details: qrData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchErr) {
      console.error("Evolution API unreachable after retries:", fetchErr);

      await supabase
        .from("omni_instancias")
        .update({ status: "disconnected" })
        .eq("id", instancia_id);

      return new Response(
        JSON.stringify({
          error: "Servidor Evolution API indisponível. Tente novamente em alguns segundos.",
          details: fetchErr instanceof Error ? fetchErr.message : "Connection error",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("QR Code generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        qrcode: qrData.base64 || qrData.qrcode?.base64 || qrData,
        pairingCode: qrData.pairingCode,
        instance: instancia.evolution_instance_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error connecting instance:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
