import { describe, expect, it } from "vitest";
import { rutaInterna } from "./postulacion";

describe("rutaInterna", () => {
  it("acepta rutas internas", () => {
    expect(rutaInterna("/recomendaciones?ok=Postulado", "/x")).toBe("/recomendaciones?ok=Postulado");
  });

  it("rechaza destinos externos y usa el valor por defecto", () => {
    for (const malo of ["https://malicioso.com", "//malicioso.com", "/\\malicioso.com", "javascript:alert(1)", "", null]) {
      expect(rutaInterna(malo, "/postulaciones")).toBe("/postulaciones");
    }
  });
});
