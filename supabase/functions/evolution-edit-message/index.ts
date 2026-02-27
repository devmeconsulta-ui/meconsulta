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

    const { mensagem_id, novo_conteudo } = await req.json();

    if (!mensagem_id || !novo_conteudo) {
      return new Response(
        JSON.stringify({ error: "mensagem_id e novo_conteudo são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the message with atendimento data including provider info
    const { data: mensagem, error: msgError } = await supabase
      .from("omni_mensagens")
      .select(`
        id, whatsapp_message_id, atendimento_id, conteudo,
        atendimento:omni_atendimentos!atendimento_id(
          id, clinica_id, fila_id,
          contato:omni_contatos!contato_id(telefone),
          fila:omni_filas!fila_id(
            instancia:omni_instancias!instancia_id(id, evolution_instance_name, status, provider, zapi_instance_id, zapi_token)
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

    // Update in DB first
    const { error: updateError } = await supabase
      .from("omni_mensagens")
      .update({ conteudo: novo_conteudo })
      .eq("id", mensagem_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar mensagem no banco" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to edit on WhatsApp if we have the whatsapp_message_id
    if (mensagem.whatsapp_message_id) {
      const atendimento = mensagem.atendimento as any;
      let instancia = atendimento?.fila?.instancia;

      // Fallback to any connected instance
      if (!instancia) {
        const { data: instanciaFallback } = await supabase
          .from("omni_instancias")
          .select("id, evolution_instance_name, status, provider, zapi_instance_id, zapi_token")
          .eq("clinica_id", atendimento.clinica_id)
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();
        instancia = instanciaFallback;
      }

      if (instancia?.status === "connected") {
        const telefone = atendimento.contato?.telefone?.replace(/\D/g, "") || "";
        const telefoneNormalizado = telefone.length <= 11 ? `55${telefone}` : telefone;
        const provider = instancia.provider || "evolution";

        try {
          if (provider === "zapi") {
            // Z-API edit message
            const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
            if (ZAPI_CLIENT_TOKEN && instancia.zapi_instance_id && instancia.zapi_token) {
              const response = await fetchWithRetry(
                `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/update-message`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
                  body: JSON.stringify({
                    messageId: mensagem.whatsapp_message_id,
                    phone: telefoneNormalizado,
                    message: novo_conteudo,
                  }),
                },
                3, 800
              );
              const result = await response.json();
              console.log("Z-API edit response:", result);
            }
          } else {
            // Evolution API edit message
            const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
            const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
            if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
              const response = await fetch(
                `${EVOLUTION_API_URL}/chat/updateMessage/${instancia.evolution_instance_name}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY },
                  body: JSON.stringify({
                    number: telefoneNormalizado,
                    text: novo_conteudo,
                    key: {
                      remoteJid: `${telefoneNormalizado}@s.whatsapp.net`,
                      fromMe: true,
                      id: mensagem.whatsapp_message_id,
                    },
                  }),
                }
              );
              const result = await response.json();
              console.log("Evolution edit response:", result);
            }
          }
        } catch (err) {
          console.error("Error editing on WhatsApp:", err);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error editing message:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
