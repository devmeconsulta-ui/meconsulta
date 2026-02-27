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
    const { instancia_id } = await req.json();

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
        JSON.stringify({ error: "Instância não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (instancia.provider !== "zapi" || !instancia.zapi_instance_id || !instancia.zapi_token) {
      return new Response(
        JSON.stringify({ error: "Instância não é Z-API ou falta credenciais" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clinica_id = instancia.clinica_id;
    const zapiId = instancia.zapi_instance_id;
    const zapiToken = instancia.zapi_token;

    // Idempotency: skip if a sync completed successfully in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: recentSync } = await supabase
      .from("whatsapp_sync_jobs")
      .select("id, status, last_synced_at")
      .eq("instancia_id", instancia_id)
      .eq("status", "done")
      .gte("last_synced_at", sixHoursAgo)
      .limit(1)
      .single();

    if (recentSync) {
      console.log(`[Z-API Sync] Skipping - already synced at ${recentSync.last_synced_at}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Already synced recently", last_synced_at: recentSync.last_synced_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check if a sync is currently running
    const { data: runningSync } = await supabase
      .from("whatsapp_sync_jobs")
      .select("id")
      .eq("instancia_id", instancia_id)
      .eq("status", "running")
      .limit(1)
      .single();

    if (runningSync) {
      console.log(`[Z-API Sync] Skipping - sync already running`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Sync already running" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update or create sync job
    let { data: syncJob } = await supabase
      .from("whatsapp_sync_jobs")
      .select("*")
      .eq("instancia_id", instancia_id)
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!syncJob) {
      const { data: newJob } = await supabase
        .from("whatsapp_sync_jobs")
        .insert({ clinica_id, instancia_id, status: "running" })
        .select()
        .single();
      syncJob = newJob;
    } else {
      await supabase
        .from("whatsapp_sync_jobs")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", syncJob.id);
    }

    console.log(`[Z-API Sync] Starting history sync for instance ${instancia_id}`);

    // Get default queue
    const { data: defaultFila } = await supabase
      .from("omni_filas")
      .select("id, nome")
      .eq("instancia_id", instancia_id)
      .eq("ativo", true)
      .limit(1)
      .single();

    // 1. Get chats list from Z-API
    let allChats: any[] = [];
    let page = 1;
    const pageSize = 20;
    let hasMore = true;

    while (hasMore && page <= 10) { // Max 10 pages = 200 chats
      try {
        const chatsResponse = await fetchWithRetry(
          `${ZAPI_BASE}/instances/${zapiId}/token/${zapiToken}/chats?page=${page}&pageSize=${pageSize}`,
          {
            method: "GET",
            headers: { "Client-Token": ZAPI_CLIENT_TOKEN },
          },
          2,
          1000
        );

        const chatsData = await chatsResponse.json();
        const chats = Array.isArray(chatsData) ? chatsData : (chatsData.chats || []);
        
        if (chats.length === 0) {
          hasMore = false;
        } else {
          // Filter out groups
          const individualChats = chats.filter((c: any) => !c.isGroup && c.phone);
          allChats.push(...individualChats);
          page++;
          if (chats.length < pageSize) hasMore = false;
        }
      } catch (err) {
        console.error(`[Z-API Sync] Error fetching chats page ${page}:`, err);
        hasMore = false;
      }
    }

    console.log(`[Z-API Sync] Found ${allChats.length} individual chats`);

    if (syncJob) {
      await supabase
        .from("whatsapp_sync_jobs")
        .update({ total_count: allChats.length })
        .eq("id", syncJob.id);
    }

    let progressCount = 0;

    // 2. For each chat, get messages and import
    for (const chat of allChats) {
      const telefone = (chat.phone || "").replace(/\D/g, "");
      if (!telefone) continue;

      try {
        // Find or create contact
        let { data: contato } = await supabase
          .from("omni_contatos")
          .select("*")
          .eq("clinica_id", clinica_id)
          .eq("telefone", telefone)
          .single();

        if (!contato) {
          const contactName = chat.name || chat.pushname || telefone;
          const { data: novoContato, error: contatoError } = await supabase
            .from("omni_contatos")
            .insert({
              clinica_id,
              nome: contactName,
              telefone,
              foto_url: chat.imgUrl || null,
            })
            .select()
            .single();
          if (contatoError) {
            console.error(`[Z-API Sync] Error creating contact ${telefone}:`, contatoError);
            continue;
          }
          contato = novoContato;
        }

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
              fila_id: defaultFila?.id || null,
              status: "aguardando",
              canal: "whatsapp",
            })
            .select()
            .single();
          if (atError) {
            console.error(`[Z-API Sync] Error creating atendimento for ${telefone}:`, atError);
            continue;
          }
          atendimento = novoAtendimento;
        }

        // Get messages for this chat (last 50)
        const messagesResponse = await fetchWithRetry(
          `${ZAPI_BASE}/instances/${zapiId}/token/${zapiToken}/chat-messages/${telefone}?amount=50`,
          {
            method: "GET",
            headers: { "Client-Token": ZAPI_CLIENT_TOKEN },
          },
          2,
          1000
        );

        const messagesData = await messagesResponse.json();
        const messages = Array.isArray(messagesData) ? messagesData : (messagesData.messages || []);

        if (messages.length === 0) {
          progressCount++;
          continue;
        }

        // Prepare batch insert
        const messagesToInsert = [];
        for (const msg of messages) {
          const msgId = msg.messageId || msg.id;
          const isFromMe = msg.fromMe || false;

          let tipo = "texto";
          let conteudo = "";

          if (msg.text?.message) {
            conteudo = msg.text.message;
          } else if (msg.image) {
            tipo = "imagem";
            conteudo = msg.image.caption || "[Imagem]";
          } else if (msg.audio) {
            tipo = "audio";
            conteudo = "[Áudio]";
          } else if (msg.video) {
            tipo = "video";
            conteudo = msg.video.caption || "[Vídeo]";
          } else if (msg.document) {
            tipo = "documento";
            conteudo = msg.document.fileName || "[Documento]";
          } else if (msg.sticker) {
            tipo = "sticker";
            conteudo = "[Sticker]";
          } else if (msg.location) {
            tipo = "localizacao";
            conteudo = "[Localização]";
          } else if (msg.body || msg.caption) {
            conteudo = msg.body || msg.caption;
          } else {
            continue;
          }

          const createdAt = msg.mompiledMessage
            ? new Date(msg.mompiledMessage).toISOString()
            : msg.timestamp
            ? new Date(msg.timestamp * 1000).toISOString()
            : new Date().toISOString();

          messagesToInsert.push({
            atendimento_id: atendimento.id,
            contato_id: contato.id,
            tipo,
            direcao: isFromMe ? "saida" : "entrada",
            conteudo,
            whatsapp_message_id: msgId,
            status: "entregue",
            created_at: createdAt,
          });
        }

        if (messagesToInsert.length > 0) {
          const BATCH_SIZE = 100;
          for (let i = 0; i < messagesToInsert.length; i += BATCH_SIZE) {
            const batch = messagesToInsert.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase
              .from("omni_mensagens")
              .upsert(batch, { onConflict: "whatsapp_message_id", ignoreDuplicates: true });
            if (insertError) {
              console.error(`[Z-API Sync] Insert error for ${telefone}:`, insertError);
            }
          }
          console.log(`[Z-API Sync] Inserted ${messagesToInsert.length} messages for ${telefone}`);
        }

        progressCount++;

        // Update progress
        if (syncJob) {
          await supabase
            .from("whatsapp_sync_jobs")
            .update({
              progress_count: progressCount,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", syncJob.id);
        }
      } catch (chatErr) {
        console.error(`[Z-API Sync] Error processing chat ${telefone}:`, chatErr);
        progressCount++;
      }
    }

    // Mark sync as done
    if (syncJob) {
      await supabase
        .from("whatsapp_sync_jobs")
        .update({
          status: "done",
          progress_count: progressCount,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", syncJob.id);
    }

    console.log(`[Z-API Sync] Completed. ${progressCount}/${allChats.length} chats processed.`);

    return new Response(
      JSON.stringify({ success: true, chats_processed: progressCount, total_chats: allChats.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
