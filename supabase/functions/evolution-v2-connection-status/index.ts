// Evolution API v2 — Connection Status
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { instance_id } = await req.json();
    const { data: inst } = await supabase.from("managed_instances").select("*").eq("id", instance_id).single();
    if (!inst?.evolution_instance_name) {
      return new Response(JSON.stringify({ error: "Instância Evolution não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch(`${EVO_URL}/instance/connectionState/${inst.evolution_instance_name}`, {
      headers: { apikey: inst.evolution_api_key || EVO_KEY || "" },
    });
    const data = await resp.json();
    const state = data?.instance?.state || data?.state || "unknown";

    const mapped = state === "open" ? "online" : state === "connecting" ? "connecting" : "offline";
    await supabase.from("managed_instances").update({ status: mapped }).eq("id", instance_id);

    return new Response(JSON.stringify({ success: true, state, status: mapped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
