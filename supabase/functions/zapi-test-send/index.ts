import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_BASE = "https://api.z-api.io";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { instancia_id, telefone } = await req.json();

    if (!instancia_id || !telefone) {
      return new Response(
        JSON.stringify({ error: "instancia_id e telefone são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch instance
    const { data: instancia, error: instErr } = await supabase
      .from("omni_instancias")
      .select("*")
      .eq("id", instancia_id)
      .single();

    if (instErr || !instancia) {
      return new Response(
        JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (instancia.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "Instância não está conectada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone
    let phone = telefone.replace(/\D/g, "");
    if (phone.length === 10 || phone.length === 11) {
      phone = `55${phone}`;
    }

    const message = "✅ Integração MeConsulta + WhatsApp ativa";
    let success = false;
    let errorMsg: string | null = null;
    let responseData: any = null;

    if (instancia.provider === "zapi") {
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
        responseData = await resp.json();
        success = resp.ok;
        if (!resp.ok) {
          errorMsg = JSON.stringify(responseData);
        }
      }
    } else {
      // Legacy Evolution – not supported for test
      errorMsg = "Teste de envio não suportado para instâncias legacy";
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

    return new Response(
      JSON.stringify({ success, error: errorMsg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
