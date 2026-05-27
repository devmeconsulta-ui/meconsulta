import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  // Remove country code for processing
  if (p.startsWith("55") && p.length >= 12) {
    const ddd = p.substring(2, 4);
    const number = p.substring(4);
    // Add 9th digit for mobile numbers in Brazil if missing
    if (number.length === 8 && parseInt(ddd) >= 11) {
      p = `55${ddd}9${number}`;
    }
  }
  return `+${p}`;
}

function mapContentType(msg: any): { content_type: string; message: string; media_url: string | null; media_type: string | null } {
  if (msg.image) return { content_type: "imagem", message: msg.image.caption || "", media_url: msg.image.imageUrl || msg.image.url, media_type: msg.image.mimetype || "image/jpeg" };
  if (msg.video) return { content_type: "video", message: msg.video.caption || "", media_url: msg.video.videoUrl || msg.video.url, media_type: msg.video.mimetype || "video/mp4" };
  if (msg.audio) return { content_type: "audio", message: "", media_url: msg.audio.audioUrl || msg.audio.url, media_type: msg.audio.mimetype || "audio/ogg" };
  if (msg.document) return { content_type: "documento", message: msg.document.caption || msg.document.fileName || "", media_url: msg.document.documentUrl || msg.document.url, media_type: msg.document.mimetype || "application/octet-stream" };
  if (msg.sticker) return { content_type: "sticker", message: "", media_url: msg.sticker.stickerUrl || msg.sticker.url, media_type: msg.sticker.mimetype || "image/webp" };
  return { content_type: "texto", message: msg.text?.message || msg.body || msg.message || "", media_url: null, media_type: null };
}

