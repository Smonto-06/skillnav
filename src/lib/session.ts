// Sesión basada en cookie firmada con HMAC (HU-02).
// Funciones puras (sin dependencias de Next) para poder probarlas con vitest.
// El manejo de la cookie en sí vive en auth.ts (usa next/headers).
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "skillnav_session";

/** Cuánto vale un token desde que se emite. */
export const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// Solo para desarrollo. Está en el repositorio público, así que cualquiera
// puede firmar cookies con ella: en producción es inaceptable, y por eso
// `secret()` se niega a usarla ahí.
const SECRETO_DESARROLLO = "dev-secret-inseguro-cambia-esto";

/**
 * Secreto para firmar la sesión.
 *
 * Antes, si `SESSION_SECRET` no estaba definida, la aplicación arrancaba igual
 * y firmaba con la constante de arriba. Como esa constante está publicada en
 * el repositorio, cualquiera podía fabricarse la cookie de cualquier cuenta
 * —incluida una ADMIN— y el único síntoma era ninguno. Una configuración que
 * falta no puede degradar en silencio hasta volverse un agujero.
 *
 * La misma comprobación corre durante el build (ver `next.config.mjs`), así
 * que un despliegue sin la variable falla antes de publicarse y el sitio que
 * ya estaba en línea sigue intacto. Esta de aquí es la segunda barrera.
 */
function secret(): string {
  const definido = process.env.SESSION_SECRET;
  if (definido) return definido;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Falta la variable de entorno SESSION_SECRET. Sin ella las sesiones se " +
        "firmarían con un secreto público y cualquiera podría suplantar una cuenta."
    );
  }
  return SECRETO_DESARROLLO;
}

function firmar(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Firma un token con el id del candidato: "<payload base64url>.<firma base64url>".
 *
 * `ahora` entra por parámetro para poder probar el vencimiento sin manipular
 * el reloj, igual que hace el motor de scoring.
 */
export function signSession(candidatoId: string, ahora: number = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ cid: candidatoId, exp: ahora + DURACION_SESION_MS })
  ).toString("base64url");
  return `${payload}.${firmar(payload)}`;
}

/**
 * Verifica el token y devuelve el candidatoId, o null si es inválido,
 * manipulado o está vencido.
 *
 * El vencimiento viaja dentro del payload firmado y se comprueba acá. El
 * `maxAge` de la cookie no servía para esto: es una instrucción al navegador,
 * así que una cookie copiada y vuelta a inyectar valía para siempre.
 */
export function verifySession(
  token: string | undefined | null,
  ahora: number = Date.now()
): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const a = Buffer.from(sig);
  const b = Buffer.from(firmar(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.cid !== "string" || !data.cid) return null;
    // Un token sin vencimiento es del formato anterior. Se rechaza: aceptarlo
    // dejaría viva justo la clase de token que no caduca nunca.
    if (typeof data.exp !== "number" || !Number.isFinite(data.exp)) return null;
    if (ahora >= data.exp) return null;
    return data.cid;
  } catch {
    return null;
  }
}
