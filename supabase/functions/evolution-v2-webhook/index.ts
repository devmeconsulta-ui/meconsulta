// Evolution API v2 — Inbound Webhook
// Handles: MESSAGES_UPSERT, MESSAGES_UPDATE, CONNECTION_UPDATE, CONTACTS_UPSERT, QRCODE_UPDATED
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jidToPhone(jid?: string | null) {
  if (!jid) return "";
  return jid.split("@")[0].replace(/\D/g, "");
}

function extractMessageContent(message: any): { tipo: string; conteudo: string; mediaUrl?: string; mediaMime?: string; mediaName?: string } {
  if (!message) return { tipo: "texto", conteudo: "" };
  if (message.conversation) return { tipo: "texto", conteudo: message.conversation };
  if (message.extendedTextMessage?.text) return { tipo: "texto", conteudo: message.extendedTextMessage.text };
  if (message.imageMessage) {
    return {
      tipo: "imagem",
      conteudo: message.imageMessage.caption || "",
      mediaUrl: message.imageMessage.url || message.imageMessage.directPath || "",
      mediaMime: message.imageMessage.mimetype || "image/jpeg",
    };
  }
  if (message.videoMessage) {
    return {
      tipo: "video",
      conteudo: message.videoMessage.caption || "",
      mediaUrl: message.videoMessage.url || "",
      mediaMime: message.videoMessage.mimetype || "video/mp4",
    };
  }
  if (message.audioMessage) {
    return {
      tipo: "audio",
      conteudo: "",
      mediaUrl: message.audioMessage.url || "",
      mediaMime: message.audioMessage.mimetype || "audio/ogg",
    };
  }
  if (message.documentMessage) {
    return {
      tipo: "documento",
      conteudo: message.documentMessage.caption || "",
      mediaUrl: message.documentMessage.url || "",
      mediaMime: message.documentMessage.mimetype || "application/octet-stream",
      mediaName: message.documentMessage.fileName || "arquivo",
    };
  }
  if (message.stickerMessage) {
    return { tipo: "imagem", conteudo: "[sticker]", mediaUrl: message.stickerMessage.url || "", mediaMime: "image/webp" };
  }
  return { tipo: "texto", conteudo: JSON.stringify(message).slice(0, 200) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const event = (body?.event || "").toLowerCase().replace(/[._-]/g, "");
    const instanceName = body?.instance || body?.instanceName;
    const data = body?.data || {};

    console.log("[evolution-v2-webhook] event:", event, "instance:", instanceName);

    if (!instanceName) {
      return new Response(JSON.stringify({ ok: true, ignored: "no instance" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: instance } = await supabase
      .from("managed_instances")
      .select("*")
      .eq("evolution_instance_name", instanceName)
      .maybeSingle();

    if (!instance) {
      console.warn("[evolution-v2-webhook] instance not found:", instanceName);
      return new Response(JSON.stringify({ ok: true, ignored: "instance not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === CONNECTION UPDATE ===
    if (event === "connectionupdate") {
      const state = data?.state || data?.status;
      const mapped = state === "open" ? "online" : state === "connecting" ? "connecting" : "offline";
      await supabase.from("managed_instances").update({ status: mapped }).eq("id", instance.id);
      return new Response(JSON.stringify({ ok: true, status: mapped }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === QR CODE UPDATED === (no-op, frontend polls connect)
    if (event === "qrcodeupdated") {
      return new Response(JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === MESSAGE UPSERT ===
    if (event === "messagesupsert" || event === "sendmessage") {
      const key = data?.key || {};
      const fromMe = !!key.fromMe;
      const remoteJid = key.remoteJid;
      const messageId = key.id;
      const pushName = data?.pushName || "";
      const messageTimestamp = data?.messageTimestamp ? Number(data.messageTimestamp) * 1000 : Date.now();

      if (!remoteJid || remoteJid.includes("@g.us")) {
        // Ignora grupos por enquanto
        return new Response(JSON.stringify({ ok: true, ignored: "group or no jid" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const phone = jidToPhone(remoteJid);
      const content = extractMessageContent(data?.message);

      // Upsert contato
      let { data: contato } = await supabase
        .from("omni_contatos")
        .select("*")
        .eq("clinica_id", instance.clinica_id)
        .eq("telefone", phone)
        .maybeSingle();

      if (!contato) {
        const { data: newContact } = await supabase
          .from("omni_contatos")
          .insert({
            clinica_id: instance.clinica_id,
            telefone: phone,
            nome: pushName || phone,
          })
          .select()
          .single();
        contato = newContact;
      } else if (pushName && contato.nome === contato.telefone) {
        await supabase.from("omni_contatos").update({ nome: pushName }).eq("id", contato.id);
      }

      // Upsert atendimento ativo
      let { data: atendimento } = await supabase
        .from("omni_atendimentos")
        .select("*")
        .eq("clinica_id", instance.clinica_id)
        .eq("contato_id", contato!.id)
        .in("status", ["aguardando", "em_atendimento"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!atendimento) {
        const { data: newAt } = await supabase
          .from("omni_atendimentos")
          .insert({
            clinica_id: instance.clinica_id,
            contato_id: contato!.id,
            instance_id: instance.id,
            status: "aguardando",
            canal: "whatsapp",
          })
          .select()
          .single();
        atendimento = newAt;
      } else if (!atendimento.instance_id) {
        await supabase.from("omni_atendimentos").update({ instance_id: instance.id }).eq("id", atendimento.id);
      }

      // Insere mensagem
      const { error: msgErr } = await supabase.from("omni_mensagens").insert({
        atendimento_id: atendimento!.id,
        contato_id: contato!.id,
        direcao: fromMe ? "saida" : "entrada",
        tipo: content.tipo,
        conteudo: content.conteudo,
        arquivo_url: content.mediaUrl || null,
        arquivo_tipo: content.mediaMime || null,
        arquivo_nome: content.mediaName || null,
        whatsapp_message_id: messageId,
        status_entrega: fromMe ? "sent" : "received",
        created_at: new Date(messageTimestamp).toISOString(),
      });

      if (msgErr && !String(msgErr.message).includes("duplicate")) {
        console.error("[evolution-v2-webhook] insert message error:", msgErr);
      }

      // Dispara download de mídia para Supabase Storage (background)
      if (content.mediaUrl) {
        supabase.functions.invoke("omni-media-download", {
          body: {
            atendimento_id: atendimento!.id,
            whatsapp_message_id: messageId,
            media_url: content.mediaUrl,
            mime_type: content.mediaMime,
            file_name: content.mediaName,
          },
        }).catch((e) => console.warn("[evolution-v2-webhook] media-download dispatch failed:", e));
      }

      return new Response(JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === MESSAGE UPDATE (status: delivered/read) ===
    if (event === "messagesupdate") {
      const key = data?.key || {};
      const status = data?.update?.status || data?.status;
      if (key?.id && status) {
        const mapped = status === 3 || status === "DELIVERY_ACK" ? "delivered"
                     : status === 4 || status === "READ" ? "read" : null;
        if (mapped) {
          await supabase.from("omni_mensagens")
            .update({ status_entrega: mapped })
            .eq("whatsapp_message_id", key.id);
        }
      }
      return new Response(JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === CONTACTS UPSERT === (foto)
    if (event === "contactsupsert") {
      const contacts = Array.isArray(data) ? data : [data];
      for (const c of contacts) {
        if (!c?.id) continue;
        const phone = jidToPhone(c.id);
        const updates: Record<string, any> = {};
        if (c.pushName) updates.nome = c.pushName;
        if (c.profilePicUrl) updates.foto_url = c.profilePicUrl;
        if (Object.keys(updates).length) {
          await supabase.from("omni_contatos")
            .update(updates)
            .eq("clinica_id", instance.clinica_id)
            .eq("telefone", phone);
        }
      }
      return new Response(JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, ignored: event }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[evolution-v2-webhook] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
