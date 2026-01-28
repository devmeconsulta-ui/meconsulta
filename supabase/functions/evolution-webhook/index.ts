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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    const { event, instance, data } = payload;

    if (!instance) {
      console.log("No instance in payload, ignoring");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar instância pelo nome
    console.log(`Looking for instance: ${instance}`);
    
    const { data: instanciaData, error: instanciaError } = await supabase
      .from("omni_instancias")
      .select("*, clinica_id")
      .eq("evolution_instance_name", instance)
      .single();

    if (instanciaError) {
      console.log(`Instance query error:`, instanciaError);
    }

    if (!instanciaData) {
      console.log(`Instance not found: ${instance}`);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`Found instance: ${instanciaData.id}, clinica: ${instanciaData.clinica_id}`);

    const clinica_id = instanciaData.clinica_id;

    // Processar eventos - normalizar para maiúsculo
    const eventNormalized = event?.toUpperCase?.() || event;
    
    switch (eventNormalized) {
      case "CONNECTION_UPDATE": {
        const state = data?.state || data?.connection;
        let status: string = "disconnected";

        if (state === "open" || state === "connected") {
          status = "connected";
        } else if (state === "connecting") {
          status = "connecting";
        }

        // Atualizar status e número se conectado
        const updateData: any = { status };
        if (status === "connected" && data?.wid) {
          updateData.numero_whatsapp = data.wid.replace("@s.whatsapp.net", "");
        }

        await supabase
          .from("omni_instancias")
          .update(updateData)
          .eq("id", instanciaData.id);

        console.log(`Connection updated for ${instance}: ${status}`);
        break;
      }

      case "MESSAGES_UPSERT": {
        // Processar mensagem recebida
        console.log("Processing MESSAGES_UPSERT, data:", JSON.stringify(data).substring(0, 500));
        
        // A estrutura pode variar: data pode ser a mensagem diretamente ou data.message
        const message = data?.message || data;
        if (!message) {
          console.log("No message found in data");
          break;
        }

        // remoteJid pode estar em data.key.remoteJid ou message.key.remoteJid
        const remoteJid = data?.key?.remoteJid || message.key?.remoteJid || message.remoteJid;
        console.log(`remoteJid: ${remoteJid}`);
        
        if (!remoteJid || remoteJid.includes("@g.us")) {
          console.log("No remoteJid or is group message, ignoring");
          break;
        }

        const telefone = remoteJid.replace("@s.whatsapp.net", "");
        const isFromMe = data?.key?.fromMe || message.key?.fromMe || false;
        const messageId = data?.key?.id || message.key?.id;

        // Ignorar mensagens enviadas por nós
        if (isFromMe) {
          console.log("Message from us, updating status only");
          // Atualizar status da mensagem se existir
          if (messageId) {
            await supabase
              .from("omni_mensagens")
              .update({ status: "enviada" })
              .eq("whatsapp_message_id", messageId);
          }
          break;
        }

        // Buscar ou criar contato
        console.log(`Looking for contact with telefone: ${telefone}, clinica: ${clinica_id}`);
        
        let { data: contato, error: contatoQueryError } = await supabase
          .from("omni_contatos")
          .select("*")
          .eq("clinica_id", clinica_id)
          .eq("telefone", telefone)
          .single();

        if (contatoQueryError) {
          console.log(`Contact query result:`, contatoQueryError.code, contatoQueryError.message);
        }

        if (!contato) {
          // Criar novo contato - pushName pode estar em data ou message
          const pushName = data?.pushName || message.pushName || message.name || telefone;
          console.log(`Creating new contact: ${pushName}`);
          
          const { data: novoContato, error: contatoError } = await supabase
            .from("omni_contatos")
            .insert({
              clinica_id,
              nome: pushName,
              telefone,
              foto_url: message.profilePictureUrl,
            })
            .select()
            .single();

          if (contatoError) {
            console.error("Error creating contact:", contatoError);
            break;
          }
          contato = novoContato;
          console.log(`Contact created: ${contato.id}`);
        } else {
          console.log(`Contact found: ${contato.id}`);
        }

        // Buscar atendimento ativo ou criar um novo
        let { data: atendimento } = await supabase
          .from("omni_atendimentos")
          .select("*")
          .eq("clinica_id", clinica_id)
          .eq("contato_id", contato.id)
          .in("status", ["aguardando", "em_atendimento"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!atendimento) {
          // Buscar fila padrão associada à instância
          const { data: fila } = await supabase
            .from("omni_filas")
            .select("id")
            .eq("instancia_id", instanciaData.id)
            .eq("ativo", true)
            .limit(1)
            .single();

          // Criar novo atendimento
          const { data: novoAtendimento, error: atendimentoError } = await supabase
            .from("omni_atendimentos")
            .insert({
              clinica_id,
              contato_id: contato.id,
              fila_id: fila?.id || null,
              status: "aguardando",
              canal: "whatsapp",
            })
            .select()
            .single();

          if (atendimentoError) {
            console.error("Error creating atendimento:", atendimentoError);
            break;
          }
          atendimento = novoAtendimento;
        }

        // Extrair conteúdo da mensagem
        let tipo = "texto";
        let conteudo = "";
        let arquivoUrl = null;
        let arquivoNome = null;
        let arquivoTipo = null;

        const msgContent = message.message || message;

        if (msgContent.conversation) {
          conteudo = msgContent.conversation;
        } else if (msgContent.extendedTextMessage) {
          conteudo = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage) {
          tipo = "imagem";
          conteudo = msgContent.imageMessage.caption || "";
          arquivoUrl = msgContent.imageMessage.url || message.base64;
          arquivoTipo = msgContent.imageMessage.mimetype;
        } else if (msgContent.audioMessage) {
          tipo = "audio";
          arquivoUrl = msgContent.audioMessage.url || message.base64;
          arquivoTipo = msgContent.audioMessage.mimetype;
        } else if (msgContent.videoMessage) {
          tipo = "video";
          conteudo = msgContent.videoMessage.caption || "";
          arquivoUrl = msgContent.videoMessage.url || message.base64;
          arquivoTipo = msgContent.videoMessage.mimetype;
        } else if (msgContent.documentMessage) {
          tipo = "documento";
          arquivoNome = msgContent.documentMessage.fileName;
          arquivoUrl = msgContent.documentMessage.url || message.base64;
          arquivoTipo = msgContent.documentMessage.mimetype;
        } else if (msgContent.stickerMessage) {
          tipo = "sticker";
          arquivoUrl = msgContent.stickerMessage.url || message.base64;
        } else if (msgContent.locationMessage) {
          tipo = "localizacao";
          conteudo = JSON.stringify({
            latitude: msgContent.locationMessage.degreesLatitude,
            longitude: msgContent.locationMessage.degreesLongitude,
            name: msgContent.locationMessage.name,
            address: msgContent.locationMessage.address,
          });
        }

        // Salvar mensagem
        const { error: msgError } = await supabase
          .from("omni_mensagens")
          .insert({
            atendimento_id: atendimento.id,
            contato_id: contato.id,
            tipo,
            direcao: "entrada",
            conteudo,
            arquivo_url: arquivoUrl,
            arquivo_nome: arquivoNome,
            arquivo_tipo: arquivoTipo,
            whatsapp_message_id: messageId,
            status: "lida",
          });

        if (msgError) {
          console.error("Error saving message:", msgError);
        } else {
          console.log(`Message saved for atendimento ${atendimento.id}`);
        }

        break;
      }

      case "MESSAGES_UPDATE": {
        // Atualizar status de mensagem enviada
        const updates = Array.isArray(data) ? data : [data];
        
        for (const update of updates) {
          const messageId = update.key?.id;
          const status = update.update?.status;
          
          if (messageId && status) {
            let dbStatus = "enviada";
            if (status === 2 || status === "DELIVERY_ACK") dbStatus = "entregue";
            if (status === 3 || status === "READ") dbStatus = "lida";
            if (status === 4 || status === "PLAYED") dbStatus = "lida";

            await supabase
              .from("omni_mensagens")
              .update({ status: dbStatus })
              .eq("whatsapp_message_id", messageId);
          }
        }
        break;
      }

      case "QRCODE_UPDATED": {
        console.log("QR Code updated for instance:", instance);
        break;
      }

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
