import { describe, it, expect } from "vitest";
import { estadoOnboarding, type DatosOnboarding } from "./onboarding";

const vacio: DatosOnboarding = {
  habilidadesCount: 0,
  experienciaCount: 0,
  tienePreferencia: false,
};

describe("estadoOnboarding", () => {
  it("arranca en 0% con un candidato recien registrado", () => {
    const e = estadoOnboarding(vacio);
    expect(e.completados).toBe(0);
    expect(e.porcentaje).toBe(0);
    expect(e.terminado).toBe(false);
  });

  it("llega a 100% cuando se completa todo", () => {
    const e = estadoOnboarding({
      nombre: "Laura", titular: "Full Stack",
      habilidadesCount: 3, experienciaCount: 1, tienePreferencia: true,
    });
    expect(e.porcentaje).toBe(100);
    expect(e.terminado).toBe(true);
    expect(e.siguiente).toBeNull();
  });

  it("el primer paso exige nombre Y titular", () => {
    const soloNombre = estadoOnboarding({ ...vacio, nombre: "Laura" });
    expect(soloNombre.pasos[0].completo).toBe(false);
    const ambos = estadoOnboarding({ ...vacio, nombre: "Laura", titular: "Full Stack" });
    expect(ambos.pasos[0].completo).toBe(true);
  });

  it("no cuenta un nombre que es solo espacios", () => {
    const e = estadoOnboarding({ ...vacio, nombre: "   ", titular: "Full Stack" });
    expect(e.pasos[0].completo).toBe(false);
  });

  // Los pasos van por impacto en el Match Score, no por comodidad.
  it("ordena los pasos por cuanto pesan en el puntaje", () => {
    const e = estadoOnboarding(vacio);
    expect(e.pasos.map((p) => p.clave)).toEqual([
      "datos", "habilidades", "preferencias", "experiencia",
    ]);
  });

  // Si el candidato llena cosas fuera de orden, el wizard lo lleva a lo que
  // de verdad falta y no al siguiente del indice.
  it("senala el primer paso pendiente, no el siguiente en orden", () => {
    const e = estadoOnboarding({
      ...vacio, nombre: "Laura", titular: "Full Stack", tienePreferencia: true,
    });
    expect(e.siguiente?.clave).toBe("habilidades");
  });

  it("cada paso explica que gana el candidato, no solo que debe hacer", () => {
    for (const p of estadoOnboarding(vacio).pasos) {
      expect(p.porQue.length).toBeGreaterThan(20);
      expect(p.ruta).toMatch(/^\//);
    }
  });

  it("el porcentaje avanza de a un cuarto por paso", () => {
    expect(estadoOnboarding({ ...vacio, habilidadesCount: 1 }).porcentaje).toBe(25);
    expect(estadoOnboarding({ ...vacio, habilidadesCount: 1, tienePreferencia: true }).porcentaje).toBe(50);
  });
});
