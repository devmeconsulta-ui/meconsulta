// WhatsApp Cloud API (Meta) - envio de mensagens (texto, mídia e templates)
import {
  GRAPH_BASE,
  admin,
  corsHeaders,
  json,
  loadConexao,
  normalizePhone,
  requireUser,
} from "../_shared/wacCommon.ts";

type Tipo = "text" | "image" | "document" | "audio" | "video" | "template";

interface Body {
  usuario_id?: string;
  clinica_id?: string | null;
  conexao_id?: string;
  to?: string;
  conversa_id?: string;
  tipo?: Tipo;
  texto?: string;
  link?: string;
  filename?: string;
  caption?: string;
  template_nome?: string;
  template_idioma?: string;
  template_componentes?: unknown[];
  enviado_por?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const db = admin();

    const auth = await requireUser(db, body.usuario_id, body.clinica_id ?? null);
    if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

    if (!body.conexao_id) return json({ ok: false, message: "conexao_id obrigatório" }, 400);
    const tipo: Tipo = body.tipo ?? "text";

    const creds = await loadConexao(db, body.conexao_id);
    if (!creds) return json({ ok: false, message: "Conexão não encontrada ou sem token" }, 404);

    // Resolve destinatário e conversa
    let conversaId = body.conversa_id ?? null;
    let destino = normalizePhone(body.to ?? "");

    if (conversaId) {
      const { data: conversa } = await db
        .from("wac_conversas")
        .select("id, conexao_id, contato_id, wac_contatos(wa_id)")
        .eq("id", conversaId)
        .maybeSingle();
      if (!conversa) return json({ ok: false, message: "Conversa não encontrada" }, 404);
      if (conversa.conexao_id !== creds.id) {
        return json({ ok: false, message: "A conversa pertence a outro número conectado" }, 400);
      }
      const contato = conversa.wac_contatos as unknown as { wa_id: string } | null;
      destino = contato?.wa_id ?? destino;
    }

    if (!destino) return json({ ok: false, message: "Informe o número de destino" }, 400);

    // Garante contato + conversa
    if (!conversaId) {
      const { data: contato } = await db
        .from("wac_contatos")
        .upsert(
          { conexao_id: creds.id, clinica_id: creds.clinica_id, wa_id: destino },
          { onConflict: "conexao_id,wa_id" },
        )
        .select("id")
        .single();

      const { data: conversa } = await db
        .from("wac_conversas")
        .upsert(
          { conexao_id: creds.id, contato_id: contato!.id, clinica_id: creds.clinica_id },
          { onConflict: "conexao_id,contato_id" },
        )
        .select("id")
        .single();
      conversaId = conversa!.id;
    }

    // Monta payload da Graph API
    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destino,
    };

    let conteudo = body.texto ?? body.caption ?? null;

    switch (tipo) {
      case "text":
        if (!body.texto) return json({ ok: false, message: "Texto obrigatório" }, 400);
        payload.type = "text";
        payload.text = { preview_url: true, body: body.texto };
        break;
      case "image":
      case "document":
      case "audio":
      case "video": {
        if (!body.link) return json({ ok: false, message: "Link da mídia obrigatório" }, 400);
        payload.type = tipo;
        const media: Record<string, unknown> = { link: body.link };
        if (tipo !== "audio" && body.caption) media.caption = body.caption;
        if (tipo === "document" && body.filename) media.filename = body.filename;
        payload[tipo] = media;
        conteudo = body.caption ?? body.filename ?? null;
        break;
      }
      case "template": {
        if (!body.template_nome) return json({ ok: false, message: "Nome do template obrigatório" }, 400);
        payload.type = "template";
        payload.template = {
          name: body.template_nome,
          language: { code: body.template_idioma ?? "pt_BR" },
          ...(body.template_componentes?.length ? { components: body.template_componentes } : {}),
        };
        conteudo = `[template] ${body.template_nome}`;
        break;
      }
      default:
        return json({ ok: false, message: `Tipo não suportado: ${tipo}` }, 400);
    }

    const res = await fetch(`${GRAPH_BASE}/${creds.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    const wamid: string | null = data?.messages?.[0]?.id ?? null;
    const erro = res.ok ? null : (data?.error?.message ?? `HTTP ${res.status}`);

    const { data: mensagem } = await db
      .from("wac_mensagens")
      .insert({
        conversa_id: conversaId,
        conexao_id: creds.id,
        wamid,
        direcao: "saida",
        tipo,
        conteudo,
        media_url: body.link ?? null,
        filename: body.filename ?? null,
        template_nome: body.template_nome ?? null,
        status: res.ok ? "enviado" : "falhou",
        erro,
        enviado_por: body.enviado_por ?? null,
        timestamp_meta: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (res.ok) {
      await db
        .from("wac_conversas")
        .update({
          ultima_mensagem: conteudo,
          ultima_mensagem_em: new Date().toISOString(),
        })
        .eq("id", conversaId);
    } else {
      await db.from("wac_eventos").insert({
        conexao_id: creds.id,
        mensagem_id: mensagem?.id ?? null,
        wamid,
        status: "falhou",
        erro_codigo: String(data?.error?.code ?? res.status),
        erro_mensagem: erro,
        payload: data,
      });
      console.error("[wac-send] falha no envio:", erro);
      return json({ ok: false, message: erro, conversa_id: conversaId }, 200);
    }

    return json({ ok: true, wamid, conversa_id: conversaId, mensagem_id: mensagem?.id ?? null });
  } catch (e) {
    console.error("[wac-send] erro:", e);
    return json({ ok: false, message: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
