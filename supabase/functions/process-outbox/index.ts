import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "pdf";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get Z-API config
    const { data: integration } = await serviceClient
      .from("platform_integrations")
      .select("config, enabled")
      .eq("provider", "zapi")
      .single();

    if (!integration?.enabled) return json({ ok: false, message: "Z-API desabilitada" }, 400);

    const cfg = integration.config as Record<string, string>;
    const baseUrl = cfg.base_url || "https://api.z-api.io";
    const globalToken = cfg.global_token;

    if (!globalToken) return json({ ok: false, message: "global_token não configurado" }, 500);

    // Fetch pending messages (max 50 per run)
    const { data: pending, error: fetchErr } = await serviceClient
      .from("message_outbox")
      .select("*, managed_instance:instance_id(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchErr) {
      console.error("[process-outbox] Fetch error:", fetchErr);
      return json({ ok: false, message: "Erro ao buscar fila" }, 500);
    }

    if (!pending || pending.length === 0) {
      return json({ ok: true, processed: 0, message: "Nenhuma mensagem pendente" });
    }

    let processed = 0;
    let errors = 0;

    for (const item of pending) {
      try {
        // Find online instance for the clinic
        let instance = item.managed_instance;
        if (!instance || instance.status !== "online") {
          const { data: onlineInstance } = await serviceClient
            .from("managed_instances")
            .select("*")
            .eq("clinica_id", item.clinica_id)
            .eq("status", "online")
            .limit(1)
            .single();

          if (!onlineInstance) {
            await serviceClient.from("message_outbox").update({
              status: "failed",
              error: "Nenhuma instância online disponível",
              attempts: (item.attempts || 0) + 1,
            }).eq("id", item.id);
            errors++;
            continue;
          }
          instance = onlineInstance;

          // Link instance to outbox item
          await serviceClient.from("message_outbox").update({ instance_id: instance.id }).eq("id", item.id);
        }

        const extId = instance.external_instance_id;
        const extToken = instance.external_token;
        const payload = item.payload as Record<string, any>;
        const phone = (payload.phone || "").replace(/\D/g, "");
        const contentType = payload.content_type || "text";

        if (!phone) {
          await serviceClient.from("message_outbox").update({
            status: "failed",
            error: "Telefone não informado",
            attempts: (item.attempts || 0) + 1,
          }).eq("id", item.id);
          errors++;
          continue;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Client-Token": globalToken,
        };

        let endpoint: string;
        let sendBody: Record<string, any>;

        switch (contentType) {
          case "image":
            endpoint = `${baseUrl}/instances/${extId}/token/${extToken}/send-image`;
            sendBody = { phone, image: payload.media_url, caption: payload.message || "" };
            break;
          case "video":
            endpoint = `${baseUrl}/instances/${extId}/token/${extToken}/send-video`;
            sendBody = { phone, video: payload.media_url, caption: payload.message || "" };
            break;
          case "audio":
            endpoint = `${baseUrl}/instances/${extId}/token/${extToken}/send-audio`;
            sendBody = { phone, audio: payload.media_url };
            break;
          case "document": {
            const ext = getFileExtension(payload.file_name || "file.pdf");
            endpoint = `${baseUrl}/instances/${extId}/token/${extToken}/send-document/${ext}`;
            sendBody = { phone, document: payload.media_url, fileName: payload.file_name || `arquivo.${ext}` };
            break;
          }
          case "sticker":
            endpoint = `${baseUrl}/instances/${extId}/token/${extToken}/send-sticker`;
            sendBody = { phone, sticker: payload.media_url };
            break;
          default: // text
            endpoint = `${baseUrl}/instances/${extId}/token/${extToken}/send-text`;
            sendBody = { phone, message: payload.message || "" };
            break;
        }

        console.log(`[process-outbox] Sending ${contentType} to ${phone} via ${extId}`);

        const resp = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(sendBody),
        });
        const respData = await resp.json().catch(() => ({}));

        if (resp.ok) {
          const zapiMessageId = respData?.messageId || respData?.id?.id || null;

          await serviceClient.from("message_outbox").update({
            status: "sent",
            processed_at: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1,
          }).eq("id", item.id);

          // Update original message with Z-API message ID
          if (zapiMessageId) {
            await serviceClient.from("omni_mensagens")
              .update({ whatsapp_message_id: zapiMessageId, status_entrega: "sent" })
              .eq("id", item.mensagem_id);
          }

          processed++;
        } else {
          const errMsg = respData?.error || respData?.message || `HTTP ${resp.status}`;
          await serviceClient.from("message_outbox").update({
            status: (item.attempts || 0) >= 2 ? "failed" : "pending",
            error: errMsg,
            attempts: (item.attempts || 0) + 1,
          }).eq("id", item.id);
          errors++;
          console.warn(`[process-outbox] Send failed for ${item.id}:`, errMsg);
        }
      } catch (itemErr) {
        console.error(`[process-outbox] Error processing ${item.id}:`, itemErr);
        await serviceClient.from("message_outbox").update({
          status: "failed",
          error: String(itemErr),
          attempts: (item.attempts || 0) + 1,
        }).eq("id", item.id);
        errors++;
      }
    }

    console.log(`[process-outbox] Done: ${processed} sent, ${errors} errors`);
    return json({ ok: true, processed, errors, total: pending.length });
  } catch (err) {
    console.error("[process-outbox] Fatal:", err);
    return json({ ok: false, message: String(err) }, 500);
  }
});
