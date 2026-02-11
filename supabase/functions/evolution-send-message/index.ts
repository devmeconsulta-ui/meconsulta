import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  atendimento_id: string;
  agente_id?: string | null;
  tipo: "texto" | "imagem" | "audio" | "video" | "documento";
  conteudo?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  arquivo_tipo?: string;
}

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  
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

    const body: SendMessageRequest = await req.json();
    const { atendimento_id, agente_id, tipo, conteudo, arquivo_url, arquivo_nome, arquivo_tipo } = body;

    if (!atendimento_id) {
      return new Response(
        JSON.stringify({ error: "atendimento_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${Date.now() - startTime}ms] Starting message send for atendimento: ${atendimento_id}`);

    // Buscar atendimento com contato e instância - OPTIMIZED QUERY
    const { data: atendimento, error: atendimentoError } = await supabase
      .from("omni_atendimentos")
      .select(`
        id,
        clinica_id,
        data_abertura,
        data_primeira_resposta,
        fila_id,
        contato:omni_contatos!contato_id(id, telefone),
        fila:omni_filas!fila_id(
          id,
          nome,
          instancia:omni_instancias!instancia_id(evolution_instance_name, status)
        )
      `)
      .eq("id", atendimento_id)
      .single();

    console.log(`[${Date.now() - startTime}ms] Atendimento fetched`);

    if (atendimentoError || !atendimento) {
      return new Response(
        JSON.stringify({ error: "Atendimento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contato = atendimento.contato;
    const fila = atendimento.fila;
    let instancia = fila?.instancia;

    // FALLBACK: If no queue linked, find any connected instance for this clinic
    if (!atendimento.fila_id || !fila || !instancia) {
      console.log(`Atendimento ${atendimento_id} sem fila vinculada, buscando instância da clínica...`);
      
      const { data: instanciaFallback, error: instanciaError } = await supabase
        .from("omni_instancias")
        .select("evolution_instance_name, status")
        .eq("clinica_id", atendimento.clinica_id)
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();

      if (instanciaError || !instanciaFallback) {
        console.error("Nenhuma instância conectada encontrada para clínica:", atendimento.clinica_id);
        return new Response(
          JSON.stringify({ 
            error: "Nenhuma instância WhatsApp conectada", 
            details: "Configure e conecte uma instância WhatsApp em Omnichannel > Integrações." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Usando instância fallback: ${instanciaFallback.evolution_instance_name}`);
      instancia = instanciaFallback;
    }

    if (instancia.status !== "connected") {
      console.error("Instância desconectada:", instancia.evolution_instance_name);
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp desconectado", 
          details: "A instância WhatsApp precisa ser reconectada. Acesse Omnichannel > Integrações para reconectar." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalizar telefone - garantir código do país 55 para Brasil
    let telefoneNormalizado = contato.telefone.replace(/\D/g, ""); // Remove non-digits
    
    // Se telefone não tem código do país (menos de 12 dígitos), adiciona 55
    if (telefoneNormalizado.length === 10 || telefoneNormalizado.length === 11) {
      telefoneNormalizado = `55${telefoneNormalizado}`;
      console.log(`Telefone normalizado com código do país: ${telefoneNormalizado}`);
    }
    
    const telefoneFormatado = contato.telefone.includes("@") 
      ? contato.telefone 
      : `${telefoneNormalizado}@s.whatsapp.net`;

    let evolutionEndpoint = "sendText";
    let evolutionBody: any = {
      number: telefoneFormatado,
    };

    // Configurar body baseado no tipo de mensagem
    switch (tipo) {
      case "texto":
        evolutionBody.text = conteudo;
        break;
      case "imagem":
        evolutionEndpoint = "sendMedia";
        evolutionBody.mediatype = "image";
        evolutionBody.media = arquivo_url;
        evolutionBody.caption = conteudo;
        break;
      case "audio":
        evolutionEndpoint = "sendWhatsAppAudio";
        evolutionBody.audio = arquivo_url;
        break;
      case "video":
        evolutionEndpoint = "sendMedia";
        evolutionBody.mediatype = "video";
        evolutionBody.media = arquivo_url;
        evolutionBody.caption = conteudo;
        break;
      case "documento":
        evolutionEndpoint = "sendMedia";
        evolutionBody.mediatype = "document";
        evolutionBody.media = arquivo_url;
        evolutionBody.fileName = arquivo_nome;
        break;
    }

    console.log(`[${Date.now() - startTime}ms] Sending to Evolution API: ${evolutionEndpoint}`, JSON.stringify(evolutionBody));

    // Enviar mensagem via Evolution API
    const sendResponse = await fetch(
      `${EVOLUTION_API_URL}/message/${evolutionEndpoint}/${instancia.evolution_instance_name}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify(evolutionBody),
      }
    );

    const sendData = await sendResponse.json();
    console.log(`[${Date.now() - startTime}ms] Evolution API response received`);

    if (!sendResponse.ok) {
      console.error("Evolution API send error:", sendData);
      
      // Save error message in background - validate agente_id first
      EdgeRuntime.waitUntil((async () => {
        let validAgenteId = agente_id || null;
        if (validAgenteId) {
          const { data: agenteExists } = await supabase
            .from("usuarios_clinica")
            .select("id")
            .eq("id", validAgenteId)
            .maybeSingle();
          if (!agenteExists) validAgenteId = null;
        }
        await supabase.from("omni_mensagens").insert({
          atendimento_id,
          agente_id: validAgenteId,
          contato_id: contato.id,
          tipo,
          direcao: "saida",
          conteudo,
          arquivo_url,
          arquivo_nome,
          arquivo_tipo,
          status: "erro",
          erro_descricao: JSON.stringify(sendData),
        });
      })());

      return new Response(
        JSON.stringify({ error: "Erro ao enviar mensagem", details: sendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageId = sendData.key?.id || sendData.id;

    // BACKGROUND TASK: Save message, update atendimento, and pause AI if human is responding
    EdgeRuntime.waitUntil((async () => {
      try {
        // Validate agente_id exists in usuarios_clinica before inserting
        let validAgenteId = agente_id || null;
        if (validAgenteId) {
          const { data: agenteExists } = await supabase
            .from("usuarios_clinica")
            .select("id")
            .eq("id", validAgenteId)
            .maybeSingle();
          if (!agenteExists) {
            console.log(`[Background] agente_id ${validAgenteId} not found in usuarios_clinica, setting to null`);
            validAgenteId = null;
          }
        }

        // Save message to DB
        const { error: msgError } = await supabase
          .from("omni_mensagens")
          .insert({
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
          });

        if (msgError) {
          console.error("Error saving message to DB:", msgError);
        }

        // Update first response time if not set
        if (!atendimento.data_primeira_resposta && agente_id) {
          await supabase
            .from("omni_atendimentos")
            .update({
              data_primeira_resposta: new Date().toISOString(),
              agente_id,
              status: "em_atendimento",
              tempo_primeira_resposta: Math.floor(
                (Date.now() - new Date(atendimento.data_abertura).getTime()) / 1000
              ),
            })
            .eq("id", atendimento_id);
        }

        // ========== PAUSAR IA QUANDO HUMANO RESPONDE ==========
        // Se um operador humano está enviando mensagem, pausar a IA
        console.log("[AI-PAUSE] Human operator sent message, checking if AI should pause...");
        
        // Buscar a conversa de IA ativa para este atendimento
        const { data: conversaIA } = await supabase
          .from("omni_ia_conversas")
          .select("id, humano_assumiu, agente_id")
          .eq("atendimento_id", atendimento_id)
          .single();

        if (conversaIA && !conversaIA.humano_assumiu) {
          // Verificar configuração do agente
          const { data: agenteConfig } = await supabase
            .from("omni_ia_agentes")
            .select("pausar_quando_humano_responde")
            .eq("id", conversaIA.agente_id)
            .single();

          const deveParar = agenteConfig?.pausar_quando_humano_responde ?? true;

          if (deveParar) {
            // Marcar que humano assumiu - IA para de responder
            await supabase
              .from("omni_ia_conversas")
              .update({
                humano_assumiu: true,
                humano_assumiu_em: new Date().toISOString(),
                transferido_para_humano: true,
              })
              .eq("id", conversaIA.id);

            console.log(`[AI-PAUSE] Human took over atendimento ${atendimento_id}, AI will stop responding`);
          } else {
            console.log("[AI-PAUSE] Agent configured to NOT pause when human responds");
          }
        } else if (conversaIA?.humano_assumiu) {
          console.log("[AI-PAUSE] AI already paused for this conversation");
        } else {
          console.log("[AI-PAUSE] No AI conversation found for this atendimento");
        }

        console.log(`[Background] Message saved successfully: ${messageId}`);
      } catch (err) {
        console.error("[Background] Error in background task:", err);
      }
    })());

    console.log(`[${Date.now() - startTime}ms] Returning response immediately`);

    // Return immediately - DB operations run in background
    return new Response(
      JSON.stringify({
        success: true,
        whatsapp_id: messageId,
      }),
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
