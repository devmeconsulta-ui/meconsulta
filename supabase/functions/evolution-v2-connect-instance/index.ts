// Evolution API v2 — Connect / Get QR Code
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!EVO_URL || !EVO_KEY) {
      return new Response(JSON.stringify({ error: "EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { instance_id } = await req.json();
    if (!instance_id) {
      return new Response(JSON.stringify({ error: "instance_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: inst, error } = await supabase
      .from("managed_instances")
      .select("*")
      .eq("id", instance_id)
      .single();

    if (error || !inst) {
      return new Response(JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const name = inst.evolution_instance_name;
    const key = inst.evolution_api_key || EVO_KEY;
    if (!name) {
      return new Response(JSON.stringify({ error: "Instância não é Evolution (sem evolution_instance_name)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch(`${EVO_URL}/instance/connect/${name}`, {
      method: "GET",
      headers: { apikey: key },
    });
    const data = await resp.json();
    console.log("[evolution-v2-connect] response:", JSON.stringify(data).slice(0, 300));

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Falha ao conectar", details: data }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("managed_instances").update({ status: "connecting" }).eq("id", instance_id);

    return new Response(JSON.stringify({
      success: true,
      qrcode: data?.base64 || data?.code || null,
      pairingCode: data?.pairingCode || null,
      raw: data,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[evolution-v2-connect] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
