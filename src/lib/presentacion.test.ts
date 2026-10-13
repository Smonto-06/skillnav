import { describe, expect, it } from "vitest";
import { coincidencias, detalleVacante, estadoLabel, explicarCoincidencias } from "./presentacion";

describe("detalleVacante", () => {
  it("arma la línea con modalidad legible, ciudad y salario", () => {
    expect(detalleVacante({ modalidad: "HIBRIDO", ciudad: "Medellin", salario: 3800 })).toBe(
      "Híbrido · Medellin · 3800 USD"
    );
  });

  it("omite los datos faltantes", () => {
    expect(detalleVacante({ modalidad: null, ciudad: "Bogota", salario: null })).toBe("Bogota");
  });
});

describe("coincidencias", () => {
  it("compara sin distinguir mayúsculas ni espacios", () => {
    expect(coincidencias([" react ", "SQL"], ["React", "TypeScript", "sql"])).toEqual({
      coinciden: ["React", "sql"],
      faltan: ["TypeScript"],
    });
  });
});

describe("explicarCoincidencias", () => {
  it("sin coincidencias lista lo que pide la vacante", () => {
    expect(explicarCoincidencias([], ["Python", "SQL"])).toBe(
      "Aún no hay coincidencias directas; esta vacante requiere Python, SQL."
    );
  });

  it("coincidencia parcial sugiere qué fortalecer", () => {
    expect(explicarCoincidencias(["React"], ["React", "Tailwind"])).toBe(
      "Coincides en React; podrías fortalecer Tailwind."
    );
  });

  it("coincidencia total", () => {
    expect(explicarCoincidencias(["Python", "SQL"], ["Python", "SQL"])).toBe(
      "Cumples todos los requisitos: Python, SQL."
    );
  });

  it("vacante sin requisitos", () => {
    expect(explicarCoincidencias(["React"], [])).toBe(
      "Esta vacante no exige habilidades específicas."
    );
  });
});

describe("estadoLabel", () => {
  it("traduce el estado de BD al texto del candidato", () => {
    expect(estadoLabel("DESCARTADO")).toBe("Rechazada");
    expect(estadoLabel("POSTULADO")).toBe("Enviada");
  });
});
