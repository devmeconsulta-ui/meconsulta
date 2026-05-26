import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_BASE = "https://api.z-api.io";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1}/${retries} failed:`, error instanceof Error ? error.message : error);
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("All retry attempts failed");
}

// ── startHistoryImport: creates/validates a sync job (idempotent) ──
async function startHistoryImport(
  supabase: any,
  clinica_id: string,
  instancia_id: string,
  days_back: number
): Promise<{ job_id: string | null; skipped: boolean; reason?: string }> {
  // Check for running/queued jobs for the same instance
  const { data: existingJob } = await supabase
    .from("whatsapp_sync_jobs")
    .select("id, status")
    .eq("instancia_id", instancia_id)
    .in("status", ["queued", "running"])
    .limit(1)
    .single();

  if (existingJob) {
    return { job_id: existingJob.id, skipped: true, reason: `Job already ${existingJob.status}` };
  }

  // Check if completed recently (6h cooldown)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: recentDone } = await supabase
    .from("whatsapp_sync_jobs")
    .select("id, last_synced_at")
    .eq("instancia_id", instancia_id)
    .eq("status", "done")
    .gte("last_synced_at", sixHoursAgo)
    .limit(1)
    .single();

  if (recentDone) {
    return { job_id: recentDone.id, skipped: true, reason: `Already synced at ${recentDone.last_synced_at}` };
  }

  // Create new job
  const { data: newJob, error } = await supabase
    .from("whatsapp_sync_jobs")
    .insert({
      clinica_id,
      instancia_id,
      provider: "zapi",
      job_type: "history_import",
      status: "queued",
      days_back,
      cursor_json: { chat_page: 1, chats: [], current_chat_index: 0 },
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create sync job: ${error.message}`);
  return { job_id: newJob.id, skipped: false };
}

// ── Normalize Z-API message into our internal format (with lazy media) ──
function normalizeMessage(msg: any, atendimento_id: string, contato_id: string): any | null {
  const msgId = msg.messageId || msg.id?.id || msg.id;
  if (!msgId) return null;

  const isFromMe = msg.fromMe || false;
  let tipo = "texto";
  let conteudo = "";
  let media_url: string | null = null;
  let media_mime: string | null = null;
  let arquivo_nome: string | null = null;

  if (msg.text?.message) {
    conteudo = msg.text.message;
  } else if (msg.image) {
    tipo = "imagem";
    conteudo = msg.image.caption || "[Imagem]";
    media_url = msg.image.imageUrl || msg.image.url || null;
    media_mime = msg.image.mimetype || "image/jpeg";
  } else if (msg.audio) {
    tipo = "audio";
    conteudo = "[Áudio]";
    media_url = msg.audio.audioUrl || msg.audio.url || null;
    media_mime = msg.audio.mimetype || "audio/ogg";
  } else if (msg.video) {
    tipo = "video";
    conteudo = msg.video.caption || "[Vídeo]";
    media_url = msg.video.videoUrl || msg.video.url || null;
    media_mime = msg.video.mimetype || "video/mp4";
  } else if (msg.document) {
    tipo = "documento";
    conteudo = msg.document.fileName || "[Documento]";
    arquivo_nome = msg.document.fileName || null;
    media_url = msg.document.documentUrl || msg.document.url || null;
    media_mime = msg.document.mimetype || "application/octet-stream";
  } else if (msg.sticker) {
    tipo = "sticker";
    conteudo = "[Sticker]";
    media_url = msg.sticker.stickerUrl || msg.sticker.url || null;
    media_mime = msg.sticker.mimetype || "image/webp";
  } else if (msg.location) {
    tipo = "localizacao";
    conteudo = `[Localização: ${msg.location.latitude},${msg.location.longitude}]`;
  } else if (msg.body || msg.caption) {
    conteudo = msg.body || msg.caption;
  } else {
    return null;
  }

  let createdAt: string;
  if (msg.timestamp) {
    createdAt = new Date(msg.timestamp * 1000).toISOString();
  } else if (msg.mompiledMessage) {
    createdAt = new Date(msg.mompiledMessage).toISOString();
  } else {
    createdAt = new Date().toISOString();
  }

  const hasMedia = !!media_url;

  return {
    atendimento_id,
    contato_id,
    tipo,
    direcao: isFromMe ? "saida" : "entrada",
    conteudo,
    whatsapp_message_id: msgId,
    status: "entregue",
    created_at: createdAt,
    // Media fields: save metadata, mark as pending for lazy download
    media_original_url: media_url,
    media_status: hasMedia ? "pending" : null,
    media_mime,
    arquivo_nome,
  };
}

