// WhatsApp Cloud API (Meta) - webhook de mensagens e status
// GET  -> verificação (hub.mode / hub.verify_token / hub.challenge)
// POST -> recebimento de mensagens e atualizações de status, validado por X-Hub-Signature-256
import { admin, corsHeaders } from "../_shared/wacCommon.ts";

const APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";
const GLOBAL_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";

async function validSignature(raw: string, header: string | null): Promise<boolean> {
  if (!APP_SECRET) {
    console.warn("[wac-webhook] META_APP_SECRET ausente - assinatura não verificada");
    return true;
  }
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
  const provided = header.slice(7);
  if (provided.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

function textoDaMensagem(m: Record<string, any>): string | null {
  switch (m.type) {
    case "text":
      return m.text?.body ?? null;
    case "button":
      return m.button?.text ?? null;
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null;
    case "image":
    case "video":
    case "document":
      return m[m.type]?.caption ?? m[m.type]?.filename ?? null;
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = admin();

  // ---- Verificação do webhook ----
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") ?? "";

    if (mode !== "subscribe" || !token) return new Response("Forbidden", { status: 403 });

    if (GLOBAL_VERIFY_TOKEN && token === GLOBAL_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    const { data } = await db
      .from("wac_conexoes")
      .select("id")
      .eq("verify_token", token)
      .maybeSingle();
    if (data) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) {
    console.warn("[wac-webhook] assinatura inválida");
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    const payload = JSON.parse(raw);

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const phoneNumberId: string | undefined = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const { data: conexao } = await db
          .from("wac_conexoes")
          .select("id, clinica_id")
          .eq("phone_number_id", phoneNumberId)
          .maybeSingle();
        if (!conexao) {
          console.warn("[wac-webhook] phone_number_id sem conexão cadastrada:", phoneNumberId);
          continue;
        }

        // ---- Mensagens recebidas ----
        for (const m of value.messages ?? []) {
          const waId: string = m.from;
          const perfil = (value.contacts ?? []).find((c: any) => c.wa_id === waId);

          const { data: contato } = await db
            .from("wac_contatos")
            .upsert(
              {
                conexao_id: conexao.id,
                clinica_id: conexao.clinica_id,
                wa_id: waId,
                nome: perfil?.profile?.name ?? null,
              },
              { onConflict: "conexao_id,wa_id" },
            )
            .select("id")
            .single();

          const agora = new Date();
          const { data: conversa } = await db
            .from("wac_conversas")
            .upsert(
              {
                conexao_id: conexao.id,
                contato_id: contato!.id,
                clinica_id: conexao.clinica_id,
                status: "aberta",
              },
              { onConflict: "conexao_id,contato_id" },
            )
            .select("id, nao_lidas")
            .single();

          const conteudo = textoDaMensagem(m);
          const mediaNode = m[m.type as string] ?? {};

          await db.from("wac_mensagens").upsert(
            {
              conversa_id: conversa!.id,
              conexao_id: conexao.id,
              wamid: m.id,
              direcao: "entrada",
              tipo: m.type ?? "text",
              conteudo,
              media_id: mediaNode?.id ?? null,
              media_mime: mediaNode?.mime_type ?? null,
              filename: mediaNode?.filename ?? null,
              status: "recebido",
              timestamp_meta: m.timestamp
                ? new Date(Number(m.timestamp) * 1000).toISOString()
                : agora.toISOString(),
            },
            { onConflict: "wamid" },
          );

          await db
            .from("wac_conversas")
            .update({
              ultima_mensagem: conteudo ?? `[${m.type}]`,
              ultima_mensagem_em: agora.toISOString(),
              nao_lidas: (conversa!.nao_lidas ?? 0) + 1,
              janela_expira_em: new Date(agora.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              status: "aberta",
            })
            .eq("id", conversa!.id);
        }

        // ---- Status de entrega ----
        for (const s of value.statuses ?? []) {
          const { data: mensagem } = await db
            .from("wac_mensagens")
            .select("id")
            .eq("wamid", s.id)
            .maybeSingle();

          const statusMap: Record<string, string> = {
            sent: "enviado",
            delivered: "entregue",
            read: "lido",
            failed: "falhou",
          };
          const status = statusMap[s.status] ?? s.status;

          if (mensagem) {
            await db
              .from("wac_mensagens")
              .update({
                status,
                erro: s.errors?.[0]?.title ?? null,
              })
              .eq("id", mensagem.id);
          }

          await db.from("wac_eventos").insert({
            conexao_id: conexao.id,
            mensagem_id: mensagem?.id ?? null,
            wamid: s.id,
            status,
            erro_codigo: s.errors?.[0]?.code ? String(s.errors[0].code) : null,
            erro_mensagem: s.errors?.[0]?.title ?? null,
            ocorrido_em: s.timestamp
              ? new Date(Number(s.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
            payload: s,
          });
        }
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (e) {
    console.error("[wac-webhook] erro:", e);
    // Sempre 200 para a Meta não reenfileirar indefinidamente.
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
});
