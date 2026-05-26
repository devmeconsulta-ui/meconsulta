// Send message — suporta Evolution v2 (preferencial) e Z-API (legado) por instância.
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

interface SendMessageRequest {
  atendimento_id: string;
  agente_id?: string | null;
  assinatura_nome?: string | null;
  tipo: "texto" | "imagem" | "audio" | "video" | "documento";
  conteudo?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  arquivo_tipo?: string;
  encaminhada?: boolean;
}

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

async function sendViaZAPI(
  instancia: any,
  telefoneNormalizado: string,
  tipo: string,
  conteudo: string | undefined,
  arquivo_url: string | undefined,
  arquivo_nome: string | undefined,
  assinaturaNome?: string | null,
): Promise<{ ok: boolean; data: any; messageId?: string }> {
  const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
  if (!ZAPI_CLIENT_TOKEN || !instancia.zapi_instance_id || !instancia.zapi_token) {
    return { ok: false, data: { error: "Z-API credentials missing" } };
  }

  const zapiBase = `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}`;
  const headers = {
    "Content-Type": "application/json",
    "Client-Token": ZAPI_CLIENT_TOKEN,
  };

  const plainContent = (conteudo || "").trim();
  const signedContent = assinaturaNome
    ? (plainContent ? `*${assinaturaNome}*\n${plainContent}` : `*${assinaturaNome}*`)
    : plainContent;

  let endpoint: string;
  let body: any;

  switch (tipo) {
    case "texto":
      endpoint = `${zapiBase}/send-text`;
      body = { phone: telefoneNormalizado, message: signedContent };
      break;
    case "imagem":
      endpoint = `${zapiBase}/send-image`;
      body = { phone: telefoneNormalizado, image: arquivo_url, caption: signedContent || undefined };
      break;
    case "audio":
      endpoint = `${zapiBase}/send-audio`;
      body = { phone: telefoneNormalizado, audio: arquivo_url };
      break;
    case "video":
      endpoint = `${zapiBase}/send-video`;
      body = { phone: telefoneNormalizado, video: arquivo_url, caption: signedContent || undefined };
      break;
    case "documento":
      endpoint = `${zapiBase}/send-document-url`;
      body = { phone: telefoneNormalizado, document: arquivo_url, fileName: arquivo_nome, caption: signedContent || undefined };
      break;
    default:
      endpoint = `${zapiBase}/send-text`;
      body = { phone: telefoneNormalizado, message: signedContent };
  }

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }, 3, 800);

  const data = await response.json();
  const messageId = data.messageId || data.zapiMessageId || data.id;
  return { ok: response.ok, data, messageId };
}

