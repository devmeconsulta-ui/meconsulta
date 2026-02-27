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
  if (!filaId) return null;
  try {
    const { data: fila } = await supabase
      .from("omni_filas")
      .select("estrategia_distribuicao, atendimentos_max_agente, nome")
      .eq("id", filaId)
      .single();
    if (!fila || fila.estrategia_distribuicao === "manual") return null;

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

    availableAgents.sort((a: string, b: string) => countMap[a] - countMap[b]);
    const selectedAgentId = availableAgents[0];

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log("[Z-API Webhook] Received:", JSON.stringify(payload).substring(0, 1000));

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
      case "ReceivedCallback": {
        // Incoming message
        const phone = payload.phone;
        const isGroup = payload.isGroup;
        const fromMe = payload.fromMe || false;
        const messageId = payload.messageId;

        if (!phone || isGroup) {
          console.log("[Z-API Webhook] No phone or group message, ignoring");
          break;
        }

        const telefone = phone.replace(/\D/g, "");
        console.log(`[Z-API Webhook] Message from ${telefone}, fromMe: ${fromMe}`);

        // Find or create contact
        let { data: contato } = await supabase
          .from("omni_contatos")
          .select("*")
          .eq("clinica_id", clinica_id)
          .eq("telefone", telefone)
          .single();

        if (!contato) {
          const senderName = (!fromMe && payload.senderName) ? payload.senderName : telefone;
          const { data: novoContato, error: contatoError } = await supabase
            .from("omni_contatos")
            .insert({
              clinica_id,
              nome: senderName,
              telefone,
              foto_url: payload.photo || null,
            })
            .select()
            .single();
          if (contatoError) {
            console.error("[Z-API Webhook] Error creating contact:", contatoError);
            break;
          }
          contato = novoContato;
        }

        // Find default queue
        const { data: fila } = await supabase
          .from("omni_filas")
          .select("id, nome")
          .eq("instancia_id", instanciaData.id)
          .eq("ativo", true)
          .limit(1)
          .single();

        // Find or create atendimento
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
              fila_id: fila?.id || null,
              status: "aguardando",
              canal: "whatsapp",
            })
            .select()
            .single();
          if (atError) {
            console.error("[Z-API Webhook] Error creating atendimento:", atError);
            break;
          }
          atendimento = novoAtendimento;
          await autoDistribuirAtendimento(supabase, atendimento.id, fila?.id || null, clinica_id);
        }

        // Check for duplicate
        if (messageId) {
          const { data: existingMsg } = await supabase
            .from("omni_mensagens")
            .select("id")
            .eq("whatsapp_message_id", messageId)
            .single();
          if (existingMsg) {
            console.log(`[Z-API Webhook] Message ${messageId} already exists`);
            break;
          }
        }

        // Extract content
        let tipo = "texto";
        let conteudo = "";
        let arquivoUrl = null;
        let arquivoNome = null;
        let arquivoTipo = null;

        if (payload.text?.message) {
          conteudo = payload.text.message;
        } else if (payload.image) {
          tipo = "imagem";
          conteudo = payload.image.caption || "[Imagem]";
          arquivoUrl = payload.image.imageUrl || payload.image.url;
          arquivoTipo = payload.image.mimeType || "image/jpeg";
        } else if (payload.audio) {
          tipo = "audio";
          conteudo = "[Áudio]";
          arquivoUrl = payload.audio.audioUrl || payload.audio.url;
          arquivoTipo = payload.audio.mimeType || "audio/ogg";
        } else if (payload.video) {
          tipo = "video";
          conteudo = payload.video.caption || "[Vídeo]";
          arquivoUrl = payload.video.videoUrl || payload.video.url;
          arquivoTipo = payload.video.mimeType || "video/mp4";
        } else if (payload.document) {
          tipo = "documento";
          conteudo = payload.document.fileName || "[Documento]";
          arquivoUrl = payload.document.documentUrl || payload.document.url;
          arquivoNome = payload.document.fileName;
          arquivoTipo = payload.document.mimeType;
        } else if (payload.sticker) {
          tipo = "sticker";
          conteudo = "[Sticker]";
          arquivoUrl = payload.sticker.stickerUrl || payload.sticker.url;
        } else if (payload.location) {
          tipo = "localizacao";
          conteudo = `[Localização: ${payload.location.latitude}, ${payload.location.longitude}]`;
        } else if (payload.contact) {
          tipo = "texto";
          conteudo = `[Contato: ${payload.contact.displayName || ""}]`;
        } else {
          conteudo = payload.body || payload.caption || "";
          if (!conteudo) {
            console.log("[Z-API Webhook] Unknown message type, skipping");
            break;
          }
        }

        // Save message
        const { error: msgError } = await supabase
          .from("omni_mensagens")
          .insert({
            atendimento_id: atendimento.id,
            contato_id: contato.id,
            tipo,
            direcao: fromMe ? "saida" : "entrada",
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
          console.log(`[Z-API Webhook] Message saved: ${messageId}`);
        }

        // Update contact last message
        await supabase
          .from("omni_contatos")
          .update({ ultima_mensagem: new Date().toISOString() })
          .eq("id", contato.id);

        // Trigger AI responder if not fromMe
        if (!fromMe) {
          try {
            const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
            if (SUPABASE_ANON_KEY) {
              fetch(`${SUPABASE_URL}/functions/v1/omni-ai-respond`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  atendimento_id: atendimento.id,
                  mensagem_conteudo: conteudo,
                  contato_nome: contato.nome,
                }),
              }).catch(err => console.warn("[Z-API Webhook] AI respond error:", err));
            }
          } catch (aiErr) {
            console.warn("[Z-API Webhook] AI error:", aiErr);
          }
        }

        break;
      }

      case "MessageStatusCallback": {
        // Status update (delivered, read, etc.)
        const statusMap: Record<string, string> = {
          "SENT": "enviada",
          "DELIVERED": "entregue",
          "READ": "lida",
          "PLAYED": "lida",
          "FAILED": "erro",
          "DELETED": "apagada",
        };

        const newStatus = statusMap[payload.status] || payload.status;
        const ids = payload.ids || [];

        for (const msgId of ids) {
          if (!msgId) continue;
          const { error } = await supabase
            .from("omni_mensagens")
            .update({ status: newStatus })
            .eq("whatsapp_message_id", msgId);
          if (!error) {
            console.log(`[Z-API Webhook] Status updated: ${msgId} -> ${newStatus}`);
          }
        }
        break;
      }

      case "DisconnectedCallback": {
        console.log("[Z-API Webhook] Instance disconnected");
        await supabase
          .from("omni_instancias")
          .update({ status: "disconnected" })
          .eq("id", instanciaData.id);
        break;
      }

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

        // Trigger sync history
        try {
          const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
          if (SUPABASE_ANON_KEY) {
            fetch(`${SUPABASE_URL}/functions/v1/zapi-sync-history`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ instancia_id: instanciaData.id }),
            }).catch(err => console.warn("[Z-API Webhook] Sync history trigger error:", err));
          }
        } catch (syncErr) {
          console.warn("[Z-API Webhook] Sync trigger error:", syncErr);
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
