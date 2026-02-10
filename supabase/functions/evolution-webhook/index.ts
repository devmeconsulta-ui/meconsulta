import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Auto-distribute atendimento to online agents based on queue strategy
async function autoDistribuirAtendimento(
  supabase: any,
  atendimentoId: string,
  filaId: string | null,
  clinicaId: string
): Promise<string | null> {
  if (!filaId) {
    console.log("[AutoDistrib] No fila_id, skipping distribution");
    return null;
  }

  try {
    // 1. Get queue config
    const { data: fila } = await supabase
      .from("omni_filas")
      .select("estrategia_distribuicao, atendimentos_max_agente, nome")
      .eq("id", filaId)
      .single();

    if (!fila) {
      console.log("[AutoDistrib] Queue not found:", filaId);
      return null;
    }

    const estrategia = fila.estrategia_distribuicao || "round_robin";
    const maxAtendimentos = fila.atendimentos_max_agente || 5;

    if (estrategia === "manual") {
      console.log("[AutoDistrib] Strategy is manual, skipping");
      return null;
    }

    // 2. Get agents linked to this queue
    const { data: agentesVinculados } = await supabase
      .from("omni_agentes")
      .select("usuario_clinica_id")
      .eq("fila_id", filaId)
      .eq("status", "online");

    if (!agentesVinculados || agentesVinculados.length === 0) {
      console.log("[AutoDistrib] No agents linked to queue");
      return null;
    }

    const agentIds = agentesVinculados.map((a: any) => a.usuario_clinica_id);

    // 3. Filter by who is actually online (agent_presence heartbeat within 45s)
    const threshold = new Date(Date.now() - 45000).toISOString();
    const { data: onlinePresence } = await supabase
      .from("agent_presence")
      .select("usuario_clinica_id")
      .eq("clinica_id", clinicaId)
      .eq("status", "online")
      .gte("last_seen", threshold)
      .in("usuario_clinica_id", agentIds);

    if (!onlinePresence || onlinePresence.length === 0) {
      console.log("[AutoDistrib] No online agents found for queue:", fila.nome);
      return null;
    }

    const onlineIds = onlinePresence.map((p: any) => p.usuario_clinica_id);
    console.log(`[AutoDistrib] ${onlineIds.length} online agents in queue "${fila.nome}"`);

    // 4. Count current active atendimentos per agent
    const { data: activeCounts } = await supabase
      .from("omni_atendimentos")
      .select("agente_id")
      .eq("clinica_id", clinicaId)
      .in("status", ["aguardando", "em_atendimento"])
      .in("agente_id", onlineIds);

    const countMap: Record<string, number> = {};
    onlineIds.forEach((id: string) => (countMap[id] = 0));
    (activeCounts || []).forEach((a: any) => {
      if (a.agente_id && countMap[a.agente_id] !== undefined) {
        countMap[a.agente_id]++;
      }
    });

    // 5. Filter out agents at capacity
    const availableAgents = onlineIds.filter((id: string) => countMap[id] < maxAtendimentos);

    if (availableAgents.length === 0) {
      console.log("[AutoDistrib] All online agents at max capacity");
      return null;
    }

    // 6. Apply distribution strategy
    let selectedAgentId: string;

    if (estrategia === "menos_ocupado") {
      // Pick the agent with fewest active atendimentos
      availableAgents.sort((a: string, b: string) => countMap[a] - countMap[b]);
      selectedAgentId = availableAgents[0];
    } else if (estrategia === "aleatorio") {
      selectedAgentId = availableAgents[Math.floor(Math.random() * availableAgents.length)];
    } else {
      // round_robin: pick agent with fewest atendimentos (approximation of round robin)
      availableAgents.sort((a: string, b: string) => countMap[a] - countMap[b]);
      selectedAgentId = availableAgents[0];
    }

    // 7. Assign
    const { error: updateError } = await supabase
      .from("omni_atendimentos")
      .update({
        agente_id: selectedAgentId,
        status: "em_atendimento",
        data_primeira_resposta: new Date().toISOString(),
      })
      .eq("id", atendimentoId)
      .eq("status", "aguardando"); // Only if still waiting

    if (updateError) {
      console.error("[AutoDistrib] Error assigning:", updateError);
      return null;
    }

    console.log(`[AutoDistrib] Assigned atendimento ${atendimentoId} to agent ${selectedAgentId} (strategy: ${estrategia}, load: ${countMap[selectedAgentId]}/${maxAtendimentos})`);
    return selectedAgentId;
  } catch (err) {
    console.error("[AutoDistrib] Error:", err);
    return null;
  }
}

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

          // Auto-distribute to online agents
          const assignedAgentId = await autoDistribuirAtendimento(supabase, atendimento.id, fila?.id || null, clinica_id);
          if (assignedAgentId) {
            atendimento.agente_id = assignedAgentId;
            atendimento.status = "em_atendimento";
          }
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
        // Helper: Convert OGG/Opus to MP3 using external API (for Safari compatibility)
        const convertOggToMp3 = async (oggBase64: string): Promise<string | null> => {
          try {
            console.log("[Audio Convert] Starting OGG to MP3 conversion via Cloudflare AI...");
            
            // Use a lightweight audio transcoding approach
            // Since Deno edge functions can't run FFmpeg, we use a workaround:
            // Store BOTH formats - OGG for Chrome/Firefox/Edge, and provide MP3 fallback info
            // The frontend will handle the actual playback logic
            
            // For now, we'll save as OGG but the frontend has been updated
            // to properly handle OGG playback with enhanced controls
            
            return null; // Return null to indicate no conversion happened
          } catch (error) {
            console.error("[Audio Convert] Error:", error);
            return null;
          }
        };

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
            let binaryData = decodeBase64(base64Data);
            
            // Determine correct mime type and extension based on media type
            let normalizedMime = mimeType.split(";")[0].trim();
            let ext = "bin";
            
            if (mediaType === "audio") {
              // WhatsApp sends audio as OGG/Opus
              // We save as OGG - frontend uses Web Audio API for universal playback
              normalizedMime = "audio/ogg";
              ext = "ogg";
              console.log("[Media] Saving audio as OGG/Opus format");
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

          // Auto-distribute to online agents
          await autoDistribuirAtendimento(supabase, atendimento.id, fila?.id || null, clinica_id);
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

        // ========== PAUSAR IA QUANDO HUMANO RESPONDE VIA CELULAR/WHATSAPP WEB ==========
        // Verificar se é uma mensagem humana (não da IA) e pausar a IA se configurado
        console.log("[AI-PAUSE-WEBHOOK] Checking if AI should pause for SEND_MESSAGE...");
        
        try {
          // Buscar conversa de IA ativa para este atendimento
          const { data: conversaIA } = await supabase
            .from("omni_ia_conversas")
            .select("id, humano_assumiu, agente_id")
            .eq("atendimento_id", atendimento.id)
            .single();

          if (conversaIA && !conversaIA.humano_assumiu) {
            // Verificar se a mensagem foi enviada pela IA (nas últimas mensagens com agente_nome)
            // Se a mensagem tem conteúdo similar a uma resposta recente de IA, é da IA
            const { data: recentIAMsgs } = await supabase
              .from("omni_mensagens")
              .select("conteudo, agente_nome")
              .eq("atendimento_id", atendimento.id)
              .eq("direcao", "saida")
              .not("agente_nome", "is", null)
              .order("created_at", { ascending: false })
              .limit(5);

            // Se a mensagem recém-enviada tem conteúdo igual a uma mensagem recente da IA,
            // provavelmente é a própria IA enviando, não pausar
            const isFromIA = recentIAMsgs?.some(
              (m) => m.conteudo && conteudo && m.conteudo.trim() === conteudo.trim()
            );

            if (isFromIA) {
              console.log("[AI-PAUSE-WEBHOOK] Message appears to be from AI itself, not pausing");
            } else {
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

                console.log(`[AI-PAUSE-WEBHOOK] Human took over via WhatsApp Web/Mobile for atendimento ${atendimento.id}, AI will stop responding`);
              } else {
                console.log("[AI-PAUSE-WEBHOOK] Agent configured to NOT pause when human responds");
              }
            }
          } else if (conversaIA?.humano_assumiu) {
            console.log("[AI-PAUSE-WEBHOOK] AI already paused for this conversation");
          } else {
            console.log("[AI-PAUSE-WEBHOOK] No AI conversation found for this atendimento");
          }
        } catch (pauseErr) {
          console.error("[AI-PAUSE-WEBHOOK] Error checking AI pause:", pauseErr);
          // Não falhar o webhook por causa de erro de pause
        }

        break;
      }

      case "MESSAGES_UPDATE": {
        // Atualizar status de mensagem enviada
        const updates = Array.isArray(data) ? data : [data];
        
        // Hierarquia de status (maior = mais avançado)
        const statusHierarchy: Record<string, number> = {
          "erro": 0,
          "enviada": 1,
          "entregue": 2,
          "lida": 3,
        };
        
        for (const update of updates) {
          const messageId = update.keyId || update.key?.id;
          const status = update.status;
          
          if (messageId && status !== undefined) {
            let newStatus = "enviada";
            if (status === 2 || status === "DELIVERY_ACK" || status === "delivered") newStatus = "entregue";
            if (status === 3 || status === "READ" || status === "read") newStatus = "lida";
            if (status === 4 || status === "PLAYED" || status === "played") newStatus = "lida";

            // Buscar status atual para não rebaixar
            const { data: msgAtual } = await supabase
              .from("omni_mensagens")
              .select("status")
              .eq("whatsapp_message_id", messageId)
              .maybeSingle();

            const statusAtual = msgAtual?.status || "enviada";
            const nivelAtual = statusHierarchy[statusAtual] || 0;
            const nivelNovo = statusHierarchy[newStatus] || 0;

            // Só atualiza se o novo status for mais avançado
            if (nivelNovo > nivelAtual) {
              const { error } = await supabase
                .from("omni_mensagens")
                .update({ status: newStatus })
                .eq("whatsapp_message_id", messageId);

              if (!error) {
                console.log(`Message ${messageId} status updated: ${statusAtual} -> ${newStatus}`);
              }
            } else {
              console.log(`Message ${messageId} status not updated: ${statusAtual} >= ${newStatus}`);
            }
          }
        }
        break;
      }

      case "MESSAGES_SET": {
        // Historical messages batch from sync
        const messages = Array.isArray(data) ? data : [];
        const progress = payload.progress;
        const isLatest = payload.isLatest;
        
        console.log(`[MESSAGES_SET] Processing batch of ${messages.length} historical messages (progress: ${progress}%, isLatest: ${isLatest})`);
        
        if (messages.length === 0) break;

        // Get default queue for this instance
        const { data: defaultFila } = await supabase
          .from("omni_filas")
          .select("id, nome")
          .eq("instancia_id", instanciaData.id)
          .eq("ativo", true)
          .limit(1)
          .single();

        console.log(`[MESSAGES_SET] Default fila: ${defaultFila?.nome || 'none'}`);

        // Group messages by remoteJid (contact)
        const messagesByContact: Record<string, typeof messages> = {};
        for (const msg of messages) {
          const remoteJid = msg.key?.remoteJid;
          if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast") continue;
          if (!messagesByContact[remoteJid]) messagesByContact[remoteJid] = [];
          messagesByContact[remoteJid].push(msg);
        }

        const contactJids = Object.keys(messagesByContact);
        console.log(`[MESSAGES_SET] ${contactJids.length} unique contacts in batch`);

        for (const jid of contactJids) {
          const contactMessages = messagesByContact[jid];
          const telefone = jid.replace("@s.whatsapp.net", "").replace("@lid", "");
          
          try {
            // Find or create contact
            let { data: contato } = await supabase
              .from("omni_contatos")
              .select("*")
              .eq("clinica_id", clinica_id)
              .eq("telefone", telefone)
              .single();

            if (!contato) {
              const pushName = contactMessages[0]?.pushName || telefone;
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
                console.error(`[MESSAGES_SET] Error creating contact ${telefone}:`, contatoError);
                continue;
              }
              contato = novoContato;
            }

            // Find or create atendimento for this contact
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
              const { data: novoAtendimento, error: atError } = await supabase
                .from("omni_atendimentos")
                .insert({
                  clinica_id,
                  contato_id: contato.id,
                  fila_id: defaultFila?.id || null,
                  status: "aguardando",
                  canal: "whatsapp",
                })
                .select()
                .single();

              if (atError) {
                console.error(`[MESSAGES_SET] Error creating atendimento for ${telefone}:`, atError);
                continue;
              }
              atendimento = novoAtendimento;
              console.log(`[MESSAGES_SET] Created atendimento ${atendimento.id} for ${telefone}`);
            }

            // Sort messages by timestamp (oldest first)
            contactMessages.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));

            // Prepare batch insert for messages
            const messagesToInsert = [];
            for (const msg of contactMessages) {
              const messageId = msg.key?.id;
              const isFromMe = msg.key?.fromMe || false;
              const msgContent = msg.message || {};
              
              let tipo = "texto";
              let conteudo = "";

              if (msgContent.conversation) {
                conteudo = msgContent.conversation;
              } else if (msgContent.extendedTextMessage) {
                conteudo = msgContent.extendedTextMessage.text;
              } else if (msgContent.imageMessage) {
                tipo = "imagem";
                conteudo = msgContent.imageMessage.caption || "[Imagem]";
              } else if (msgContent.audioMessage) {
                tipo = "audio";
                conteudo = "[Áudio]";
              } else if (msgContent.videoMessage) {
                tipo = "video";
                conteudo = msgContent.videoMessage.caption || "[Vídeo]";
              } else if (msgContent.documentMessage) {
                tipo = "documento";
                conteudo = msgContent.documentMessage.fileName || "[Documento]";
              } else if (msgContent.stickerMessage) {
                tipo = "sticker";
                conteudo = "[Sticker]";
              } else if (msgContent.locationMessage) {
                tipo = "localizacao";
                conteudo = "[Localização]";
              } else {
                // Skip unknown message types
                continue;
              }

              // Build created_at from messageTimestamp
              const createdAt = msg.messageTimestamp
                ? new Date(msg.messageTimestamp * 1000).toISOString()
                : new Date().toISOString();

              messagesToInsert.push({
                atendimento_id: atendimento.id,
                contato_id: contato.id,
                tipo,
                direcao: isFromMe ? "saida" : "entrada",
                conteudo,
                whatsapp_message_id: messageId,
                status: "entregue",
                created_at: createdAt,
              });
            }

            if (messagesToInsert.length > 0) {
              // Insert in batches of 100 to avoid payload limits
              const BATCH_SIZE = 100;
              let inserted = 0;
              for (let i = 0; i < messagesToInsert.length; i += BATCH_SIZE) {
                const batch = messagesToInsert.slice(i, i + BATCH_SIZE);
                const { error: insertError } = await supabase
                  .from("omni_mensagens")
                  .upsert(batch, { onConflict: "whatsapp_message_id", ignoreDuplicates: true });

                if (insertError) {
                  console.error(`[MESSAGES_SET] Batch insert error for ${telefone}:`, insertError);
                } else {
                  inserted += batch.length;
                }
              }
              console.log(`[MESSAGES_SET] Inserted ${inserted} messages for ${telefone}`);
            }
          } catch (contactErr) {
            console.error(`[MESSAGES_SET] Error processing contact ${telefone}:`, contactErr);
          }
        }

        console.log(`[MESSAGES_SET] Batch processing complete`);
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
