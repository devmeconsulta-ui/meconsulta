// NOTE: Named "evolution-delete-message" for backward compatibility. Uses Z-API exclusively.
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

    const { mensagem_id } = await req.json();

    if (!mensagem_id) {
      return new Response(
        JSON.stringify({ error: "mensagem_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: mensagem, error: msgError } = await supabase
      .from("omni_mensagens")
      .select(`
        id, whatsapp_message_id, atendimento_id,
        atendimento:omni_atendimentos!atendimento_id(
          id, clinica_id,
          contato:omni_contatos!contato_id(telefone)
        )
      `)
      .eq("id", mensagem_id)
      .single();

    if (msgError || !mensagem) {
      return new Response(
        JSON.stringify({ error: "Mensagem não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to delete on WhatsApp via Z-API using managed_instances
    if (mensagem.whatsapp_message_id && ZAPI_CLIENT_TOKEN) {
      const atendimento = mensagem.atendimento as any;
      const clinicaId = atendimento?.clinica_id;

      if (clinicaId) {
        // Find connected managed instance for this clinic
        const { data: mi } = await supabase
          .from("managed_instances")
          .select("external_instance_id, external_token, status")
          .eq("clinica_id", clinicaId)
          .eq("status", "online")
          .limit(1)
          .maybeSingle();

        if (mi?.external_instance_id && mi?.external_token) {
          const telefone = atendimento.contato?.telefone?.replace(/\D/g, "") || "";
          const telefoneNormalizado = telefone.length <= 11 ? `55${telefone}` : telefone;

          try {
            const url = `${ZAPI_BASE}/instances/${mi.external_instance_id}/token/${mi.external_token}/messages?messageId=${encodeURIComponent(mensagem.whatsapp_message_id)}&phone=${telefoneNormalizado}&owner=true`;
            const response = await fetchWithRetry(url, {
              method: "DELETE",
              headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
            }, 3, 800);
            const result = await response.json();
            console.log("Z-API delete response:", result);
          } catch (err) {
            console.error("Error deleting on WhatsApp:", err);
          }
        }
      }
    }

    // Delete from DB
    const { error: deleteError } = await supabase
      .from("omni_mensagens")
      .delete()
      .eq("id", mensagem_id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: "Erro ao apagar mensagem do banco" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error deleting message:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
