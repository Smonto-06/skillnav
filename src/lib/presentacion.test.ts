import { describe, expect, it } from "vitest";
import {
  coincidencias,
  detalleVacante,
  estadoLabel,
  explicarCoincidencias,
  filtrarVacantes,
} from "./presentacion";

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

describe("filtrarVacantes", () => {
  const vacantes = [
    { titulo: "Data Analyst", empresa: "Grupo Exito", requisitos: "Python, SQL", ciudad: "Medellin" },
    { titulo: "Frontend Developer", empresa: "Magneto", requisitos: "React", ciudad: "Bogota" },
  ];

  it("sin términos devuelve todo", () => {
    expect(filtrarVacantes(vacantes, "", "")).toHaveLength(2);
  });

  it("busca en cargo, empresa y requisitos sin distinguir mayúsculas", () => {
    expect(filtrarVacantes(vacantes, "python").map((v) => v.titulo)).toEqual(["Data Analyst"]);
    expect(filtrarVacantes(vacantes, "MAGNETO").map((v) => v.titulo)).toEqual(["Frontend Developer"]);
  });

  it("filtra por ciudad ignorando tildes", () => {
    expect(filtrarVacantes(vacantes, "", "Bogotá").map((v) => v.titulo)).toEqual([
      "Frontend Developer",
    ]);
  });
});