// Baixa mídia da Evolution (que retorna base64) e faz upload no Storage, retornando URL pública.
async function downloadAndStoreMedia(
  serviceClient: any,
  evoUrl: string,
  evoKey: string,
  instanceName: string,
  msgKey: any,
  msgPayload: any,
  clinicaId: string,
  contentType: string,
  mimetype: string | null,
): Promise<string | null> {
  try {
    if (!evoUrl || !evoKey || !instanceName || !msgKey?.id) return null;
    const resp = await fetch(`${evoUrl.replace(/\/+$/, "")}/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evoKey },
      body: JSON.stringify({
        message: { key: msgKey, message: msgPayload || {} },
        convertToMp4: false,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.warn("[webhook-receiver] getBase64 failed:", resp.status, errText.substring(0, 200));
      return null;
    }
    const data = await resp.json().catch(() => ({}));
    const rawBase64: string = data?.base64 || data?.media || "";
    const base64 = rawBase64.includes(",") ? rawBase64.split(",").pop() || "" : rawBase64;
    let mt: string = data?.mimetype || mimetype || "application/octet-stream";
    if (contentType === "audio" && (mt === "audio" || !mt.includes("/"))) mt = "audio/ogg";
    if (contentType === "imagem" && (mt === "image" || !mt.includes("/"))) mt = "image/jpeg";
    if (contentType === "video" && (mt === "video" || !mt.includes("/"))) mt = "video/mp4";
    if (contentType === "sticker" && (mt === "image" || !mt.includes("/"))) mt = "image/webp";
    if (!base64) return null;

    const bin = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "video/mp4": "mp4", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
      "application/pdf": "pdf",
    };
    const ext = extMap[mt] || mt.split("/")[1]?.split(";")[0] || "bin";
    const folder = contentType === "sticker" ? "stickers" : contentType;
    const path = `${clinicaId}/${folder}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await serviceClient.storage.from("omni-files").upload(path, bin, {
      contentType: mt, upsert: false,
    });
    if (upErr) {
      console.warn("[webhook-receiver] upload error:", upErr.message);
      return null;
    }
    const { data: pub } = serviceClient.storage.from("omni-files").getPublicUrl(path);
    return pub?.publicUrl || null;
  } catch (e) {
    console.warn("[webhook-receiver] downloadAndStoreMedia error:", e);
    return null;
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ZAPI_SECURITY_TOKEN = Deno.env.get("ZAPI_SECURITY_TOKEN");
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Validate security token if configured
    // Z-API may or may not send this header depending on instance config
    if (ZAPI_SECURITY_TOKEN) {
      const secToken = req.headers.get("x-security-token") || req.headers.get("X-Security-Token");
      // Only reject if token IS present but doesn't match (allows missing header)
      if (secToken && secToken !== ZAPI_SECURITY_TOKEN) {
        console.warn("[webhook-receiver] Invalid security token, got:", secToken?.substring(0, 8));
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const url = new URL(req.url);
    const instanceId = url.searchParams.get("instance_id");
    const provider = url.searchParams.get("provider") || "zapi";

    if (!instanceId || (provider !== "zapi" && provider !== "evolution")) {
      return new Response(JSON.stringify({ ok: false, message: "instance_id and provider=zapi|evolution required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json().catch(() => ({}));
    console.log(`[webhook-receiver:${provider}] Event:`, JSON.stringify(rawBody).substring(0, 500));

    // Normalize Evolution v2 payload to legacy Z-API shape used below
    let body: any = rawBody;
    if (provider === "evolution") {
      const ev = String(rawBody?.event || "").toLowerCase();
      const data = rawBody?.data || {};

      if (ev === "connection.update") {
        const state = String(data?.state || "").toLowerCase();
        if (state === "open") {
          body = { event: "ConnectedCallback", connected: true, phone: (data?.wuid || "").split("@")[0] || null };
        } else if (state === "close" || state === "closed") {
          body = { event: "DisconnectedCallback", status: "disconnected" };
        } else {
          return new Response(JSON.stringify({ ok: true, event: "ignored_connection_state", state }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (ev === "messages.upsert" || ev === "send.message") {
        const key = data?.key || {};
        const msg = data?.message || {};
        const remote = String(key?.remoteJid || "");
        const phone = remote.replace(/@.*/, "");
        const fromMe = key?.fromMe === true;
        const text = msg?.conversation || msg?.extendedTextMessage?.text || "";
        const image = msg?.imageMessage;
        const video = msg?.videoMessage;
        const audio = msg?.audioMessage || msg?.pttMessage;
        const document = msg?.documentMessage || msg?.documentWithCaptionMessage?.message?.documentMessage;
        const sticker = msg?.stickerMessage;
        const base64 = msg?.base64 || data?.message?.base64 || null;

        body = {
          phone,
          chatId: remote,
          fromMe,
          messageId: key?.id || data?.messageId || null,
          senderName: data?.pushName || null,
          _evoKey: key, // preservar para download posterior de mídia
          ...(image && { image: { caption: image.caption || "", imageUrl: base64 ? `data:${image.mimetype || "image/jpeg"};base64,${base64}` : (image?.url || null) } }),
          ...(video && { video: { caption: video.caption || "", videoUrl: base64 ? `data:${video.mimetype || "video/mp4"};base64,${base64}` : (video?.url || null) } }),
          ...(audio && { audio: { audioUrl: base64 ? `data:${audio.mimetype || "audio/ogg"};base64,${base64}` : (audio?.url || null), mimetype: audio.mimetype || "audio/ogg" } }),
          ...(document && { document: { fileName: document.fileName || "", caption: document.caption || "", documentUrl: base64 ? `data:${document.mimetype || "application/octet-stream"};base64,${base64}` : (document?.url || null), mimetype: document.mimetype || "application/octet-stream" } }),
          ...(sticker && { sticker: { stickerUrl: sticker?.url || null, mimetype: sticker.mimetype || "image/webp" } }),
          ...((!image && !video && !audio && !document && !sticker) && { text: { message: text } }),
        };

      } else if (ev === "messages.update") {
        const update = Array.isArray(data) ? data[0] : data;
        const key = update?.key || {};
        // Evolution v2 envia tanto formato com key.id quanto keyId no nível raiz
        const msgId = key?.id || update?.keyId || update?.messageId || null;
        const remote = key?.remoteJid || update?.remoteJid || "";
        const status = String(update?.status || update?.update?.status || "").toUpperCase();
        body = {
          event: "MessageStatusCallback",
          ids: [msgId].filter(Boolean),
          status,
          phone: String(remote).replace(/@.*/, ""),
        };
      } else if (ev === "qrcode.updated" || ev === "contacts.upsert") {
        return new Response(JSON.stringify({ ok: true, event: `ignored_${ev}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get managed instance — try by id first, then by omni_instancia_id
    let { data: mi } = await serviceClient
      .from("managed_instances")
      .select("*, clinica_id")
      .eq("id", instanceId)
      .maybeSingle();

    if (!mi) {
      // Fallback: instance_id might be an omni_instancias.id
      const { data: miFallback } = await serviceClient
        .from("managed_instances")
        .select("*, clinica_id")
        .eq("omni_instancia_id", instanceId)
        .maybeSingle();
      mi = miFallback;
    }

    if (!mi) {
      console.warn("[webhook-receiver] Instance not found:", instanceId);
      return new Response(JSON.stringify({ ok: false }), { status: 404, headers: corsHeaders });
    }

    // ─── DisconnectedCallback ───
    if (body.event === "DisconnectedCallback" || body.status === "disconnected") {
      await serviceClient.from("managed_instances").update({
        status: "disconnected",
        last_error: "Disconnected via webhook",
      }).eq("id", instanceId);
      console.log("[webhook-receiver] Instance disconnected:", instanceId);
      return new Response(JSON.stringify({ ok: true, event: "disconnected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ConnectedCallback ───
    if (body.event === "ConnectedCallback" || body.connected === true) {
      await serviceClient.from("managed_instances").update({
        status: "online",
        phone_number: body.phone || body.wid || null,
        last_error: null,
        last_health_check: new Date().toISOString(),
      }).eq("id", instanceId);
      console.log("[webhook-receiver] Instance connected:", instanceId);
      return new Response(JSON.stringify({ ok: true, event: "connected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── MessageStatusCallback ───
    const hasMessagePayload = Boolean(
      body.text ||
      body.body ||
      body.message ||
      body.image ||
      body.video ||
      body.audio ||
      body.document ||
      body.sticker
    );

    const isStatusCallback =
      body.event === "MessageStatusCallback" ||
      body.type === "MessageStatusCallback" ||
      (Array.isArray(body.ids) && body.ids.length > 0 && typeof body.status === "string" && !hasMessagePayload);

    if (isStatusCallback) {
      const firstId = body.ids?.[0];
      const messageId = body.id?.id || body.messageId || (typeof firstId === "string" ? firstId : firstId?.id);
      const rawStatus = body.status || body.type;
      if (messageId && rawStatus) {
        // Map Z-API status values to our internal status
        const statusMap: Record<string, string> = {
          "SENT": "enviada",
          "SERVER_ACK": "enviada",
          "RECEIVED": "entregue",
          "DELIVERED": "entregue",
          "DELIVERY_ACK": "entregue",
          "READ": "lida",
          "READ_SELF": "lida",
          "PLAYED": "lida",
          "PLAYED_SELF": "lida",
          "FAILED": "erro",
          "ERROR": "erro",
        };
        const mappedStatus = statusMap[String(rawStatus).toUpperCase()] || rawStatus;

        const { data: updatedRows, error: statusUpdateError } = await serviceClient
          .from("omni_mensagens")
          .update({ status: mappedStatus })
          .eq("whatsapp_message_id", messageId)
          .eq("direcao", "saida")
          .select("id");

        // Fallback for race condition: callback can arrive before outgoing message row is persisted
        if (!statusUpdateError && (updatedRows?.length || 0) === 0) {
          const rawStatusPhone = body.phone || body.chatId?.replace("@c.us", "").replace("@s.whatsapp.net", "") || "";
          if (rawStatusPhone) {
            const statusPhone = normalizePhone(rawStatusPhone);

            const { data: contatoStatus } = await serviceClient
              .from("omni_contatos")
              .select("id")
              .eq("clinica_id", mi.clinica_id)
              .eq("telefone", statusPhone)
              .maybeSingle();

            if (contatoStatus) {
              const { data: atendimentoStatus } = await serviceClient
                .from("omni_atendimentos")
                .select("id")
                .eq("clinica_id", mi.clinica_id)
                .eq("contato_id", contatoStatus.id)
                .in("status", ["aguardando", "em_atendimento"])
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (atendimentoStatus) {
                const { data: pendingOutgoing } = await serviceClient
                  .from("omni_mensagens")
                  .select("id")
                  .eq("atendimento_id", atendimentoStatus.id)
                  .eq("direcao", "saida")
                  .is("whatsapp_message_id", null)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (pendingOutgoing) {
                  await serviceClient
                    .from("omni_mensagens")
                    .update({ whatsapp_message_id: messageId, status: mappedStatus })
                    .eq("id", pendingOutgoing.id);
                }
              }
            }
          }
        }

        console.log(`[webhook-receiver] Status update: ${messageId} -> ${mappedStatus} (raw: ${rawStatus})`);
      }
      return new Response(JSON.stringify({ ok: true, event: "status" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isDeliveryCallback = body.event === "DeliveryCallback" || body.type === "DeliveryCallback";
    if (isDeliveryCallback) {
      return new Response(JSON.stringify({ ok: true, event: "ignored_delivery_callback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ReceivedCallback (incoming message) ───
    // Ignore non-message events (e.g. presence callbacks)
    if (!hasMessagePayload) {
      return new Response(JSON.stringify({ ok: true, event: "ignored_non_message_event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFromMe = body.fromMe === true;
    const isStatusReply = body.isStatusReply === true;

    // Skip fromMe and status replies
    if (isFromMe || isStatusReply) {
      return new Response(JSON.stringify({ ok: true, event: "skipped" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract phone
    const rawPhone = body.phone || body.chatId?.replace("@c.us", "").replace("@s.whatsapp.net", "") || "";
    if (!rawPhone) {
      return new Response(JSON.stringify({ ok: true, event: "no_phone" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phone = normalizePhone(rawPhone);
    // Validate normalized phone has enough digits
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      console.warn("[webhook-receiver] Invalid phone number, skipping:", rawPhone, "->", phone);
      return new Response(JSON.stringify({ ok: true, event: "invalid_phone" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const messageId = body.messageId || body.id?.id || crypto.randomUUID();
    let { content_type, message, media_url, media_type } = mapContentType(body);
    const senderName = body.senderName || body.pushName || body.notifyName || null;
    const senderPhoto = body.photo || body.senderPhoto || body.profilePicture || body.imgUrl || null;

    // Se a mídia é uma URL criptografada do WhatsApp (não acessível pelo browser),
    // baixar via Evolution e subir no Storage para gerar URL pública.
    if (
      provider === "evolution" &&
      media_url &&
      !media_url.startsWith("data:") &&
      /mmg\.whatsapp\.net|whatsapp\.net|\.enc(\?|$)/.test(media_url)
    ) {
      const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
      const EVO_KEY = mi.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY") || "";
      const stored = await downloadAndStoreMedia(
        serviceClient, EVO_URL, EVO_KEY, mi.evolution_instance_name,
        body._evoKey, mi.clinica_id, content_type, media_type,
      );
      if (stored) media_url = stored;
    }

    console.log(`[webhook-receiver] Incoming from ${phone}: ${content_type} - ${message?.substring(0, 50)}`);


    // Find or create contact
    let { data: contato } = await serviceClient
      .from("omni_contatos")
      .select("id, foto_url, nome")
      .eq("clinica_id", mi.clinica_id)
      .eq("telefone", phone)
      .maybeSingle();

    if (!contato) {
      const { data: newContato, error: contatoErr } = await serviceClient
        .from("omni_contatos")
        .insert({
          clinica_id: mi.clinica_id,
          telefone: phone,
          nome: senderName || phone,
          foto_url: senderPhoto || null,
        })
        .select("id, foto_url, nome")
        .single();

      if (contatoErr) {
        console.error("[webhook-receiver] Error creating contact:", contatoErr);
      }

      contato = newContato;
    } else {
      // Always update photo when available (URLs expire), update name if missing
      const updates: Record<string, string> = {};
      if (senderPhoto) updates.foto_url = senderPhoto;
      if ((!contato.nome || contato.nome === phone) && senderName) updates.nome = senderName;
      if (Object.keys(updates).length > 0) {
        await serviceClient.from("omni_contatos").update(updates).eq("id", contato.id);
      }
    }

    if (!contato) {
      console.error("[webhook-receiver] Could not create contact");
      return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders });
    }

    // Find or create active atendimento (handles race via unique partial index)
    let { data: atendimento } = await serviceClient
      .from("omni_atendimentos")
      .select("id")
      .eq("clinica_id", mi.clinica_id)
      .eq("contato_id", contato.id)
      .in("status", ["aguardando", "em_atendimento"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!atendimento) {
      const { data: newAtendimento, error: atErr } = await serviceClient
        .from("omni_atendimentos")
        .insert({
          clinica_id: mi.clinica_id,
          contato_id: contato.id,
          canal: "whatsapp",
          status: "aguardando",
        })
        .select("id")
        .single();
      if (atErr) {
        // Race: another webhook just created one — refetch
        const { data: existing } = await serviceClient
          .from("omni_atendimentos")
          .select("id")
          .eq("clinica_id", mi.clinica_id)
          .eq("contato_id", contato.id)
          .in("status", ["aguardando", "em_atendimento"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        atendimento = existing;
      } else {
        atendimento = newAtendimento;
      }
    }

    if (!atendimento) {
      console.error("[webhook-receiver] Could not create atendimento");
      return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders });
    }

    // Insert message (dedup by whatsapp_message_id)
    const { error: msgErr } = await serviceClient
      .from("omni_mensagens")
      .insert({
        atendimento_id: atendimento.id,
        contato_id: contato.id,
        conteudo: message,
        tipo: content_type,
        direcao: "entrada",
        whatsapp_message_id: messageId,
        arquivo_url: media_url,
        arquivo_tipo: media_type,
      });

    if (msgErr) {
      // Likely duplicate
      if (msgErr.code === "23505") {
        console.log("[webhook-receiver] Duplicate message, skipping:", messageId);
      } else {
        console.error("[webhook-receiver] Insert error:", msgErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, event: "message_received" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[webhook-receiver] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
