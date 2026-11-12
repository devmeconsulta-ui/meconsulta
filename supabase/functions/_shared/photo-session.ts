// Opaque, revocable sessions for the application's existing custom login.
// Only the digest is stored; browsers cannot create/read session rows.
export async function tokenDigest(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isSessionToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

export interface PhotoIdentity {
  userId: string;
  source: "usuarios" | "usuarios_clinica";
  tipo: string;
  medicoId: string | null;
  clinicaId: string | null;
}

export interface PhotoConsulta {
  medico_id: string | null;
  clinica_id: string | null;
  local?: { clinica_id: string | null } | null;
}

export function canReadPhotos(identity: PhotoIdentity, consulta: PhotoConsulta): boolean {
  if (identity.source === "usuarios" && identity.tipo === "medico") {
    return !!identity.medicoId && identity.medicoId === consulta.medico_id;
  }
  return !!identity.clinicaId && (identity.clinicaId === consulta.clinica_id || identity.clinicaId === consulta.local?.clinica_id);
}

export function canDeletePhotos(identity: PhotoIdentity, consulta: PhotoConsulta): boolean {
  return identity.source === "usuarios" && identity.tipo === "medico" && !!identity.medicoId && identity.medicoId === consulta.medico_id;
}

// Accept the old persisted public URL only from this project's bucket. Never
// sign an arbitrary URL or a path belonging to a different consultation.
export function photoPath(value: string, projectUrl: string, medicoId: string, consultaId: string): string {
  let path = value;
  if (value.startsWith("https://")) {
    const url = new URL(value);
    const prefix = "/storage/v1/object/public/prontuario-imagens/";
    if (url.origin !== new URL(projectUrl).origin || !url.pathname.startsWith(prefix)) throw new Error("Invalid image path");
    path = decodeURIComponent(url.pathname.slice(prefix.length));
  }
  const parts = path.split("/");
  if (parts.length !== 3 || parts[0] !== medicoId || parts[1] !== consultaId || !parts[2] || /[\\?#]/.test(path) || parts.some((part) => part === "." || part === "..")) {
    throw new Error("Invalid image path");
  }
  return path;
}

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

// Check signatures as well as MIME types; SVG/HTML are deliberately excluded.
export function matchesImageType(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (mime === "image/gif") return ["GIF87a", "GIF89a"].includes(new TextDecoder().decode(bytes.slice(0, 6)));
  if (mime === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}
