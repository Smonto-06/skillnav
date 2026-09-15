import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("verifica correctamente una contraseña válida", () => {
    const stored = hashPassword("SuperSecreta123");
    expect(verifyPassword("SuperSecreta123", stored)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", () => {
    const stored = hashPassword("SuperSecreta123");
    expect(verifyPassword("otraClave", stored)).toBe(false);
  });

  it("genera un salt distinto por hash (no determinista)", () => {
    expect(hashPassword("misma")).not.toBe(hashPassword("misma"));
  });

  it("no rompe con un hash malformado", () => {
    expect(verifyPassword("x", "sin-formato")).toBe(false);
  });
});
