import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession } from "./session";

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
