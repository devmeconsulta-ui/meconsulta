// AES-GCM encryption helpers for WhatsApp Cloud API access tokens.
// The key comes from the STORE_ENCRYPTION_KEY secret and never leaves the backend.

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("STORE_ENCRYPTION_KEY");
  if (!raw) throw new Error("STORE_ENCRYPTION_KEY not configured");
  // Derive a stable 256-bit key from whatever string was configured.
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function encryptToken(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)),
  );
  return `v1.${toB64(iv)}.${toB64(cipher)}`;
}

export async function decryptToken(stored: string): Promise<string> {
  const parts = stored.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("Formato de token inválido");
  const key = await getKey();
  const iv = fromB64(parts[1]);
  const cipher = fromB64(parts[2]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return dec.decode(plain);
}

export function maskToken(plain: string): string {
  if (!plain) return "";
  if (plain.length <= 8) return "••••";
  return `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
}