async function sendViaEvolution(
  instancia: any,
  telefoneNormalizado: string,
  tipo: string,
  conteudo: string | undefined,
  arquivo_url: string | undefined,
  arquivo_nome: string | undefined,
  assinaturaNome?: string | null,
): Promise<{ ok: boolean; data: any; messageId?: string }> {
  const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
  const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
  // For Evolution-provider instances, instanceName is stored in zapi_instance_id and apikey in zapi_token
  const instanceName = instancia.zapi_instance_id;
  const apikey = instancia.zapi_token || EVO_KEY;
  if (!EVO_URL || !instanceName || !apikey) {
    return { ok: false, data: { error: "Evolution credentials missing" } };
  }

  const plainContent = (conteudo || "").trim();
  const signedContent = assinaturaNome
    ? (plainContent ? `*${assinaturaNome}*\n${plainContent}` : `*${assinaturaNome}*`)
    : plainContent;

  const number = telefoneNormalizado;
  const headers = { "Content-Type": "application/json", apikey };
  let endpoint = "";
  let body: any = {};

  switch (tipo) {
    case "texto":
      endpoint = `${EVO_URL}/message/sendText/${instanceName}`;
      body = { number, text: signedContent };
      break;
    case "imagem":
      endpoint = `${EVO_URL}/message/sendMedia/${instanceName}`;
      body = { number, mediatype: "image", media: arquivo_url, caption: signedContent || undefined, fileName: arquivo_nome || "image.jpg" };
      break;
    case "video":
      endpoint = `${EVO_URL}/message/sendMedia/${instanceName}`;
      body = { number, mediatype: "video", media: arquivo_url, caption: signedContent || undefined, fileName: arquivo_nome || "video.mp4" };
      break;
    case "documento":
      endpoint = `${EVO_URL}/message/sendMedia/${instanceName}`;
      body = { number, mediatype: "document", media: arquivo_url, caption: signedContent || undefined, fileName: arquivo_nome || "file" };
      break;
    case "audio":
      endpoint = `${EVO_URL}/message/sendWhatsAppAudio/${instanceName}`;
      body = { number, audio: arquivo_url };
      break;
    default:
      endpoint = `${EVO_URL}/message/sendText/${instanceName}`;
      body = { number, text: signedContent };
  }

  const response = await fetchWithRetry(endpoint, { method: "POST", headers, body: JSON.stringify(body) }, 3, 800);
  const data = await response.json().catch(() => ({}));
  const messageId = data?.key?.id || data?.messageId || data?.id || null;
  return { ok: response.ok, data, messageId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: SendMessageRequest = await req.json();
    const { atendimento_id, agente_id, assinatura_nome, tipo, conteudo, arquivo_url, arquivo_nome, arquivo_tipo, encaminhada } = body;

    if (!atendimento_id) {
      return new Response(
        JSON.stringify({ error: "atendimento_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${Date.now() - startTime}ms] Sending message for atendimento: ${atendimento_id}`);

    const { data: atendimento, error: atendimentoError } = await supabase
      .from("omni_atendimentos")
      .select(`
        id, clinica_id, data_abertura, data_primeira_resposta, fila_id,
        contato:omni_contatos!contato_id(id, telefone),
        fila:omni_filas!fila_id(
          id, nome,
          instancia:omni_instancias!instancia_id(id, status, zapi_instance_id, zapi_token, provider)
        )
      `)
      .eq("id", atendimento_id)
      .single();

    if (atendimentoError || !atendimento) {
      return new Response(
        JSON.stringify({ error: "Atendimento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contato = atendimento.contato;
    const fila = atendimento.fila;
    let instancia = fila?.instancia;

    // Fallback: find any connected instance for this clinic
    if (!instancia) {
      const { data: instanciaFallback } = await supabase
        .from("omni_instancias")
        .select("id, status, zapi_instance_id, zapi_token, provider")
        .eq("clinica_id", atendimento.clinica_id)
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();

      if (!instanciaFallback) {
        return new Response(
          JSON.stringify({ error: "Nenhuma instância WhatsApp conectada" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      instancia = instanciaFallback;
    }

    if (instancia.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "WhatsApp desconectado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone
    let telefoneNormalizado = contato.telefone.replace(/\D/g, "");
    if (telefoneNormalizado.length === 10 || telefoneNormalizado.length === 11) {
      telefoneNormalizado = `55${telefoneNormalizado}`;
    }

    // Validate phone is not empty or too short
    if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
      console.error(`Invalid phone number for contact: "${contato.telefone}" -> "${telefoneNormalizado}"`);
      return new Response(
        JSON.stringify({ error: "Número de telefone inválido para este contato" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const useEvolution = instancia.provider === "evolution";
    const result = useEvolution
      ? await sendViaEvolution(instancia, telefoneNormalizado, tipo, conteudo, arquivo_url, arquivo_nome, assinatura_nome)
      : await sendViaZAPI(instancia, telefoneNormalizado, tipo, conteudo, arquivo_url, arquivo_nome, assinatura_nome);

    console.log(`[${Date.now() - startTime}ms] ${useEvolution ? "Evolution" : "Z-API"} response received`);

    if (!result.ok) {
      console.error(`${useEvolution ? "Evolution" : "Z-API"} send error:`, result.data);

      EdgeRuntime.waitUntil((async () => {
        let validAgenteId = agente_id || null;
        if (validAgenteId) {
          const { data: agenteExists } = await supabase.from("usuarios_clinica").select("id").eq("id", validAgenteId).maybeSingle();
          if (!agenteExists) validAgenteId = null;
        }
        await supabase.from("omni_mensagens").insert({
          atendimento_id, agente_id: validAgenteId, contato_id: contato.id,
          tipo, direcao: "saida", conteudo, arquivo_url, arquivo_nome, arquivo_tipo,
          status: "erro", erro_descricao: JSON.stringify(result.data),
        });
      })());

      return new Response(
        JSON.stringify({ error: "Erro ao enviar mensagem", details: result.data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = result.messageId;

    let validAgenteId = agente_id || null;
    if (validAgenteId) {
      const { data: agenteExists } = await supabase
        .from("usuarios_clinica")
        .select("id")
        .eq("id", validAgenteId)
        .maybeSingle();
      if (!agenteExists) validAgenteId = null;
    }

    // Persist outgoing message before returning to avoid status callback race conditions
    const { error: persistError } = await supabase.from("omni_mensagens").insert({
      atendimento_id,
      agente_id: validAgenteId,
      contato_id: contato.id,
      tipo,
      direcao: "saida",
      conteudo,
      arquivo_url,
      arquivo_nome,
      arquivo_tipo,
      whatsapp_message_id: messageId,
      status: "enviada",
      encaminhada: encaminhada || false,
    });

    if (persistError && persistError.code !== "23505") {
      console.error("Error persisting outgoing message:", persistError);
    }

    // Background: update atendimento + pause AI
    EdgeRuntime.waitUntil((async () => {
      try {
        if (!atendimento.data_primeira_resposta && validAgenteId) {
          await supabase.from("omni_atendimentos").update({
            data_primeira_resposta: new Date().toISOString(),
            agente_id: validAgenteId,
            status: "em_atendimento",
            tempo_primeira_resposta: Math.floor((Date.now() - new Date(atendimento.data_abertura).getTime()) / 1000),
          }).eq("id", atendimento_id);
        }

        // Pause AI when human responds
        const { data: conversaIA } = await supabase
          .from("omni_ia_conversas")
          .select("id, humano_assumiu, agente_id")
          .eq("atendimento_id", atendimento_id)
          .single();

        if (conversaIA && !conversaIA.humano_assumiu) {
          const { data: agenteConfig } = await supabase
            .from("omni_ia_agentes")
            .select("pausar_quando_humano_responde")
            .eq("id", conversaIA.agente_id)
            .single();

          if (agenteConfig?.pausar_quando_humano_responde ?? true) {
            await supabase
              .from("omni_ia_conversas")
              .update({ humano_assumiu: true, humano_assumiu_em: new Date().toISOString(), transferido_para_humano: true })
              .eq("id", conversaIA.id);
          }
        }
      } catch (err) {
        console.error("[Background] Error:", err);
      }
    })());

    return new Response(
      JSON.stringify({ success: true, whatsapp_id: messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending message:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
