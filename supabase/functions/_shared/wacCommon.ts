import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "./wacCrypto.ts";

export const GRAPH_VERSION = "v21.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

/**
 * The project uses a custom authentication layer (public.usuarios + usuarios_clinica),
 * so administrative calls must carry the acting user id and, when applicable, the clinic id.
 */
export async function requireUser(
  db: SupabaseClient,
  usuarioId?: string | null,
  clinicaId?: string | null,
): Promise<{ ok: true; tipo: string } | { ok: false; status: number; message: string }> {
  if (!usuarioId) return { ok: false, status: 401, message: "Não autenticado" };

  const { data: usuario } = await db
    .from("usuarios")
    .select("id, tipo, ativo")
    .eq("id", usuarioId)
    .maybeSingle();

  // Funcionários da clínica ficam em usuarios_clinica (id próprio, sem linha em usuarios)
  if (!usuario) {
    const { data: staff } = await db
      .from("usuarios_clinica")
      .select("id, clinica_id, ativo")
      .eq("id", usuarioId)
      .maybeSingle();
    if (!staff || staff.ativo === false) return { ok: false, status: 401, message: "Usuário inválido" };
    if (clinicaId && staff.clinica_id !== clinicaId) {
      return { ok: false, status: 403, message: "Sem permissão para esta clínica" };
    }
    return { ok: true, tipo: "staff" };
  }

  if (usuario.ativo === false) return { ok: false, status: 401, message: "Usuário inválido" };
  if (usuario.tipo === "admin") return { ok: true, tipo: "admin" };

  if (clinicaId) {
    const { data: clinica } = await db
      .from("clinicas")
      .select("id")
      .eq("id", clinicaId)
      .eq("usuario_id", usuarioId)
      .maybeSingle();
    if (clinica) return { ok: true, tipo: "clinica" };
    return { ok: false, status: 403, message: "Sem permissão para esta clínica" };
  }

  return { ok: true, tipo: usuario.tipo ?? "usuario" };
}

export interface ConexaoCreds {
  id: string;
  clinica_id: string | null;
  nome: string;
  waba_id: string;
  phone_number_id: string;
  access_token: string;
}

export async function loadConexao(
  db: SupabaseClient,
  conexaoId: string,
): Promise<ConexaoCreds | null> {
  const { data: conexao } = await db
    .from("wac_conexoes")
    .select("id, clinica_id, nome, waba_id, phone_number_id, ativo")
    .eq("id", conexaoId)
    .maybeSingle();
  if (!conexao) return null;

  const { data: secret } = await db
    .from("wac_conexoes_secrets")
    .select("access_token_enc")
    .eq("conexao_id", conexaoId)
    .maybeSingle();
  if (!secret?.access_token_enc) return null;

  return {
    id: conexao.id,
    clinica_id: conexao.clinica_id,
    nome: conexao.nome,
    waba_id: conexao.waba_id,
    phone_number_id: conexao.phone_number_id,
    access_token: await decryptToken(secret.access_token_enc),
  };
}

export function normalizePhone(input: string): string {
  let digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  // Brazilian numbers typed without country code.
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}