// ── runHistoryImport: the worker that processes a job incrementally ──
async function runHistoryImport(
  supabase: any,
  job: any,
  instancia: any,
  zapiClientToken: string
) {
  const zapiId = instancia.zapi_instance_id;
  const zapiToken = instancia.zapi_token;
  const clinica_id = instancia.clinica_id;
  const daysBack = job.days_back || 30;
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  // Mark as running
  await supabase
    .from("whatsapp_sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", job.id);

  // Restore cursor state
  let cursor = job.cursor_json || { chat_page: 1, chats: [], current_chat_index: 0 };
  let chatsDone = job.progress_chats_done || 0;
  let messagesDone = job.progress_messages_done || 0;

  // Get default queue
  const { data: defaultFila } = await supabase
    .from("omni_filas")
    .select("id")
    .eq("instancia_id", job.instancia_id)
    .eq("ativo", true)
    .limit(1)
    .single();

  // ── Phase 1: Fetch chat list (if not already fetched) ──
  if (!cursor.chats || cursor.chats.length === 0) {
    console.log(`[Sync ${job.id}] Phase 1: Fetching chat list...`);
    let allChats: any[] = [];
    let page = cursor.chat_page || 1;
    const pageSize = 20;
    let hasMore = true;

    while (hasMore && page <= 25) {
      try {
        const res = await fetchWithRetry(
          `${ZAPI_BASE}/instances/${zapiId}/token/${zapiToken}/chats?page=${page}&pageSize=${pageSize}`,
          { method: "GET", headers: { "Client-Token": zapiClientToken } },
          2, 1000
        );
        const data = await res.json();
        const chats = Array.isArray(data) ? data : (data.chats || []);

        if (chats.length === 0) {
          hasMore = false;
        } else {
          const individual = chats.filter((c: any) => !c.isGroup && c.phone);
          allChats.push(...individual.map((c: any) => ({
            phone: (c.phone || "").replace(/\D/g, ""),
            name: c.name || c.pushname || (c.phone || "").replace(/\D/g, ""),
            imgUrl: c.imgUrl || null,
          })));
          page++;
          if (chats.length < pageSize) hasMore = false;
        }

        // Save cursor after each page
        cursor.chat_page = page;
        cursor.chats = allChats;
        await saveCursor(supabase, job.id, cursor, { progress_chats_total: allChats.length });
      } catch (err) {
        console.error(`[Sync ${job.id}] Error fetching chats page ${page}:`, err);
        hasMore = false;
      }
    }

    cursor.chats = allChats;
    cursor.current_chat_index = 0;
    await saveCursor(supabase, job.id, cursor, { progress_chats_total: allChats.length });
    console.log(`[Sync ${job.id}] Found ${allChats.length} individual chats`);
  }

  const totalChats = cursor.chats.length;

  // ── Phase 2: Process each chat from cursor position ──
  for (let i = cursor.current_chat_index; i < totalChats; i++) {
    const chat = cursor.chats[i];
    const telefone = chat.phone;
    if (!telefone) { chatsDone++; continue; }

    try {
      // Find or create contact
      let { data: contato } = await supabase
        .from("omni_contatos")
        .select("id")
        .eq("clinica_id", clinica_id)
        .eq("telefone", telefone)
        .single();

      if (!contato) {
        const { data: novo, error: cErr } = await supabase
          .from("omni_contatos")
          .insert({ clinica_id, nome: chat.name || telefone, telefone, foto_url: chat.imgUrl })
          .select("id")
          .single();
        if (cErr) { console.error(`[Sync] Contact error ${telefone}:`, cErr); chatsDone++; continue; }
        contato = novo;
      }

      // Find or create atendimento
      let { data: atendimento } = await supabase
        .from("omni_atendimentos")
        .select("id")
        .eq("clinica_id", clinica_id)
        .eq("contato_id", contato.id)
        .in("status", ["aguardando", "em_atendimento"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!atendimento) {
        const { data: novo, error: aErr } = await supabase
          .from("omni_atendimentos")
          .insert({ clinica_id, contato_id: contato.id, fila_id: defaultFila?.id || null, status: "aguardando", canal: "whatsapp" })
          .select("id")
          .single();
        if (aErr) { console.error(`[Sync] Atendimento error ${telefone}:`, aErr); chatsDone++; continue; }
        atendimento = novo;
      }

      // Fetch messages with pagination (newest → oldest, stop at cutoff)
      let msgOffset = cursor.current_msg_offset || 0;
      let keepFetching = true;
      const AMOUNT_PER_PAGE = 100;

      while (keepFetching) {
        try {
          const msgRes = await fetchWithRetry(
            `${ZAPI_BASE}/instances/${zapiId}/token/${zapiToken}/chat-messages/${telefone}?amount=${AMOUNT_PER_PAGE}&offset=${msgOffset}`,
            { method: "GET", headers: { "Client-Token": zapiClientToken } },
            2, 1500
          );
          const msgData = await msgRes.json();
          const messages = Array.isArray(msgData) ? msgData : (msgData.messages || []);

          if (messages.length === 0) {
            keepFetching = false;
            break;
          }

          // Normalize and filter by cutoff date
          const normalized: any[] = [];
          let hitCutoff = false;

          for (const msg of messages) {
            const n = normalizeMessage(msg, atendimento.id, contato.id);
            if (!n) continue;

            const msgDate = new Date(n.created_at);
            if (msgDate < cutoffDate) {
              hitCutoff = true;
              break;
            }
            // Media fields are now saved as metadata (media_original_url, media_status, media_mime)
            normalized.push(n);
          }

          // Batch upsert
          if (normalized.length > 0) {
            const BATCH = 100;
            for (let b = 0; b < normalized.length; b += BATCH) {
              const batch = normalized.slice(b, b + BATCH);
              const { error: insertErr } = await supabase
                .from("omni_mensagens")
                .upsert(batch, { onConflict: "whatsapp_message_id", ignoreDuplicates: true });
              if (insertErr) console.error(`[Sync] Insert error ${telefone}:`, insertErr);
            }
            messagesDone += normalized.length;
          }

          msgOffset += messages.length;

          // Save progress per message page
          cursor.current_msg_offset = msgOffset;
          await saveCursor(supabase, job.id, cursor, {
            progress_chats_done: chatsDone,
            progress_messages_done: messagesDone,
            last_synced_at: new Date().toISOString(),
          });

          if (hitCutoff || messages.length < AMOUNT_PER_PAGE) {
            keepFetching = false;
          }
        } catch (msgErr) {
          console.error(`[Sync] Msg fetch error ${telefone} offset ${msgOffset}:`, msgErr);
          keepFetching = false;
        }
      }

      chatsDone++;
      // Reset msg offset for next chat
      cursor.current_msg_offset = 0;
      cursor.current_chat_index = i + 1;
      await saveCursor(supabase, job.id, cursor, {
        progress_chats_done: chatsDone,
        progress_messages_done: messagesDone,
        last_synced_at: new Date().toISOString(),
      });

      console.log(`[Sync ${job.id}] Chat ${chatsDone}/${totalChats} done (${telefone}, ${messagesDone} msgs total)`);
    } catch (chatErr) {
      console.error(`[Sync] Chat error ${telefone}:`, chatErr);
      chatsDone++;
      cursor.current_chat_index = i + 1;
      cursor.current_msg_offset = 0;
      await saveCursor(supabase, job.id, cursor, {
        progress_chats_done: chatsDone,
        last_error: chatErr instanceof Error ? chatErr.message : String(chatErr),
      });
    }
  }

  // Mark as done
  await supabase
    .from("whatsapp_sync_jobs")
    .update({
      status: "done",
      finished_at: new Date().toISOString(),
      progress_chats_done: chatsDone,
      progress_messages_done: messagesDone,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", job.id);

  console.log(`[Sync ${job.id}] ✅ Completed. ${chatsDone}/${totalChats} chats, ${messagesDone} messages.`);
  return { chats_done: chatsDone, chats_total: totalChats, messages_done: messagesDone };
}

// ── Helper: persist cursor + optional extra fields ──
async function saveCursor(supabase: any, jobId: string, cursor: any, extra: Record<string, any> = {}) {
  await supabase
    .from("whatsapp_sync_jobs")
    .update({ cursor_json: cursor, updated_at: new Date().toISOString(), ...extra })
    .eq("id", jobId);
}

// ── HTTP handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ZAPI_CLIENT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Z-API Client Token não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { instancia_id, days_back = 30, action = "start" } = body;

    if (!instancia_id) {
      return new Response(
        JSON.stringify({ error: "instancia_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch instance
    const { data: instancia, error: fetchError } = await supabase
      .from("omni_instancias")
      .select("*")
      .eq("id", instancia_id)
      .single();

    if (fetchError || !instancia) {
      return new Response(
        JSON.stringify({ success: false, not_found: true, error: "Instância não encontrada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (instancia.provider !== "zapi" || !instancia.zapi_instance_id || !instancia.zapi_token) {
      // Evolution (ou sem credenciais legadas) não suporta importação retroativa via este endpoint.
      // Mensagens novas chegam em tempo real pelo webhook-receiver.
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          provider: instancia.provider,
          message: "Importação de histórico não disponível para esta instância. As mensagens novas serão recebidas automaticamente em tempo real.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: start (create job + run) ──
    if (action === "start") {
      const { job_id, skipped, reason } = await startHistoryImport(
        supabase, instancia.clinica_id, instancia_id, days_back
      );

      if (skipped) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason, job_id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch the created job and run the worker
      const { data: job } = await supabase
        .from("whatsapp_sync_jobs")
        .select("*")
        .eq("id", job_id)
        .single();

      const result = await runHistoryImport(supabase, job, instancia, ZAPI_CLIENT_TOKEN);

      return new Response(
        JSON.stringify({ success: true, job_id, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: resume (pick up a paused/error job) ──
    if (action === "resume") {
      const { data: job } = await supabase
        .from("whatsapp_sync_jobs")
        .select("*")
        .eq("instancia_id", instancia_id)
        .in("status", ["error", "paused", "queued"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ error: "Nenhum job para retomar" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await runHistoryImport(supabase, job, instancia, ZAPI_CLIENT_TOKEN);

      return new Response(
        JSON.stringify({ success: true, job_id: job.id, resumed: true, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: status (check progress) ──
    if (action === "status") {
      const { data: job } = await supabase
        .from("whatsapp_sync_jobs")
        .select("id, status, progress_chats_total, progress_chats_done, progress_messages_done, started_at, finished_at, last_error, last_synced_at, days_back")
        .eq("instancia_id", instancia_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return new Response(
        JSON.stringify({ success: true, job: job || null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "action inválida. Use: start, resume, status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[Z-API Sync] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
