import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConnectionStatusRequest {
  instancia_id: string;
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

    const body: ConnectionStatusRequest = await req.json();
    const { instancia_id } = body;

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

    console.log(`Checking connection status for: ${instancia.evolution_instance_name}`);

    let statusData;
    let statusOk = false;

    try {
      const statusResponse = await fetchWithRetry(
        `${EVOLUTION_API_URL}/instance/connectionState/${instancia.evolution_instance_name}`,
        {
          method: "GET",
          headers: { "apikey": EVOLUTION_API_KEY },
        },
        3,
        800
      );

      statusData = await statusResponse.json();
      statusOk = statusResponse.ok;
    } catch (err) {
      console.error("Evolution API unreachable after retries:", err);
      return new Response(
        JSON.stringify({
          success: true,
          status: instancia.status,
          numero_whatsapp: instancia.numero_whatsapp,
          from_cache: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!statusOk) {
      console.error("Evolution API error:", statusData);
      return new Response(
        JSON.stringify({
          success: true,
          status: instancia.status,
          numero_whatsapp: instancia.numero_whatsapp,
          from_cache: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const state = statusData.state || statusData.instance?.state;
    let dbStatus: string = "disconnected";

    if (state === "open" || state === "connected") {
      dbStatus = "connected";
    } else if (state === "connecting") {
      dbStatus = "connecting";
    }

    if (dbStatus !== instancia.status) {
      await supabase
        .from("omni_instancias")
        .update({ status: dbStatus })
        .eq("id", instancia_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: dbStatus,
        numero_whatsapp: instancia.numero_whatsapp,
        evolution_state: state,
      }),
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
