// Sesión basada en cookie firmada con HMAC (HU-02).
// Funciones puras (sin dependencias de Next) para poder probarlas con vitest.
// El manejo de la cookie en sí vive en auth.ts (usa next/headers).
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "skillnav_session";

function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-inseguro-cambia-esto";
}

// Firma un token con el id del candidato: "<payload base64url>.<firma base64url>".
export function signSession(candidatoId: string): string {
  const payload = Buffer.from(JSON.stringify({ cid: candidatoId })).toString(
    "base64url"
  );
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

// Verifica el token y devuelve el candidatoId, o null si es inválido/manipulado.
export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.cid === "string" ? data.cid : null;
  } catch {
    return null;
  }
}
