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
  if (msg.image) return { content_type: "imagem", message: msg.image.caption || "", media_url: msg.image.imageUrl || msg.image.url, media_type: "image" };
  if (msg.video) return { content_type: "video", message: msg.video.caption || "", media_url: msg.video.videoUrl || msg.video.url, media_type: "video" };
  if (msg.audio) return { content_type: "audio", message: "", media_url: msg.audio.audioUrl || msg.audio.url, media_type: "audio" };
  if (msg.document) return { content_type: "documento", message: msg.document.caption || msg.document.fileName || "", media_url: msg.document.documentUrl || msg.document.url, media_type: "document" };
  if (msg.sticker) return { content_type: "sticker", message: "", media_url: msg.sticker.stickerUrl || msg.sticker.url, media_type: "sticker" };
  return { content_type: "texto", message: msg.text?.message || msg.body || msg.message || "", media_url: null, media_type: null };
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
    const provider = url.searchParams.get("provider");

    if (!instanceId || provider !== "zapi") {
      return new Response(JSON.stringify({ ok: false, message: "instance_id and provider=zapi required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    console.log("[webhook-receiver] Event:", JSON.stringify(body).substring(0, 500));

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
          "RECEIVED": "entregue",
          "DELIVERED": "entregue",
          "READ": "lida",
          "PLAYED": "lida",
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
    const messageId = body.messageId || body.id?.id || crypto.randomUUID();
    const { content_type, message, media_url, media_type } = mapContentType(body);
    const senderName = body.senderName || body.pushName || body.notifyName || null;
    const senderPhoto = body.photo || body.senderPhoto || body.profilePicture || body.imgUrl || null;

    console.log(`[webhook-receiver] Incoming from ${phone}: ${content_type} - ${message?.substring(0, 50)}`);

    // Find or create contact
    let { data: contato } = await serviceClient
      .from("omni_contatos")
      .select("id, foto_url, nome")
      .eq("clinica_id", mi.clinica_id)
      .eq("telefone", phone)
      .single();

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
      // Update photo and name if missing
      const updates: Record<string, string> = {};
      if (!contato.foto_url && senderPhoto) updates.foto_url = senderPhoto;
      if ((!contato.nome || contato.nome === phone) && senderName) updates.nome = senderName;
      if (Object.keys(updates).length > 0) {
        await serviceClient.from("omni_contatos").update(updates).eq("id", contato.id);
      }
    }

    if (!contato) {
      console.error("[webhook-receiver] Could not create contact");
      return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders });
    }

    // Find or create active atendimento
    let { data: atendimento } = await serviceClient
      .from("omni_atendimentos")
      .select("id")
      .eq("clinica_id", mi.clinica_id)
      .eq("contato_id", contato.id)
      .in("status", ["aguardando", "em_atendimento"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!atendimento) {
      const { data: newAtendimento } = await serviceClient
        .from("omni_atendimentos")
        .insert({
          clinica_id: mi.clinica_id,
          contato_id: contato.id,
          canal: "whatsapp",
          status: "aguardando",
        })
        .select("id")
        .single();
      atendimento = newAtendimento;
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
