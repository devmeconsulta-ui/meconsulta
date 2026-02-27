import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Status hierarchy (higher = more advanced, never downgrade)
const statusHierarchy: Record<string, number> = {
  "erro": 0,
  "enviada": 1,
  "entregue": 2,
  "lida": 3,
};

// Auto-distribute atendimento to online agents based on queue strategy
async function autoDistribuirAtendimento(
  supabase: any,
  atendimentoId: string,
  filaId: string | null,
  clinicaId: string
): Promise<string | null> {
  if (!filaId) return null;
  try {
    const { data: fila } = await supabase
      .from("omni_filas")
      .select("estrategia_distribuicao, atendimentos_max_agente, nome")
      .eq("id", filaId)
      .single();
    if (!fila) return null;

    const estrategia = fila.estrategia_distribuicao || "round_robin";
    if (estrategia === "manual") return null;

    const { data: agentesVinculados } = await supabase
      .from("omni_agentes")
      .select("usuario_clinica_id")
      .eq("fila_id", filaId)
      .eq("status", "online");
    if (!agentesVinculados?.length) return null;

    const agentIds = agentesVinculados.map((a: any) => a.usuario_clinica_id);
    const threshold = new Date(Date.now() - 45000).toISOString();
    const { data: onlinePresence } = await supabase
      .from("agent_presence")
      .select("usuario_clinica_id")
      .eq("clinica_id", clinicaId)
      .eq("status", "online")
      .gte("last_seen", threshold)
      .in("usuario_clinica_id", agentIds);
    if (!onlinePresence?.length) return null;

    const onlineIds = onlinePresence.map((p: any) => p.usuario_clinica_id);
    const { data: activeCounts } = await supabase
      .from("omni_atendimentos")
      .select("agente_id")
      .eq("clinica_id", clinicaId)
      .in("status", ["aguardando", "em_atendimento"])
      .in("agente_id", onlineIds);

    const countMap: Record<string, number> = {};
    onlineIds.forEach((id: string) => (countMap[id] = 0));
    (activeCounts || []).forEach((a: any) => {
      if (a.agente_id && countMap[a.agente_id] !== undefined) countMap[a.agente_id]++;
    });

    const maxAtendimentos = fila.atendimentos_max_agente || 5;
    const availableAgents = onlineIds.filter((id: string) => countMap[id] < maxAtendimentos);
    if (!availableAgents.length) return null;

    let selectedAgentId: string;
    if (estrategia === "aleatorio") {
      selectedAgentId = availableAgents[Math.floor(Math.random() * availableAgents.length)];
    } else {
      availableAgents.sort((a: string, b: string) => countMap[a] - countMap[b]);
      selectedAgentId = availableAgents[0];
    }

    await supabase
      .from("omni_atendimentos")
      .update({ agente_id: selectedAgentId, status: "em_atendimento", data_primeira_resposta: new Date().toISOString() })
      .eq("id", atendimentoId)
      .eq("status", "aguardando");

    console.log(`[AutoDistrib] Assigned ${atendimentoId} to ${selectedAgentId}`);
    return selectedAgentId;
  } catch (err) {
    console.error("[AutoDistrib] Error:", err);
    return null;
  }
}

