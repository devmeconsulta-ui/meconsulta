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
  if (msg.image) return { content_type: "image", message: msg.image.caption || "", media_url: msg.image.imageUrl || msg.image.url, media_type: "image" };
  if (msg.video) return { content_type: "video", message: msg.video.caption || "", media_url: msg.video.videoUrl || msg.video.url, media_type: "video" };
  if (msg.audio) return { content_type: "audio", message: "", media_url: msg.audio.audioUrl || msg.audio.url, media_type: "audio" };
  if (msg.document) return { content_type: "document", message: msg.document.caption || msg.document.fileName || "", media_url: msg.document.documentUrl || msg.document.url, media_type: "document" };
  if (msg.sticker) return { content_type: "sticker", message: "", media_url: msg.sticker.stickerUrl || msg.sticker.url, media_type: "sticker" };
  return { content_type: "text", message: msg.text?.message || msg.body || msg.message || "", media_url: null, media_type: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ZAPI_SECURITY_TOKEN = Deno.env.get("ZAPI_SECURITY_TOKEN");
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Validate security token if configured
    if (ZAPI_SECURITY_TOKEN) {
      const secToken = req.headers.get("x-security-token") || req.headers.get("X-Security-Token");
      if (secToken !== ZAPI_SECURITY_TOKEN) {
        console.warn("[webhook-receiver] Invalid security token");
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

    // Get managed instance
    const { data: mi } = await serviceClient
      .from("managed_instances")
      .select("*, clinica_id")
      .eq("id", instanceId)
      .single();

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
    if (body.event === "MessageStatusCallback" || body.status) {
      const messageId = body.id?.id || body.messageId || body.ids?.[0]?.id;
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
        const mappedStatus = statusMap[rawStatus.toUpperCase()] || rawStatus;
        // Update message status in omni_mensagens (column is 'status')
        await serviceClient.from("omni_mensagens")
          .update({ status: mappedStatus })
          .eq("whatsapp_message_id", messageId);
        console.log(`[webhook-receiver] Status update: ${messageId} -> ${mappedStatus} (raw: ${rawStatus})`);
      }
      return new Response(JSON.stringify({ ok: true, event: "status" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ReceivedCallback (incoming message) ───
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

    console.log(`[webhook-receiver] Incoming from ${phone}: ${content_type} - ${message?.substring(0, 50)}`);

    // Find or create contact
    let { data: contato } = await serviceClient
      .from("omni_contatos")
      .select("id")
      .eq("clinica_id", mi.clinica_id)
      .eq("telefone", phone)
      .single();

    if (!contato) {
      const { data: newContato } = await serviceClient
        .from("omni_contatos")
        .insert({
          clinica_id: mi.clinica_id,
          telefone: phone,
          nome: senderName || phone,
          canal: "whatsapp",
        })
        .select("id")
        .single();
      contato = newContato;
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
        canal: "whatsapp",
        whatsapp_message_id: messageId,
        arquivo_url: media_url,
        arquivo_tipo: media_type,
        remetente_nome: senderName,
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
