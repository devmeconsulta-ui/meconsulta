import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/opus": "opus",
  "video/mp4": "mp4", "video/3gpp": "3gp",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

function getExtFromMime(mime: string | null, fallback = "bin"): string {
  if (!mime) return fallback;
  return MIME_TO_EXT[mime] || mime.split("/").pop() || fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const batchSize = body.batch_size || 20;

    // Fetch pending media messages
    const { data: pending, error: fetchErr } = await supabase
      .from("omni_mensagens")
      .select("id, media_original_url, media_mime, arquivo_nome, atendimento_id, whatsapp_message_id")
      .eq("media_status", "pending")
      .not("media_original_url", "is", null)
      .limit(batchSize);

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar mensagens pendentes", details: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "Nenhuma mídia pendente" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get clinica_id from atendimento for storage path
    const atendimentoIds = [...new Set(pending.map(m => m.atendimento_id))];
    const { data: atendimentos } = await supabase
      .from("omni_atendimentos")
      .select("id, clinica_id, contato_id")
      .in("id", atendimentoIds);

    const atendimentoMap = new Map(
      (atendimentos || []).map(a => [a.id, { clinica_id: a.clinica_id, contato_id: a.contato_id }])
    );

    let downloaded = 0;
    let errors = 0;

    for (const msg of pending) {
      try {
        const url = msg.media_original_url;
        if (!url) {
          await supabase.from("omni_mensagens").update({ media_status: "error" }).eq("id", msg.id);
          errors++;
          continue;
        }

        // Download the file
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`[MediaWorker] Download failed for ${msg.id}: HTTP ${response.status}`);
          await supabase.from("omni_mensagens").update({ media_status: "error" }).eq("id", msg.id);
          errors++;
          continue;
        }

        const contentType = response.headers.get("content-type") || msg.media_mime || "application/octet-stream";
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);

        // Build storage path: clinica_id/contato_id/message_id.ext
        const info = atendimentoMap.get(msg.atendimento_id);
        const clinicaId = info?.clinica_id || "unknown";
        const contatoId = info?.contato_id || "unknown";
        const ext = getExtFromMime(contentType);
        const msgIdShort = (msg.whatsapp_message_id || msg.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
        const storagePath = `${clinicaId}/${contatoId}/${msgIdShort}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from("omni-files")
          .upload(storagePath, fileBytes, {
            contentType,
            upsert: true,
          });

        if (uploadErr) {
          console.error(`[MediaWorker] Upload error for ${msg.id}:`, uploadErr);
          await supabase.from("omni_mensagens").update({ media_status: "error" }).eq("id", msg.id);
          errors++;
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage.from("omni-files").getPublicUrl(storagePath);

        // Update message with downloaded file info
        await supabase
          .from("omni_mensagens")
          .update({
            media_status: "downloaded",
            arquivo_url: publicUrlData.publicUrl,
            arquivo_tipo: contentType,
            arquivo_nome: msg.arquivo_nome || `${msgIdShort}.${ext}`,
            media_size: fileBytes.length,
            media_mime: contentType,
          })
          .eq("id", msg.id);

        downloaded++;
        console.log(`[MediaWorker] ✅ Downloaded ${storagePath} (${fileBytes.length} bytes)`);
      } catch (err) {
        console.error(`[MediaWorker] Error processing ${msg.id}:`, err);
        await supabase.from("omni_mensagens").update({ media_status: "error" }).eq("id", msg.id);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: pending.length, downloaded, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[MediaWorker] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