// Download media from Z-API URL and upload to Supabase Storage
async function downloadAndUploadMedia(
  supabase: any,
  mediaUrl: string | null,
  mimeType: string,
  mediaType: string,
  clinicaId: string,
  atendimentoId: string,
  messageKey: string
): Promise<string | null> {
  if (!mediaUrl) return null;

  try {
    console.log(`[Media] Downloading ${mediaType} from Z-API URL`);
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      console.error(`[Media] Download failed: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const binaryData = new Uint8Array(arrayBuffer);

    let normalizedMime = mimeType.split(";")[0].trim();
    let ext = "bin";

    if (mediaType === "audio") {
      normalizedMime = "audio/ogg";
      ext = "ogg";
    } else if (normalizedMime.includes("image/jpeg") || normalizedMime.includes("image/jpg")) {
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

    const fileName = `${mediaType}_${Date.now()}_${messageKey.substring(0, 8)}.${ext}`;
    const filePath = `omni/${clinicaId}/${atendimentoId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("omni-files")
      .upload(filePath, binaryData, { contentType: normalizedMime, upsert: false });

    if (uploadError) {
      console.error("[Media] Upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from("omni-files").getPublicUrl(filePath);
    console.log(`[Media] Uploaded to: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("[Media] Error:", error);
    return null;
  }
}

// Send message via Z-API
async function sendViaZapi(
  instanciaData: any,
  telefone: string,
  text: string
): Promise<{ messageId?: string; success: boolean }> {
  const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
  if (!ZAPI_CLIENT_TOKEN || !instanciaData.zapi_instance_id || !instanciaData.zapi_token) {
    console.error("[Z-API Send] Missing Z-API credentials");
    return { success: false };
  }

  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${instanciaData.zapi_instance_id}/token/${instanciaData.zapi_token}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": ZAPI_CLIENT_TOKEN,
        },
        body: JSON.stringify({ phone: telefone, message: text }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      // Z-API returns zaapId and messageId
      return { messageId: data.zaapId || data.messageId, success: true };
    } else {
      console.error("[Z-API Send] Failed:", response.status, await response.text());
      return { success: false };
    }
  } catch (err) {
    console.error("[Z-API Send] Error:", err);
    return { success: false };
  }
}

// Find or create contact
async function findOrCreateContato(
  supabase: any,
  clinicaId: string,
  telefone: string,
  senderName: string | null,
  fotoUrl: string | null
) {
  let { data: contato } = await supabase
    .from("omni_contatos")
    .select("*")
    .eq("clinica_id", clinicaId)
    .eq("telefone", telefone)
    .single();

  if (!contato) {
    const nome = (senderName && senderName !== "Você") ? senderName : telefone;
    const { data: novoContato, error } = await supabase
      .from("omni_contatos")
      .insert({ clinica_id: clinicaId, nome, telefone, foto_url: fotoUrl || null })
      .select()
      .single();
    if (error) {
      console.error("[Contact] Error creating:", error);
      return null;
    }
    contato = novoContato;
  }
  return contato;
}

// Find or create atendimento
async function findOrCreateAtendimento(
  supabase: any,
  clinicaId: string,
  contatoId: string,
  instanciaId: string,
  statusInicial: string = "aguardando"
) {
  let { data: atendimento } = await supabase
    .from("omni_atendimentos")
    .select("*")
    .eq("clinica_id", clinicaId)
    .eq("contato_id", contatoId)
    .in("status", ["aguardando", "em_atendimento"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!atendimento) {
    const { data: fila } = await supabase
      .from("omni_filas")
      .select("id, nome")
      .eq("instancia_id", instanciaId)
      .eq("ativo", true)
      .limit(1)
      .single();

    const { data: novoAtendimento, error } = await supabase
      .from("omni_atendimentos")
      .insert({
        clinica_id: clinicaId,
        contato_id: contatoId,
        fila_id: fila?.id || null,
        status: statusInicial,
        canal: "whatsapp",
      })
      .select()
      .single();

    if (error) {
      console.error("[Atendimento] Error creating:", error);
      return null;
    }
    atendimento = novoAtendimento;

    const assignedAgentId = await autoDistribuirAtendimento(supabase, atendimento.id, fila?.id || null, clinicaId);
    if (assignedAgentId) {
      atendimento.agente_id = assignedAgentId;
      atendimento.status = "em_atendimento";
    }
  } else {
    if (!atendimento.fila_id) {
      const { data: fila } = await supabase
        .from("omni_filas")
        .select("id")
        .eq("instancia_id", instanciaId)
        .eq("ativo", true)
        .limit(1)
        .single();
      if (fila?.id) {
        await supabase.from("omni_atendimentos").update({ fila_id: fila.id }).eq("id", atendimento.id);
        atendimento.fila_id = fila.id;
      }
    }
  }
  return atendimento;
}

// Extract message content from Z-API ReceivedCallback payload
// Docs: https://developer.z-api.io/webhooks/on-message-received
function extractZapiContent(payload: any): {
  tipo: string;
  conteudo: string;
  arquivoUrl: string | null;
  arquivoNome: string | null;
  arquivoTipo: string | null;
} {
  let tipo = "texto";
  let conteudo = "";
  let arquivoUrl: string | null = null;
  let arquivoNome: string | null = null;
  let arquivoTipo: string | null = null;

  if (payload.text?.message) {
    conteudo = payload.text.message;
  } else if (payload.image) {
    tipo = "imagem";
    conteudo = payload.image.caption || "";
    arquivoUrl = payload.image.imageUrl || payload.image.thumbnailUrl;
    arquivoTipo = payload.image.mimeType || "image/jpeg";
  } else if (payload.audio) {
    tipo = "audio";
    conteudo = "[Áudio]";
    arquivoUrl = payload.audio.audioUrl;
    arquivoTipo = payload.audio.mimeType || "audio/ogg";
  } else if (payload.video) {
    tipo = "video";
    conteudo = payload.video.caption || "";
    arquivoUrl = payload.video.videoUrl;
    arquivoTipo = payload.video.mimeType || "video/mp4";
  } else if (payload.document) {
    tipo = "documento";
    conteudo = payload.document.fileName || payload.document.title || "[Documento]";
    arquivoUrl = payload.document.documentUrl;
    arquivoNome = payload.document.fileName;
    arquivoTipo = payload.document.mimeType;
  } else if (payload.sticker) {
    tipo = "sticker";
    conteudo = "[Sticker]";
    arquivoUrl = payload.sticker.stickerUrl;
    arquivoTipo = payload.sticker.mimeType;
  } else if (payload.location) {
    tipo = "localizacao";
    conteudo = JSON.stringify({
      latitude: payload.location.latitude,
      longitude: payload.location.longitude,
      name: payload.location.name,
      address: payload.location.address,
      url: payload.location.url,
    });
  } else if (payload.contact) {
    tipo = "texto";
    conteudo = `[Contato: ${payload.contact.displayName || ""}]`;
  } else {
    conteudo = payload.body || payload.caption || "";
  }

  return { tipo, conteudo, arquivoUrl, arquivoNome, arquivoTipo };
}

// Process AI response and send messages back via Z-API (same pipeline as Evolution)
async function processAIResponse(
  supabase: any,
  instanciaData: any,
  atendimentoId: string,
  contatoId: string,
  telefone: string,
  conteudo: string,
  clinicaId: string
) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/omni-ai-respond`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        atendimento_id: atendimentoId,
        mensagem: conteudo,
        clinica_id: clinicaId,
      }),
    });

    if (!aiResponse.ok) {
      console.log("[AI] AI respond returned error:", aiResponse.status);
      return;
    }

    const aiData = await aiResponse.json();

    if (aiData.ai_active && aiData.mensagens && aiData.mensagens.length > 0) {
      console.log(`[AI] Got ${aiData.mensagens.length} messages to send via Z-API`);

      for (let i = 0; i < aiData.mensagens.length; i++) {
        const msgToSend = aiData.mensagens[i];

        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const result = await sendViaZapi(instanciaData, telefone, msgToSend);

        if (result.success) {
          console.log(`[AI] Sent message ${i + 1}: ${msgToSend.substring(0, 50)}...`);
          await supabase.from("omni_mensagens").insert({
            atendimento_id: atendimentoId,
            contato_id: contatoId,
            tipo: "texto",
            direcao: "saida",
            conteudo: msgToSend,
            whatsapp_message_id: result.messageId,
            status: "enviada",
            agente_nome: aiData.agente_nome,
          });
        } else {
          console.error("[AI] Failed to send message via Z-API");
        }
      }
    } else if (aiData.mensagem) {
      const result = await sendViaZapi(instanciaData, telefone, aiData.mensagem);
      if (result.success) {
        await supabase.from("omni_mensagens").insert({
          atendimento_id: atendimentoId,
          contato_id: contatoId,
          tipo: "texto",
          direcao: "saida",
          conteudo: aiData.mensagem,
          whatsapp_message_id: result.messageId,
          status: "enviada",
          agente_nome: aiData.agente_nome,
        });
      }
    } else {
      console.log("[AI] No AI response or AI not active");
    }
  } catch (aiError) {
    console.error("[AI] Error:", aiError);
  }
}

// Check if human took over and pause AI (same logic as Evolution SEND_MESSAGE)
async function checkAIPause(
  supabase: any,
  atendimentoId: string,
  conteudo: string
) {
  try {
    const { data: conversaIA } = await supabase
      .from("omni_ia_conversas")
      .select("id, humano_assumiu, agente_id")
      .eq("atendimento_id", atendimentoId)
      .single();

    if (!conversaIA || conversaIA.humano_assumiu) return;

    const { data: recentIAMsgs } = await supabase
      .from("omni_mensagens")
      .select("conteudo, agente_nome")
      .eq("atendimento_id", atendimentoId)
      .eq("direcao", "saida")
      .not("agente_nome", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    const isFromIA = recentIAMsgs?.some(
      (m: any) => m.conteudo && conteudo && m.conteudo.trim() === conteudo.trim()
    );

    if (isFromIA) {
      console.log("[AI-PAUSE] Message appears to be from AI itself, not pausing");
      return;
    }

    const { data: agenteConfig } = await supabase
      .from("omni_ia_agentes")
      .select("pausar_quando_humano_responde")
      .eq("id", conversaIA.agente_id)
      .single();

    if (agenteConfig?.pausar_quando_humano_responde ?? true) {
      await supabase
        .from("omni_ia_conversas")
        .update({
          humano_assumiu: true,
          humano_assumiu_em: new Date().toISOString(),
          transferido_para_humano: true,
        })
        .eq("id", conversaIA.id);

      console.log(`[AI-PAUSE] Human took over for atendimento ${atendimentoId}`);
    }
  } catch (err) {
    console.error("[AI-PAUSE] Error:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Security: validate Z-API Security Token ---
    const ZAPI_SECURITY_TOKEN = Deno.env.get("ZAPI_SECURITY_TOKEN");
    if (ZAPI_SECURITY_TOKEN) {
      const incomingToken = req.headers.get("x-security-token") || req.headers.get("X-Security-Token");
      if (incomingToken !== ZAPI_SECURITY_TOKEN) {
        console.warn("[Z-API Webhook] Invalid security token. Rejecting.");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log("[Z-API Webhook] Received:", JSON.stringify(payload).substring(0, 1000));

    // Z-API sends "type" to identify the callback type
    // Docs: https://developer.z-api.io/webhooks/introduction
    const type = payload.type;
    const instanceId = payload.instanceId;

    if (!instanceId) {
      console.log("[Z-API Webhook] No instanceId, ignoring");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find instance by zapi_instance_id
    const { data: instanciaData, error: instanciaError } = await supabase
      .from("omni_instancias")
      .select("*, clinica_id")
      .eq("zapi_instance_id", instanceId)
      .single();

    if (instanciaError || !instanciaData) {
      console.log(`[Z-API Webhook] Instance not found for zapi_instance_id: ${instanceId}`);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clinica_id = instanciaData.clinica_id;
    console.log(`[Z-API Webhook] Instance: ${instanciaData.id}, type: ${type}`);

    switch (type) {
      // =====================================================================
      // ReceivedCallback — Incoming AND outgoing messages (when configured
      // with update-webhook-received-delivery to include "enviadas por mim")
      // Docs: https://developer.z-api.io/webhooks/on-message-received
      // =====================================================================
      case "ReceivedCallback": {
        const phone = payload.phone;
        const isGroup = payload.isGroup;
        const isNewsletter = payload.isNewsletter;
        const fromMe = payload.fromMe || false;
        const messageId = payload.messageId;
        const isStatusReply = payload.isStatusReply;
        const isEdit = payload.isEdit;

        // Ignore groups, newsletters, status replies
        if (!phone || isGroup || isNewsletter || isStatusReply) {
          console.log("[Z-API Webhook] Ignored: group/newsletter/statusReply/no phone");
          break;
        }

        // Handle edited messages — update existing message content
        if (isEdit && messageId) {
          const newContent = payload.text?.message || "";
          if (newContent) {
            const { error } = await supabase
              .from("omni_mensagens")
              .update({ conteudo: newContent })
              .eq("whatsapp_message_id", payload.referenceMessageId || messageId);
            if (!error) {
              console.log(`[Z-API Webhook] Message edited: ${payload.referenceMessageId || messageId}`);
            }
          }
          break;
        }

        const telefone = phone.replace(/\D/g, "");
        console.log(`[Z-API Webhook] ReceivedCallback from ${telefone}, fromMe: ${fromMe}`);

        // Z-API docs: senderName is the contact name, only use for incoming
        const senderName = (!fromMe && (payload.senderName || payload.chatName)) ? (payload.senderName || payload.chatName) : null;
        const fotoUrl = (!fromMe && payload.photo) ? payload.photo : (payload.senderPhoto || null);
        
        const contato = await findOrCreateContato(supabase, clinica_id, telefone, senderName, fotoUrl);
        if (!contato) break;

        // For outgoing messages (fromMe), use "em_atendimento" status
        const atendimento = await findOrCreateAtendimento(
          supabase, clinica_id, contato.id, instanciaData.id,
          fromMe ? "em_atendimento" : "aguardando"
        );
        if (!atendimento) break;

        // Check for duplicate using whatsapp_message_id UNIQUE constraint
        if (messageId) {
          const { data: existingMsg } = await supabase
            .from("omni_mensagens")
            .select("id")
            .eq("whatsapp_message_id", messageId)
            .maybeSingle();
          if (existingMsg) {
            console.log(`[Z-API Webhook] Message ${messageId} already exists, skipping`);
            break;
          }
        }

        // Extract content from Z-API payload
        const { tipo, conteudo, arquivoUrl: rawArquivoUrl, arquivoNome, arquivoTipo } = extractZapiContent(payload);

        if (!conteudo && tipo === "texto") {
          console.log("[Z-API Webhook] Empty text message, skipping");
          break;
        }

        // Download media and upload to Supabase Storage
        // Z-API media URLs expire in 30 days, so we persist them
        let arquivoUrl = rawArquivoUrl;
        if (rawArquivoUrl && messageId && tipo !== "texto") {
          const storedUrl = await downloadAndUploadMedia(
            supabase, rawArquivoUrl, arquivoTipo || "application/octet-stream",
            tipo === "imagem" ? "image" : tipo === "video" ? "video" : tipo === "audio" ? "audio" : "document",
            clinica_id, atendimento.id, messageId
          );
          if (storedUrl) arquivoUrl = storedUrl;
        }

        // Determine direction
        const direcao = fromMe ? "saida" : "entrada";

        // Save message — for outgoing (fromMe), check if already saved by edge function
        if (fromMe && messageId) {
          const { data: existingOutMsg } = await supabase
            .from("omni_mensagens")
            .select("id")
            .eq("whatsapp_message_id", messageId)
            .maybeSingle();
          
          if (existingOutMsg) {
            console.log(`[Z-API Webhook] Outgoing message ${messageId} already saved by edge function, skipping`);
          } else {
            // Edge function didn't save it (sent from phone/WhatsApp Web)
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
              console.error("[Z-API Webhook] Error saving outgoing message:", msgError);
            } else {
              console.log(`[Z-API Webhook] Outgoing message saved from webhook`);
            }

            // Pause AI if human sent from phone (same as Evolution SEND_MESSAGE)
            if (conteudo) {
              await checkAIPause(supabase, atendimento.id, conteudo);
            }
          }
        } else {
          // Incoming message — always save
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
            console.error("[Z-API Webhook] Error saving message:", msgError);
          } else {
            console.log(`[Z-API Webhook] Incoming message saved: ${messageId}`);
          }
        }

        // Update contact last message timestamp
        await supabase
          .from("omni_contatos")
          .update({ ultima_mensagem: new Date().toISOString() })
          .eq("id", contato.id);

        // If incoming text message, trigger full AI pipeline
        if (!fromMe && tipo === "texto" && conteudo) {
          await processAIResponse(supabase, instanciaData, atendimento.id, contato.id, telefone, conteudo, clinica_id);
        }

        break;
      }

      // =====================================================================
      // DeliveryCallback — Confirms message was sent/delivered to WhatsApp
      // Docs: https://developer.z-api.io/webhooks/on-message-send
      // Only has: phone, zaapId, messageId, type, instanceId (NO content)
      // =====================================================================
      case "DeliveryCallback": {
        const deliveryMsgId = payload.zaapId || payload.messageId;
        if (deliveryMsgId) {
          // Just confirm delivery — update status if not already more advanced
          const { data: msgAtual } = await supabase
            .from("omni_mensagens")
            .select("status")
            .eq("whatsapp_message_id", deliveryMsgId)
            .maybeSingle();

          const statusAtual = msgAtual?.status || "enviada";
          const nivelAtual = statusHierarchy[statusAtual] || 0;

          if (nivelAtual < (statusHierarchy["entregue"] || 2)) {
            await supabase
              .from("omni_mensagens")
              .update({ status: "entregue" })
              .eq("whatsapp_message_id", deliveryMsgId);
            console.log(`[Z-API Webhook] DeliveryCallback: ${deliveryMsgId} -> entregue`);
          }
        }
        break;
      }

      // =====================================================================
      // MessageStatusCallback — Status changes (SENT, RECEIVED, READ, PLAYED)
      // Docs: https://developer.z-api.io/webhooks/on-whatsapp-message-status-changes
      // =====================================================================
      case "MessageStatusCallback": {
        const newStatusRaw = payload.status;
        const ids = payload.ids || [];

        // Z-API status values per docs:
        // SENT, RECEIVED, READ, READ_BY_ME, PLAYED, DELETED
        const zapiStatusMap: Record<string, string> = {
          "SENT": "enviada",
          "RECEIVED": "entregue",
          "DELIVERED": "entregue",
          "READ": "lida",
          "READ_BY_ME": "lida",
          "PLAYED": "lida",
          "FAILED": "erro",
          "DELETED": "apagada",
        };

        const newStatus = zapiStatusMap[newStatusRaw] || newStatusRaw;
        const nivelNovo = statusHierarchy[newStatus] || 0;

        for (const msgId of ids) {
          if (!msgId) continue;

          // Check current status to avoid downgrade (same as Evolution)
          const { data: msgAtual } = await supabase
            .from("omni_mensagens")
            .select("status")
            .eq("whatsapp_message_id", msgId)
            .maybeSingle();

          const statusAtual = msgAtual?.status || "enviada";
          const nivelAtual = statusHierarchy[statusAtual] || 0;

          // Allow upgrade or special statuses like "apagada"
          if (newStatus === "apagada" || nivelNovo > nivelAtual) {
            const { error } = await supabase
              .from("omni_mensagens")
              .update({ status: newStatus })
              .eq("whatsapp_message_id", msgId);
            if (!error) {
              console.log(`[Z-API Webhook] Status: ${msgId} ${statusAtual} -> ${newStatus}`);
            }
          }
        }
        break;
      }

      // =====================================================================
      // DisconnectedCallback — Instance lost connection
      // =====================================================================
      case "DisconnectedCallback": {
        console.log("[Z-API Webhook] Instance disconnected");
        await supabase
          .from("omni_instancias")
          .update({ status: "disconnected" })
          .eq("id", instanciaData.id);
        break;
      }

      // =====================================================================
      // ConnectedCallback — Instance connected (trigger history sync)
      // =====================================================================
      case "ConnectedCallback": {
        console.log("[Z-API Webhook] Instance connected");
        const phone = payload.phone || payload.wid;
        const updateData: any = { status: "connected" };
        if (phone) {
          updateData.numero_whatsapp = phone.replace(/\D/g, "");
        }
        await supabase
          .from("omni_instancias")
          .update(updateData)
          .eq("id", instanciaData.id);

        // Trigger history import with 12h cooldown
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const lastImport = instanciaData.last_history_import_at;
        const shouldImport = !lastImport || lastImport < twelveHoursAgo;

        if (shouldImport) {
          try {
            // Mark timestamp immediately to prevent duplicate triggers
            await supabase
              .from("omni_instancias")
              .update({ last_history_import_at: new Date().toISOString() })
              .eq("id", instanciaData.id);

            const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
            if (SUPABASE_ANON_KEY) {
              fetch(`${SUPABASE_URL}/functions/v1/zapi-sync-history`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ instancia_id: instanciaData.id, action: "start", days_back: 30 }),
              }).catch(err => console.warn("[Z-API Webhook] Sync history trigger error:", err));
              console.log(`[Z-API Webhook] Triggered history import for ${instanciaData.id}`);
            }
          } catch (syncErr) {
            console.warn("[Z-API Webhook] Sync trigger error:", syncErr);
          }
        } else {
          console.log(`[Z-API Webhook] Skipping import - last at ${lastImport} (within 12h)`);
        }
        break;
      }

      default:
        console.log(`[Z-API Webhook] Unhandled type: ${type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Z-API Webhook] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
