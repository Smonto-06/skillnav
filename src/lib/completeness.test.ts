import { describe, it, expect } from "vitest";
import { completitud } from "./completeness";

const vacio = {
  nombre: null,
  ciudad: null,
  contacto: null,
  educacionCount: 0,
  experienciaCount: 0,
  habilidadesCount: 0,
  tienePreferencia: false,
};

describe("completitud", () => {
  it("perfil vacío = 0%", () => {
    expect(completitud(vacio).porcentaje).toBe(0);
  });

  it("perfil completo = 100% y sin faltantes", () => {
    const r = completitud({
      nombre: "Ana",
      ciudad: "Medellín",
      contacto: "ana@mail.com",
      educacionCount: 1,
      experienciaCount: 2,
      habilidadesCount: 3,
      tienePreferencia: true,
    });
    expect(r.porcentaje).toBe(100);
    expect(r.faltantes).toHaveLength(0);
  });

  it("reporta las secciones faltantes", () => {
    const r = completitud({ ...vacio, nombre: "Ana" });
    expect(r.porcentaje).toBeGreaterThan(0);
    expect(r.porcentaje).toBeLessThan(100);
    expect(r.faltantes).toContain("Educación");
  });
});
