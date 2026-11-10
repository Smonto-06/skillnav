import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { createHmac } from "crypto";
import { DURACION_SESION_MS, signSession, verifySession } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "secreto-de-prueba";
});

describe("session", () => {
  it("firma y verifica un token, recuperando el candidatoId", () => {
    const token = signSession("cand_123");
    expect(verifySession(token)).toBe("cand_123");
  });

  it("rechaza un token manipulado", () => {
    const token = signSession("cand_123");
    const manipulado = token.slice(0, -2) + "xx";
    expect(verifySession(manipulado)).toBeNull();
  });

  it("rechaza tokens vacíos o mal formados", () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession("sinpunto")).toBeNull();
  });
});

describe("session · vencimiento", () => {
  const AHORA = Date.UTC(2026, 10, 10, 12, 0, 0);

  it("vale mientras no haya pasado la duración", () => {
    const token = signSession("cand_123", AHORA);
    expect(verifySession(token, AHORA)).toBe("cand_123");
    expect(verifySession(token, AHORA + DURACION_SESION_MS - 1000)).toBe("cand_123");
  });

  it("deja de valer al cumplirse la duración", () => {
    const token = signSession("cand_123", AHORA);
    expect(verifySession(token, AHORA + DURACION_SESION_MS)).toBeNull();
    expect(verifySession(token, AHORA + DURACION_SESION_MS + 1)).toBeNull();
  });

  it("el vencimiento lo decide el servidor, no el navegador", () => {
    // Una cookie copiada y vuelta a inyectar mucho despues no revive la
    // sesion: el `maxAge` de la cookie es una instruccion al navegador, pero
    // el `exp` viaja firmado dentro del token y se comprueba en el servidor.
    const token = signSession("cand_123", AHORA);
    expect(verifySession(token, AHORA + 365 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it("rechaza un token del formato anterior, sin vencimiento", () => {
    // Firmado a mano con la misma clave, pero con el payload viejo. Aceptarlo
    // dejaria viva justo la clase de token que no caduca nunca.
    const payload = Buffer.from(JSON.stringify({ cid: "cand_123" })).toString("base64url");
    const sig = createHmac("sha256", "secreto-de-prueba").update(payload).digest("base64url");
    expect(verifySession(`${payload}.${sig}`, AHORA)).toBeNull();
  });

  it("rechaza un vencimiento que no es un numero utilizable", () => {
    const falsos = [{ cid: "c", exp: "manana" }, { cid: "c", exp: null }, { cid: "c" }];
    for (const datos of falsos) {
      const payload = Buffer.from(JSON.stringify(datos)).toString("base64url");
      const sig = createHmac("sha256", "secreto-de-prueba").update(payload).digest("base64url");
      expect(verifySession(`${payload}.${sig}`, AHORA)).toBeNull();
    }
  });

  it("no acepta un candidatoId vacio aunque la firma sea valida", () => {
    const payload = Buffer.from(
      JSON.stringify({ cid: "", exp: AHORA + 1000 })
    ).toString("base64url");
    const sig = createHmac("sha256", "secreto-de-prueba").update(payload).digest("base64url");
    expect(verifySession(`${payload}.${sig}`, AHORA)).toBeNull();
  });
});

describe("session · secreto obligatorio en produccion", () => {
  const secretoOriginal = process.env.SESSION_SECRET;

  afterEach(() => {
    // NODE_ENV es de solo lectura para TypeScript, asi que se manipula con
    // stubEnv en vez de asignarlo a mano.
    vi.unstubAllEnvs();
    process.env.SESSION_SECRET = secretoOriginal;
  });

  it("falla en vez de firmar con el secreto publico del repositorio", () => {
    delete process.env.SESSION_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    expect(() => signSession("cand_123")).toThrow(/SESSION_SECRET/);
    expect(() => verifySession("a.b")).toThrow(/SESSION_SECRET/);
  });

  it("en desarrollo sigue funcionando sin configurar nada", () => {
    delete process.env.SESSION_SECRET;
    vi.stubEnv("NODE_ENV", "development");
    expect(verifySession(signSession("cand_123"))).toBe("cand_123");
  });
});
