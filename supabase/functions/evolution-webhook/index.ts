import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    // Processar eventos - normalizar para maiúsculo e substituir . por _
    const eventNormalized = (event?.toUpperCase?.() || event)?.replace?.(/\./g, "_") || event;
    
    console.log(`Event normalized: ${eventNormalized}`);
    
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
        // Processar mensagem recebida ou enviada
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

        const telefone = remoteJid.replace("@s.whatsapp.net", "").replace("@lid", "");
        const isFromMe = data?.key?.fromMe || message.key?.fromMe || false;
        const messageId = data?.key?.id || message.key?.id;

        console.log(`Processing message - telefone: ${telefone}, fromMe: ${isFromMe}, messageId: ${messageId}`);

        // Buscar ou criar contato
        console.log(`Looking for contact with telefone: ${telefone}, clinica: ${clinica_id}`);
        
        let { data: contato, error: contatoQueryError } = await supabase
          .from("omni_contatos")
          .select("*")
          .eq("clinica_id", clinica_id)
          .eq("telefone", telefone)
          .single();

        if (contatoQueryError && contatoQueryError.code !== "PGRST116") {
          console.log(`Contact query error:`, contatoQueryError.code, contatoQueryError.message);
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

        // Buscar fila padrão associada à instância (mover para antes)
        console.log(`Looking for fila with instancia_id: ${instanciaData.id}`);
        
        const { data: fila, error: filaError } = await supabase
          .from("omni_filas")
          .select("id, nome")
          .eq("instancia_id", instanciaData.id)
          .eq("ativo", true)
          .limit(1)
          .single();
        
        if (filaError && filaError.code !== "PGRST116") {
          console.log(`Fila query error:`, filaError.code, filaError.message);
        }
        console.log(`Found fila:`, fila ? `${fila.id} - ${fila.nome}` : "none");

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
          // Criar novo atendimento com a fila já buscada
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
          console.log(`Atendimento created: ${atendimento.id}, fila: ${fila?.nome || 'none'}`);
        } else {
          console.log(`Atendimento found: ${atendimento.id}`);
          
          // Se o atendimento existente não tem fila mas deveria ter, atualizar
          if (!atendimento.fila_id && fila?.id) {
            console.log(`Updating atendimento ${atendimento.id} with fila ${fila.nome}`);
            await supabase
              .from("omni_atendimentos")
              .update({ fila_id: fila.id })
              .eq("id", atendimento.id);
            atendimento.fila_id = fila.id;
          }
        }

        // Verificar se a mensagem já existe (evitar duplicatas)
        if (messageId) {
          const { data: existingMsg } = await supabase
            .from("omni_mensagens")
            .select("id")
            .eq("whatsapp_message_id", messageId)
            .single();

          if (existingMsg) {
            console.log(`Message ${messageId} already exists, skipping`);
            break;
          }
        }

        // Extrair conteúdo da mensagem
        let tipo = "texto";
        let conteudo = "";
        let arquivoUrl = null;
        let arquivoNome = null;
        let arquivoTipo = null;

        const msgContent = message.message || message;
        const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
        const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

        // Helper function to download media and upload to Supabase Storage
        const downloadAndUploadMedia = async (messageKey: string, mimeType: string, mediaType: string): Promise<string | null> => {
          if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !messageKey) {
            console.log("[Media] Missing API config or message key");
            return null;
          }

          try {
            console.log(`[Media] Downloading ${mediaType} with key: ${messageKey}`);
            
            // Get base64 from Evolution API
            const mediaResponse = await fetch(
              `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instance}`,
              {
                method: "POST",
                headers: {
                  "apikey": EVOLUTION_API_KEY,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: { key: { id: messageKey } },
                  // NOTE: convertToMp4 only works for VIDEO per Evolution API docs
                  // For audio, we keep the original OGG/Opus format from WhatsApp
                }),
              }
            );

            if (!mediaResponse.ok) {
              console.error(`[Media] Failed to get base64: ${mediaResponse.status}`);
              return null;
            }

            const mediaData = await mediaResponse.json();
            const base64Data = mediaData.base64;
            
            if (!base64Data) {
              console.log("[Media] No base64 data returned");
              return null;
            }

            console.log(`[Media] Got base64, length: ${base64Data.length}, originalMime: ${mimeType}`);

            // Decode base64 to binary using proper Deno method
            const { decodeBase64 } = await import("https://deno.land/std@0.208.0/encoding/base64.ts");
            const binaryData = decodeBase64(base64Data);
            
            // Determine correct mime type and extension based on media type
            let normalizedMime = mimeType.split(";")[0].trim();
            let ext = "bin";
            
            if (mediaType === "audio") {
              // WhatsApp sends audio as OGG/Opus - keep original format
              // OGG is supported by Chrome, Firefox, Edge (Safari requires conversion)
              normalizedMime = "audio/ogg";
              ext = "ogg";
              console.log("[Media] Saving audio as OGG/Opus (original WhatsApp format)");
            } else if (normalizedMime.includes("image/jpeg")) {
              ext = "jpg";
            } else if (normalizedMime.includes("image/png")) {
              ext = "png";
            } else if (normalizedMime.includes("image/webp")) {
              ext = "webp";
            } else if (normalizedMime.includes("video")) {
              ext = "mp4";
            } else if (normalizedMime.includes("pdf")) {
              ext = "pdf";
            }

            // Upload to Supabase Storage
            const fileName = `${mediaType}_${Date.now()}_${messageKey.substring(0, 8)}.${ext}`;
            const filePath = `omni/${clinica_id}/${atendimento.id}/${fileName}`;
            
            console.log(`[Media] Uploading with mime: ${normalizedMime}, ext: ${ext}`);
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("omni-files")
              .upload(filePath, binaryData, {
                contentType: normalizedMime,
                upsert: false,
              });

            if (uploadError) {
              console.error("[Media] Upload error:", uploadError);
              return null;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from("omni-files")
              .getPublicUrl(filePath);

            console.log(`[Media] Uploaded to: ${urlData.publicUrl}`);
            return urlData.publicUrl;
          } catch (error) {
            console.error("[Media] Error downloading/uploading:", error);
            return null;
          }
        };

        if (msgContent.conversation) {
          conteudo = msgContent.conversation;
        } else if (msgContent.extendedTextMessage) {
          conteudo = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage) {
          tipo = "imagem";
          conteudo = msgContent.imageMessage.caption || "";
          arquivoTipo = msgContent.imageMessage.mimetype;
          // Download and upload image
          if (!isFromMe && messageId) {
            arquivoUrl = await downloadAndUploadMedia(messageId, arquivoTipo, "image");
          }
          if (!arquivoUrl) {
            arquivoUrl = msgContent.imageMessage.url || message.base64;
          }
        } else if (msgContent.audioMessage) {
          tipo = "audio";
          arquivoTipo = msgContent.audioMessage.mimetype;
          // Download and upload audio
          if (!isFromMe && messageId) {
            arquivoUrl = await downloadAndUploadMedia(messageId, arquivoTipo, "audio");
          }
          if (!arquivoUrl) {
            arquivoUrl = msgContent.audioMessage.url || message.base64;
          }
        } else if (msgContent.videoMessage) {
          tipo = "video";
          conteudo = msgContent.videoMessage.caption || "";
          arquivoTipo = msgContent.videoMessage.mimetype;
          // Download and upload video
          if (!isFromMe && messageId) {
            arquivoUrl = await downloadAndUploadMedia(messageId, arquivoTipo, "video");
          }
          if (!arquivoUrl) {
            arquivoUrl = msgContent.videoMessage.url || message.base64;
          }
        } else if (msgContent.documentMessage) {
          tipo = "documento";
          arquivoNome = msgContent.documentMessage.fileName;
          arquivoTipo = msgContent.documentMessage.mimetype;
          // Download and upload document
          if (!isFromMe && messageId) {
            arquivoUrl = await downloadAndUploadMedia(messageId, arquivoTipo, "document");
          }
          if (!arquivoUrl) {
            arquivoUrl = msgContent.documentMessage.url || message.base64;
          }
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

        // Salvar mensagem - tanto entrada quanto saída
        const direcao = isFromMe ? "saida" : "entrada";
        
        // Status válidos: "enviada" | "entregue" | "lida" | "erro"
        // Para mensagens recebidas, usamos "entregue" pois já chegou ao servidor
        const { error: msgError } = await supabase
          .from("omni_mensagens")
          .insert({
            atendimento_id: atendimento.id,
            contato_id: contato.id,
            tipo,
            direcao,
            conteudo,
            arquivo_url: arquivoUrl,
            arquivo_nome: arquivoNome,
            arquivo_tipo: arquivoTipo,
            whatsapp_message_id: messageId,
            status: "entregue",
          });

        if (msgError) {
          console.error("Error saving message:", msgError);
        } else {
          console.log(`Message saved for atendimento ${atendimento.id}, direction: ${direcao}, content: ${conteudo?.substring(0, 50)}`);
        }

        // Se é mensagem de entrada (do cliente) e é texto, verificar se há IA configurada
        if (direcao === "entrada" && tipo === "texto" && conteudo) {
          console.log("[AI] Checking for AI agent configuration...");
          
          try {
            // Chamar a edge function de IA de forma assíncrona
            const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/omni-ai-respond`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                atendimento_id: atendimento.id,
                mensagem: conteudo,
                clinica_id: clinica_id,
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              
              if (aiData.ai_active && aiData.mensagens && aiData.mensagens.length > 0) {
                console.log(`[AI] Got ${aiData.mensagens.length} messages to send`);
                
                // Buscar instância para enviar mensagem
                const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
                const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

                if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
                  const instanceName = instanciaData.evolution_instance_name;
                  
                  for (let i = 0; i < aiData.mensagens.length; i++) {
                    const msgToSend = aiData.mensagens[i];
                    
                    // Delay entre mensagens para simular digitação
                    if (i > 0) {
                      await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                    
                    try {
                      // Enviar mensagem via Evolution API
                      const sendResponse = await fetch(
                        `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
                        {
                          method: "POST",
                          headers: {
                            "apikey": EVOLUTION_API_KEY,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            number: telefone,
                            text: msgToSend,
                          }),
                        }
                      );

                      if (sendResponse.ok) {
                        const sendData = await sendResponse.json();
                        console.log(`[AI] Sent message ${i + 1}: ${msgToSend.substring(0, 50)}...`);
                        
                        // Salvar mensagem de IA no banco
                        await supabase
                          .from("omni_mensagens")
                          .insert({
                            atendimento_id: atendimento.id,
                            contato_id: contato.id,
                            tipo: "texto",
                            direcao: "saida",
                            conteudo: msgToSend,
                            whatsapp_message_id: sendData?.key?.id,
                            status: "enviada",
                            agente_nome: aiData.agente_nome,
                          });
                      } else {
                        console.error("[AI] Failed to send message:", await sendResponse.text());
                      }
                    } catch (sendError) {
                      console.error("[AI] Error sending message:", sendError);
                    }
                  }
                }
              } else if (aiData.mensagem) {
                // Mensagem de transferência ou similar
                console.log(`[AI] Transfer message: ${aiData.mensagem}`);
                
                const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
                const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

                if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
                  const instanceName = instanciaData.evolution_instance_name;
                  
                  await fetch(
                    `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
                    {
                      method: "POST",
                      headers: {
                        "apikey": EVOLUTION_API_KEY,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        number: telefone,
                        text: aiData.mensagem,
                      }),
                    }
                  );
                  
                  await supabase
                    .from("omni_mensagens")
                    .insert({
                      atendimento_id: atendimento.id,
                      contato_id: contato.id,
                      tipo: "texto",
                      direcao: "saida",
                      conteudo: aiData.mensagem,
                      status: "enviada",
                      agente_nome: aiData.agente_nome,
                    });
                }
              } else {
                console.log("[AI] No AI response or AI not active");
              }
            } else {
              console.log("[AI] AI respond returned error:", aiResponse.status);
            }
          } catch (aiError) {
            console.error("[AI] Error calling AI:", aiError);
            // Não falhar o webhook por causa de erro de IA
          }
        }

        break;
      }

      case "SEND_MESSAGE": {
        // Mensagem enviada pela instância (via API ou WhatsApp Web/App)
        console.log("Processing SEND_MESSAGE, data:", JSON.stringify(data).substring(0, 500));
        
        const message = data;
        if (!message) {
          console.log("No message found in SEND_MESSAGE data");
          break;
        }

        const remoteJid = message.key?.remoteJid;
        if (!remoteJid || remoteJid.includes("@g.us")) {
          console.log("No remoteJid or is group message, ignoring");
          break;
        }

        const telefone = remoteJid.replace("@s.whatsapp.net", "").replace("@lid", "");
        const messageId = message.key?.id;

        console.log(`SEND_MESSAGE - telefone: ${telefone}, messageId: ${messageId}`);

        // Buscar contato
        let { data: contato } = await supabase
          .from("omni_contatos")
          .select("*")
          .eq("clinica_id", clinica_id)
          .eq("telefone", telefone)
          .single();

        if (!contato) {
          // Criar contato se não existir
          const pushName = message.pushName || telefone;
          const { data: novoContato, error: contatoError } = await supabase
            .from("omni_contatos")
            .insert({
              clinica_id,
              nome: pushName,
              telefone,
            })
            .select()
            .single();

          if (contatoError) {
            console.error("Error creating contact:", contatoError);
            break;
          }
          contato = novoContato;
          console.log(`Contact created: ${contato.id}`);
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
          // Buscar fila padrão
          const { data: fila } = await supabase
            .from("omni_filas")
            .select("id")
            .eq("instancia_id", instanciaData.id)
            .eq("ativo", true)
            .limit(1)
            .single();

          const { data: novoAtendimento, error: atendimentoError } = await supabase
            .from("omni_atendimentos")
            .insert({
              clinica_id,
              contato_id: contato.id,
              fila_id: fila?.id || null,
              status: "em_atendimento",
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

        // Verificar se a mensagem já existe
        if (messageId) {
          const { data: existingMsg } = await supabase
            .from("omni_mensagens")
            .select("id")
            .eq("whatsapp_message_id", messageId)
            .single();

          if (existingMsg) {
            console.log(`Message ${messageId} already exists, skipping`);
            break;
          }
        }

        // Extrair conteúdo
        let conteudo = "";
        let tipo = "texto";
        const msgContent = message.message || {};

        if (msgContent.conversation) {
          conteudo = msgContent.conversation;
        } else if (msgContent.extendedTextMessage) {
          conteudo = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage) {
          tipo = "imagem";
          conteudo = msgContent.imageMessage.caption || "";
        } else if (msgContent.audioMessage) {
          tipo = "audio";
        } else if (msgContent.videoMessage) {
          tipo = "video";
          conteudo = msgContent.videoMessage.caption || "";
        } else if (msgContent.documentMessage) {
          tipo = "documento";
        }

        // Salvar mensagem de saída
        const { error: msgError } = await supabase
          .from("omni_mensagens")
          .insert({
            atendimento_id: atendimento.id,
            contato_id: contato.id,
            tipo,
            direcao: "saida",
            conteudo,
            whatsapp_message_id: messageId,
            status: "enviada",
          });

        if (msgError) {
          console.error("Error saving SEND_MESSAGE:", msgError);
        } else {
          console.log(`SEND_MESSAGE saved for atendimento ${atendimento.id}, content: ${conteudo?.substring(0, 50)}`);
        }

        // Nota: A lógica de pausar IA quando humano responde está no evolution-send-message
        // (quando um operador envia mensagem pelo painel), não aqui no webhook
        // Isso evita falsos positivos quando a própria IA envia mensagens

        break;
      }

      case "MESSAGES_UPDATE": {
        // Atualizar status de mensagem enviada
        const updates = Array.isArray(data) ? data : [data];
        
        for (const update of updates) {
          const messageId = update.keyId || update.key?.id;
          const status = update.status;
          
          if (messageId && status) {
            let dbStatus = "enviada";
            if (status === 2 || status === "DELIVERY_ACK") dbStatus = "entregue";
            if (status === 3 || status === "READ") dbStatus = "lida";
            if (status === 4 || status === "PLAYED") dbStatus = "lida";

            const { error } = await supabase
              .from("omni_mensagens")
              .update({ status: dbStatus })
              .eq("whatsapp_message_id", messageId);

            if (!error) {
              console.log(`Message ${messageId} status updated to ${dbStatus}`);
            }
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
