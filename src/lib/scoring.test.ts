import { describe, it, expect } from "vitest";
import { matchScore } from "./scoring";

describe("matchScore", () => {
  it("es determinista: mismos datos -> mismo score", () => {
    const perfil = {
      habilidades: ["React", "TypeScript"],
      salarioMin: 3000,
      salarioMax: 6000,
      modalidad: "REMOTO" as const,
      ciudad: "Medellin",
    };
    const vacante = {
      requisitos: ["React", "TypeScript"],
      salario: 5000,
      modalidad: "REMOTO" as const,
      ciudad: "Bogota",
    };
    const a = matchScore(perfil, vacante);
    const b = matchScore(perfil, vacante);
    expect(a.score).toBe(b.score);
  });

  it("da 100 cuando todo coincide", () => {
    const { score } = matchScore(
      {
        habilidades: ["React"],
        salarioMin: 1000,
        salarioMax: 9000,
        modalidad: "REMOTO",
        ciudad: "Medellin",
      },
      { requisitos: ["React"], salario: 5000, modalidad: "REMOTO", ciudad: "Medellin" }
    );
    expect(score).toBe(100);
  });

  it("penaliza cuando faltan skills", () => {
    const full = matchScore(
      { habilidades: ["React", "Node"], modalidad: "REMOTO" },
      { requisitos: ["React", "Node"], modalidad: "REMOTO" }
    );
    const partial = matchScore(
      { habilidades: ["React"], modalidad: "REMOTO" },
      { requisitos: ["React", "Node"], modalidad: "REMOTO" }
    );
    expect(partial.score).toBeLessThan(full.score);
  });

  it("modalidad distinta reduce el score", () => {
    const match = matchScore(
      { habilidades: ["React"], modalidad: "REMOTO" },
      { requisitos: ["React"], modalidad: "REMOTO" }
    );
    const mismatch = matchScore(
      { habilidades: ["React"], modalidad: "PRESENCIAL" },
      { requisitos: ["React"], modalidad: "REMOTO" }
    );
    expect(mismatch.score).toBeLessThan(match.score);
  });
});
