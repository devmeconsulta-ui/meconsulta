// WhatsApp Cloud API (Meta) - administração de conexões
// Nunca retorna o token de acesso: apenas uma versão mascarada.
import { GRAPH_BASE, admin, corsHeaders, json, loadConexao, requireUser } from "../_shared/wacCommon.ts";
import { encryptToken, maskToken } from "../_shared/wacCrypto.ts";

interface Body {
  action?: string;
  usuario_id?: string;
  clinica_id?: string | null;
  conexao_id?: string;
  nome?: string;
  waba_id?: string;
  phone_number_id?: string;
  access_token?: string;
  verify_token?: string;
  ativo?: boolean;
}

function webhookUrl() {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  return `${base}/functions/v1/wac-webhook`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const action = body.action ?? "";
    const db = admin();

    const auth = await requireUser(db, body.usuario_id, body.clinica_id ?? null);
    if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status);

    switch (action) {
      case "list": {
        let query = db
          .from("wac_conexoes")
          .select(
            "id, clinica_id, nome, waba_id, phone_number_id, display_phone_number, verified_name, verify_token, status, ultimo_erro, ultimo_teste_em, token_atualizado_em, ativo, created_at",
          )
          .order("created_at", { ascending: true });
        if (body.clinica_id) query = query.eq("clinica_id", body.clinica_id);
        const { data, error } = await query;
        if (error) throw error;

        const ids = (data ?? []).map((c) => c.id);
        const tokenMap = new Map<string, boolean>();
        if (ids.length) {
          const { data: secrets } = await db
            .from("wac_conexoes_secrets")
            .select("conexao_id")
            .in("conexao_id", ids);
          for (const s of secrets ?? []) tokenMap.set(s.conexao_id, true);
        }

        return json({
          ok: true,
          webhook_url: webhookUrl(),
          conexoes: (data ?? []).map((c) => ({ ...c, tem_token: tokenMap.has(c.id) })),
        });
      }

      case "create": {
        if (!body.nome || !body.waba_id || !body.phone_number_id || !body.access_token) {
          return json({ ok: false, message: "Preencha nome, WABA ID, Phone Number ID e token de acesso" }, 400);
        }
        const verifyToken = body.verify_token?.trim() ||
          crypto.randomUUID().replace(/-/g, "");

        const { data: conexao, error } = await db
          .from("wac_conexoes")
          .insert({
            clinica_id: body.clinica_id ?? null,
            nome: body.nome.trim(),
            waba_id: body.waba_id.trim(),
            phone_number_id: body.phone_number_id.trim(),
            verify_token: verifyToken,
            status: "inativo",
            ativo: body.ativo ?? true,
          })
          .select("id")
          .single();
        if (error) {
          if ((error as { code?: string }).code === "23505") {
            return json({ ok: false, message: "Já existe uma conexão com este Phone Number ID" }, 409);
          }
          throw error;
        }

        await db.from("wac_conexoes_secrets").upsert({
          conexao_id: conexao.id,
          access_token_enc: await encryptToken(body.access_token.trim()),
        });
        await db
          .from("wac_conexoes")
          .update({ token_atualizado_em: new Date().toISOString() })
          .eq("id", conexao.id);

        return json({ ok: true, conexao_id: conexao.id, verify_token: verifyToken, webhook_url: webhookUrl() });
      }

      case "update": {
        if (!body.conexao_id) return json({ ok: false, message: "conexao_id obrigatório" }, 400);
        const patch: Record<string, unknown> = {};
        if (body.nome !== undefined) patch.nome = body.nome.trim();
        if (body.waba_id !== undefined) patch.waba_id = body.waba_id.trim();
        if (body.phone_number_id !== undefined) patch.phone_number_id = body.phone_number_id.trim();
        if (body.verify_token !== undefined && body.verify_token.trim()) {
          patch.verify_token = body.verify_token.trim();
        }
        if (body.ativo !== undefined) patch.ativo = body.ativo;

        if (Object.keys(patch).length) {
          const { error } = await db.from("wac_conexoes").update(patch).eq("id", body.conexao_id);
          if (error) throw error;
        }

        if (body.access_token && body.access_token.trim()) {
          await db.from("wac_conexoes_secrets").upsert({
            conexao_id: body.conexao_id,
            access_token_enc: await encryptToken(body.access_token.trim()),
          });
          await db
            .from("wac_conexoes")
            .update({ token_atualizado_em: new Date().toISOString() })
            .eq("id", body.conexao_id);
        }

        return json({ ok: true });
      }

      case "delete": {
        if (!body.conexao_id) return json({ ok: false, message: "conexao_id obrigatório" }, 400);
        const { error } = await db.from("wac_conexoes").delete().eq("id", body.conexao_id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "test": {
        if (!body.conexao_id) return json({ ok: false, message: "conexao_id obrigatório" }, 400);
        const creds = await loadConexao(db, body.conexao_id);
        if (!creds) return json({ ok: false, message: "Conexão sem token configurado" }, 404);

        const url =
          `${GRAPH_BASE}/${creds.phone_number_id}?fields=display_phone_number,verified_name,quality_rating,platform_type`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${creds.access_token}` } });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data?.error?.message ?? `Falha na Meta (HTTP ${res.status})`;
          await db
            .from("wac_conexoes")
            .update({ status: "erro", ultimo_erro: msg, ultimo_teste_em: new Date().toISOString() })
            .eq("id", creds.id);
          return json({ ok: false, message: msg }, 200);
        }

        await db
          .from("wac_conexoes")
          .update({
            status: "ativo",
            ultimo_erro: null,
            ultimo_teste_em: new Date().toISOString(),
            display_phone_number: data.display_phone_number ?? null,
            verified_name: data.verified_name ?? null,
          })
          .eq("id", creds.id);

        return json({
          ok: true,
          display_phone_number: data.display_phone_number ?? null,
          verified_name: data.verified_name ?? null,
          quality_rating: data.quality_rating ?? null,
          token_mascarado: maskToken(creds.access_token),
        });
      }

      case "templates": {
        if (!body.conexao_id) return json({ ok: false, message: "conexao_id obrigatório" }, 400);
        const creds = await loadConexao(db, body.conexao_id);
        if (!creds) return json({ ok: false, message: "Conexão sem token configurado" }, 404);
        const res = await fetch(
          `${GRAPH_BASE}/${creds.waba_id}/message_templates?limit=100&fields=name,status,language,category,components`,
          { headers: { Authorization: `Bearer ${creds.access_token}` } },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return json({ ok: false, message: data?.error?.message ?? "Falha ao buscar templates" }, 200);
        }
        return json({ ok: true, templates: data.data ?? [] });
      }

      default:
        return json({ ok: false, message: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[wac-admin] erro:", e);
    return json({ ok: false, message: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
