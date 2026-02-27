// Thin wrapper: delegates to zapi-manage create_instance action
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Use POST" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const instanceName: string = body.instanceName;
    const clinicaId: string = body.clinica_id;

    if (!instanceName || !clinicaId) {
      return jsonResponse({ ok: false, message: "instanceName e clinica_id são obrigatórios." }, 400);
    }

    // Call zapi-manage internally
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/zapi-manage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        action: "create_instance",
        clinica_id: clinicaId,
        display_name: instanceName,
      }),
    });

    const data = await resp.json();
    return jsonResponse(data, resp.status);
  } catch (error: unknown) {
    console.error("[api-whatsapp-instances] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ ok: false, message: msg }, 500);
  }
});
