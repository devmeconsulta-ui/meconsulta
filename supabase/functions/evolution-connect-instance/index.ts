import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConnectInstanceRequest {
  instancia_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
    const { instancia_id } = body;

    if (!instancia_id) {
      return new Response(
        JSON.stringify({ error: "instancia_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar instância no banco
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

    // Atualizar status para connecting
    await supabase
      .from("omni_instancias")
      .update({ status: "connecting" })
      .eq("id", instancia_id);

    // Buscar QR Code na Evolution API
    const qrResponse = await fetch(
      `${EVOLUTION_API_URL}/instance/connect/${instancia.evolution_instance_name}`,
      {
        method: "GET",
        headers: {
          "apikey": EVOLUTION_API_KEY,
        },
      }
    );

    const qrData = await qrResponse.json();

    if (!qrResponse.ok) {
      console.error("Evolution API error getting QR:", qrData);
      
      // Reverter status
      await supabase
        .from("omni_instancias")
        .update({ status: "disconnected" })
        .eq("id", instancia_id);

      return new Response(
        JSON.stringify({ error: "Erro ao gerar QR Code", details: qrData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
