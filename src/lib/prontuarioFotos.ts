import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "meconsulta_photo_session";
export interface PhotoSession { token: string; expiresAt: string }
export interface ProntuarioImagem {
  id: string;
  arquivo_url: string;
  arquivo_nome: string | null;
  legenda: string | null;
  categoria: string;
  created_at: string;
}
export interface PhotoConsulta {
  id: string;
  data_hora: string;
  medico_id: string;
  paciente_id: string;
  paciente: { nome: string };
  medico: { nome: string } | null;
}

export function savePhotoSession(session?: PhotoSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function readSession(): PhotoSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

export function photoSessionHeaders(): Record<string, string> {
  const session = readSession();
  return session?.token ? { "x-photo-session": session.token } : {};
}

export async function photoRequest<T>(body: Record<string, unknown> | FormData): Promise<T> {
  const session = readSession();
  if (!session?.token || Date.parse(session.expiresAt) <= Date.now()) {
    throw new Error("Entre novamente para acessar as fotos do prontuário.");
  }
  const { data, error } = await supabase.functions.invoke("prontuario-fotos", {
    body, headers: { "x-photo-session": session.token },
  });
  if (error) {
    let message = "Não foi possível acessar as fotos. Tente novamente.";
    if (error.context instanceof Response) {
      try { message = (await error.context.json()).error || message; } catch { /* network/gateway response */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function clearPhotoSession() {
  const session = readSession();
  savePhotoSession(null);
  if (session?.token) {
    void supabase.functions.invoke("prontuario-fotos", {
      body: { action: "logout" }, headers: { "x-photo-session": session.token },
    }).catch(() => { /* Session also has a fixed server-side expiry. */ });
  }
}
