import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { canReadPhotos, canDeletePhotos, photoPath, tokenDigest, isSessionToken, IMAGE_TYPES, matchesImageType, type PhotoIdentity } from "../_shared/photo-session.ts";

const BUCKET = "prontuario-imagens";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-photo-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headers = { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories = new Set(["geral", "exame_fisico", "ferida", "exame_imagem", "evolucao", "documento"]);
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function check(error: unknown) { if (error) throw new Error("Database/storage operation failed"); }

async function identityFor(db: SupabaseClient, token: string): Promise<PhotoIdentity> {
  if (!isSessionToken(token)) throw new HttpError(401, "Entre novamente para acessar as fotos do prontuário.");
  const { data: session, error } = await db.from("prontuario_foto_sessoes").select("usuario_id, origem, senha_fingerprint, expires_at")
    .eq("token_hash", await tokenDigest(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  check(error);
  if (!session) throw new HttpError(401, "Sua sessão expirou. Entre novamente.");
  const source = session.origem;
  if (source !== "usuarios" && source !== "usuarios_clinica") throw new HttpError(401, "Sessão inválida.");
  const columns = source === "usuarios" ? "id, tipo, ativo, senha_hash, deve_trocar_senha" : "id, clinica_id, ativo, senha_hash, deve_trocar_senha";
  const { data: user, error: userError } = await db.from(source).select(columns).eq("id", session.usuario_id).maybeSingle();
  check(userError);
  // The two custom-login tables have different projections.
  const account = user as unknown as { id: string; tipo?: string; ativo: boolean; senha_hash: string; deve_trocar_senha: boolean; clinica_id?: string } | null;
  if (!account?.ativo || account.deve_trocar_senha || await tokenDigest(account.senha_hash) !== session.senha_fingerprint) throw new HttpError(401, "Entre novamente para acessar as fotos.");
  const identity: PhotoIdentity = { userId: account.id, source, tipo: account.tipo || "clinica", medicoId: null, clinicaId: null };
  if (source === "usuarios_clinica") identity.clinicaId = account.clinica_id || null;
  else if (account.tipo === "medico") {
    const { data, error } = await db.from("medicos").select("id").eq("usuario_id", account.id).maybeSingle();
    check(error); identity.medicoId = data?.id || null;
  } else if (account.tipo === "clinica") {
    const { data, error } = await db.from("clinicas").select("id").eq("usuario_id", account.id).maybeSingle();
    check(error); identity.clinicaId = data?.id || null;
  }
  if (!identity.medicoId && !identity.clinicaId) throw new HttpError(403, "Seu usuário não tem acesso às fotos.");
  return identity;
}

export function createPhotoHandler(db: SupabaseClient, projectUrl: string) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405, headers });
    try {
      const token = req.headers.get("x-photo-session") || "";
      const identity = await identityFor(db, token);
      const multipart = req.headers.get("content-type")?.includes("multipart/form-data");
      if (Number(req.headers.get("content-length") || 0) > 11 * 1024 * 1024) throw new HttpError(413, "Imagem muito grande. Máximo 10MB.");
      const form = multipart ? await req.formData() : null;
      const body = form ? Object.fromEntries(form.entries()) : await req.json();
      const action = body.action;
      if (action === "logout") {
        const { error } = await db.from("prontuario_foto_sessoes").delete().eq("token_hash", await tokenDigest(token));
        check(error);
        return new Response(JSON.stringify({ success: true }), { headers });
      }
      if (action === "consultas") {
        if (!identity.clinicaId) throw new HttpError(403, "Acesso exclusivo da clínica.");
        const page = Number(body.page ?? 0);
        if (!Number.isInteger(page) || page < 0 || page > 100000) throw new HttpError(400, "Página inválida.");
        const term = String(body.search || "").trim().slice(0, 100).replace(/[%_\\]/g, "");
        const { data: locais, error: localError } = await db.from("locais_atendimento").select("id").eq("clinica_id", identity.clinicaId);
        check(localError);
        const scope = [`clinica_id.eq.${identity.clinicaId}`];
        if (locais?.length) scope.push(`local_id.in.(${locais.map((local) => local.id).join(",")})`);
        let query = db.from("consultas").select("id, data_hora, medico_id, paciente_id, paciente:pacientes!inner(nome), medico:medicos!consultas_medico_id_fkey(nome)", { count: "exact" }).or(scope.join(","));
        if (term) query = query.ilike("paciente.nome", `%${term}%`);
        const { data, count, error } = await query.order("data_hora", { ascending: false }).order("id").range(page * 20, page * 20 + 19);
        check(error);
        return new Response(JSON.stringify({ consultas: data || [], count: count || 0 }), { headers });
      }

      const consultaId = String(body.consultaId || "");
      if (!uuid.test(consultaId)) throw new HttpError(400, "Consulta inválida.");
      const { data: consulta, error: consultaError } = await db.from("consultas")
        .select("id, medico_id, paciente_id, clinica_id, local:locais_atendimento(clinica_id)").eq("id", consultaId).maybeSingle();
      check(consultaError);
      // Missing and foreign consultations deliberately produce the same response.
      const accessConsulta = consulta && { ...consulta, local: Array.isArray(consulta.local) ? consulta.local[0] || null : consulta.local };
      if (!consulta || !accessConsulta || !canReadPhotos(identity, accessConsulta)) throw new HttpError(403, "Sem acesso às fotos desta consulta.");
      if (!consulta.medico_id || !consulta.paciente_id) throw new HttpError(400, "A consulta precisa de médico e paciente.");

      if (action === "list") {
        const { data, error } = await db.from("prontuario_imagens")
          .select("id, arquivo_url, arquivo_nome, legenda, categoria, created_at")
          .eq("consulta_id", consulta.id).eq("medico_id", consulta.medico_id).eq("paciente_id", consulta.paciente_id)
          .order("created_at", { ascending: false });
        check(error);
        const imagens = await Promise.all((data || []).map(async (image) => {
          const path = photoPath(image.arquivo_url, projectUrl, consulta.medico_id, consulta.id);
          const { data: signed, error } = await db.storage.from(BUCKET).createSignedUrl(path, 300);
          check(error);
          return { ...image, arquivo_url: signed!.signedUrl };
        }));
        return new Response(JSON.stringify({ imagens, canDelete: canDeletePhotos(identity, accessConsulta) }), { headers });
      }
      if (action === "upload") {
        const file = form?.get("file");
        const categoria = String(body.categoria || "geral");
        const legenda = String(body.legenda || "").trim();
        if (!(file instanceof File) || !IMAGE_TYPES[file.type] || file.size === 0 || file.size > 10 * 1024 * 1024 || !categories.has(categoria) || legenda.length > 200) throw new HttpError(400, "Envie uma imagem válida (JPG, PNG, WebP ou GIF) de até 10MB.");
        if (!matchesImageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()), file.type)) throw new HttpError(400, "O conteúdo do arquivo não corresponde ao tipo de imagem.");
        // Derive all associations from the authorized consultation, never the browser.
        const path = `${consulta.medico_id}/${consulta.id}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
        const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "0" });
        check(uploadError);
        const { error: insertError } = await db.from("prontuario_imagens").insert({
          consulta_id: consulta.id, medico_id: consulta.medico_id, paciente_id: consulta.paciente_id,
          arquivo_url: path, arquivo_nome: file.name.slice(0, 255), legenda: legenda || null, categoria,
        });
        if (insertError) { await db.storage.from(BUCKET).remove([path]); check(insertError); }
        return new Response(JSON.stringify({ success: true }), { headers });
      }
      if (action === "delete") {
        if (!canDeletePhotos(identity, accessConsulta)) throw new HttpError(403, "Somente o médico responsável pode excluir fotos.");
        if (!uuid.test(String(body.imageId || ""))) throw new HttpError(400, "Imagem inválida.");
        const { data: image, error } = await db.from("prontuario_imagens").select("id, arquivo_url")
          .eq("id", body.imageId).eq("consulta_id", consulta.id).eq("medico_id", consulta.medico_id).maybeSingle();
        check(error);
        if (!image) throw new HttpError(404, "Imagem não encontrada.");
        const path = photoPath(image.arquivo_url, projectUrl, consulta.medico_id, consulta.id);
        const { error: removeError } = await db.storage.from(BUCKET).remove([path]);
        check(removeError);
        const { error: deleteError } = await db.from("prontuario_imagens").delete().eq("id", image.id);
        check(deleteError);
        return new Response(JSON.stringify({ success: true }), { headers });
      }
      throw new HttpError(400, "Ação inválida.");
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Não foi possível concluir a operação com as fotos.";
      // Do not log request bodies, tokens, patient data or signed URLs.
      if (status === 500) console.error("Photo operation failed");
      return new Response(JSON.stringify({ error: message }), { status, headers });
    }
  };
}

if (import.meta.main) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  Deno.serve(createPhotoHandler(db, url));
}
