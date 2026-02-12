import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { mensagem_id } = await req.json();

    if (!mensagem_id) {
      return new Response(
        JSON.stringify({ error: "mensagem_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the message with atendimento data
    const { data: mensagem, error: msgError } = await supabase
      .from("omni_mensagens")
      .select(`
        id, whatsapp_message_id, atendimento_id,
        atendimento:omni_atendimentos!atendimento_id(
          id, clinica_id, fila_id,
          contato:omni_contatos!contato_id(telefone),
          fila:omni_filas!fila_id(
            instancia:omni_instancias!instancia_id(evolution_instance_name, status)
          )
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

    // Try to delete on WhatsApp first
    if (mensagem.whatsapp_message_id && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      const atendimento = mensagem.atendimento as any;
      let instancia = atendimento?.fila?.instancia;

      if (!instancia) {
        const { data: instanciaFallback } = await supabase
          .from("omni_instancias")
          .select("evolution_instance_name, status")
          .eq("clinica_id", atendimento.clinica_id)
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();
        instancia = instanciaFallback;
      }

      if (instancia?.status === "connected") {
        const telefone = atendimento.contato?.telefone?.replace(/\D/g, "") || "";
        const telefoneNormalizado = telefone.length <= 11 ? `55${telefone}` : telefone;

        try {
          const response = await fetch(
            `${EVOLUTION_API_URL}/chat/deleteMessageForEveryone/${instancia.evolution_instance_name}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "apikey": EVOLUTION_API_KEY,
              },
              body: JSON.stringify({
                id: mensagem.whatsapp_message_id,
                remoteJid: `${telefoneNormalizado}@s.whatsapp.net`,
                fromMe: true,
              }),
            }
          );

          const result = await response.json();
          console.log("Evolution delete response:", result);
        } catch (err) {
          console.error("Error deleting on WhatsApp:", err);
          // Continue to delete from DB anyway
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
