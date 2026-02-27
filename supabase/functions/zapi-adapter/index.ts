import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_BASE = "https://api.z-api.io";

// ── Normalized Types ──
interface NormalizedChat {
  external_chat_id: string;
  contact_phone: string;
  contact_name: string;
  last_message_timestamp: number | null;
  is_group: boolean;
  unread_count: number;
  img_url: string | null;
}

interface NormalizedMessage {
  external_message_id: string;
  external_chat_id: string;
  from_me: boolean;
  timestamp: number;
  type: "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "contact" | "unknown";
  text: string;
  media_url: string | null;
  raw_payload: any;
}

interface ListChatsResponse {
  chats: NormalizedChat[];
  nextCursor: string | null;
}

interface ListMessagesResponse {
  messages: NormalizedMessage[];
  nextCursor: string | null;
}

// ── Fetch with retry ──
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("All retry attempts failed");
}

// ── Z-API Adapter: listChats ──
async function listChats(
  zapiInstanceId: string,
  zapiToken: string,
  clientToken: string,
  cursor?: string
): Promise<ListChatsResponse> {
  const page = cursor ? parseInt(cursor, 10) : 1;
  const pageSize = 20;

  const res = await fetchWithRetry(
    `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/chats?page=${page}&pageSize=${pageSize}`,
    { method: "GET", headers: { "Client-Token": clientToken } },
    2, 1000
  );

  const data = await res.json();
  const rawChats = Array.isArray(data) ? data : (data.chats || []);

  const chats: NormalizedChat[] = rawChats.map((c: any) => ({
    external_chat_id: c.id?._serialized || c.id || c.phone || "",
    contact_phone: (c.phone || "").replace(/\D/g, ""),
    contact_name: c.name || c.pushname || c.contact || (c.phone || "").replace(/\D/g, ""),
    last_message_timestamp: c.lastMessageTimestamp || c.timestamp || null,
    is_group: !!c.isGroup,
    unread_count: c.unreadCount || 0,
    img_url: c.imgUrl || c.profilePicUrl || null,
  }));

  const nextCursor = rawChats.length >= pageSize ? String(page + 1) : null;

  return { chats, nextCursor };
}

// ── Z-API Adapter: listMessages ──
async function listMessages(
  zapiInstanceId: string,
  zapiToken: string,
  clientToken: string,
  chatPhone: string,
  cursor?: string,
  sinceTimestamp?: number
): Promise<ListMessagesResponse> {
  const offset = cursor ? parseInt(cursor, 10) : 0;
  const amount = 100;

  const res = await fetchWithRetry(
    `${ZAPI_BASE}/instances/${zapiInstanceId}/token/${zapiToken}/chat-messages/${chatPhone}?amount=${amount}&offset=${offset}`,
    { method: "GET", headers: { "Client-Token": clientToken } },
    2, 1500
  );

  const data = await res.json();
  const rawMessages = Array.isArray(data) ? data : (data.messages || []);

  const messages: NormalizedMessage[] = [];
  for (const msg of rawMessages) {
    const n = normalizeMsg(msg, chatPhone);
    if (!n) continue;
    // Filter by sinceTimestamp if provided
    if (sinceTimestamp && n.timestamp < sinceTimestamp) continue;
    messages.push(n);
  }

  const nextCursor = rawMessages.length >= amount ? String(offset + rawMessages.length) : null;

  return { messages, nextCursor };
}

// ── Normalize a single Z-API message ──
function normalizeMsg(msg: any, chatPhone: string): NormalizedMessage | null {
  const id = msg.messageId || msg.id?.id || msg.id;
  if (!id) return null;

  let type: NormalizedMessage["type"] = "unknown";
  let text = "";
  let media_url: string | null = null;

  if (msg.text?.message) {
    type = "text";
    text = msg.text.message;
  } else if (msg.image) {
    type = "image";
    text = msg.image.caption || "";
    media_url = msg.image.imageUrl || msg.image.url || null;
  } else if (msg.audio) {
    type = "audio";
    text = "";
    media_url = msg.audio.audioUrl || msg.audio.url || null;
  } else if (msg.video) {
    type = "video";
    text = msg.video.caption || "";
    media_url = msg.video.videoUrl || msg.video.url || null;
  } else if (msg.document) {
    type = "document";
    text = msg.document.fileName || "";
    media_url = msg.document.documentUrl || msg.document.url || null;
  } else if (msg.sticker) {
    type = "sticker";
    media_url = msg.sticker.stickerUrl || msg.sticker.url || null;
  } else if (msg.location) {
    type = "location";
    text = `${msg.location.latitude},${msg.location.longitude}`;
  } else if (msg.contactMessage || msg.contactsArrayMessage) {
    type = "contact";
    text = msg.contactMessage?.displayName || "";
  } else if (msg.body || msg.caption) {
    type = "text";
    text = msg.body || msg.caption;
  } else {
    return null;
  }

  const timestamp = msg.timestamp
    ? (msg.timestamp > 1e12 ? Math.floor(msg.timestamp / 1000) : msg.timestamp)
    : Math.floor(Date.now() / 1000);

  return {
    external_message_id: id,
    external_chat_id: chatPhone,
    from_me: !!msg.fromMe,
    timestamp,
    type,
    text,
    media_url,
    raw_payload: msg,
  };
}

// ── HTTP Handler ──
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
        JSON.stringify({ error: "ZAPI_CLIENT_TOKEN não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { instancia_id, method, cursor, chat_phone, since_timestamp } = body;

    if (!instancia_id || !method) {
      return new Response(
        JSON.stringify({ error: "instancia_id e method são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch instance credentials
    const { data: inst, error: instErr } = await supabase
      .from("omni_instancias")
      .select("zapi_instance_id, zapi_token, provider")
      .eq("id", instancia_id)
      .single();

    if (instErr || !inst || inst.provider !== "zapi" || !inst.zapi_instance_id || !inst.zapi_token) {
      return new Response(
        JSON.stringify({ error: "Instância Z-API não encontrada ou sem credenciais" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── listChats ──
    if (method === "listChats") {
      const result = await listChats(inst.zapi_instance_id, inst.zapi_token, ZAPI_CLIENT_TOKEN, cursor);
      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── listMessages ──
    if (method === "listMessages") {
      if (!chat_phone) {
        return new Response(
          JSON.stringify({ error: "chat_phone é obrigatório para listMessages" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const result = await listMessages(
        inst.zapi_instance_id, inst.zapi_token, ZAPI_CLIENT_TOKEN,
        chat_phone, cursor, since_timestamp
      );
      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "method inválido. Use: listChats, listMessages" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[Z-API Adapter] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
