import { describe, expect, it } from "vitest";
import {
  detalleVacante,
  estadoLabel,
  filtrarVacantes,
  resumenRequisitos,
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

describe("resumenRequisitos", () => {
  const r = (requisito: string, estado: "cumple" | "parcial" | "falta") => ({ requisito, estado });

  it("vacante sin requisitos", () => {
    expect(resumenRequisitos([])).toBe("Esta vacante no exige habilidades específicas.");
  });

  it("todos cumplidos", () => {
    expect(resumenRequisitos([r("Python", "cumple"), r("SQL", "cumple")])).toBe(
      "Cumples los 2 requisitos de la vacante."
    );
  });

  it("ninguno cumplido", () => {
    expect(resumenRequisitos([r("Python", "falta"), r("SQL", "falta")])).toBe(
      "Aún no hay coincidencias directas; esta vacante requiere Python, SQL."
    );
    expect(resumenRequisitos([r("SQL", "parcial"), r("Python", "falta")])).toBe(
      "Cubres en parte SQL; podrías fortalecer Python."
    );
  });

  it("mezcla de cumplidos, parciales y faltantes", () => {
    expect(resumenRequisitos([r("Node.js", "cumple"), r("PostgreSQL", "parcial"), r("Docker", "falta")])).toBe(
      "Cumples 1 de 3 requisitos; cubres en parte PostgreSQL; podrías fortalecer Docker."
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
