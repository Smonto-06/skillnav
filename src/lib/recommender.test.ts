import { describe, it, expect } from "vitest";
import { buildRecommendations, parseRequisitos } from "./recommender";

const perfil = {
  habilidades: ["React", "TypeScript"],
  salarioMin: 3000,
  salarioMax: 6000,
  modalidad: "REMOTO" as const,
  ciudad: "Medellin",
};

const vacantes = [
  {
    id: "v1",
    titulo: "Frontend",
    empresa: "Magneto",
    requisitos: "React, TypeScript",
    salario: 5000,
    modalidad: "REMOTO" as const,
    ciudad: "Medellin",
  },
  {
    id: "v2",
    titulo: "Backend",
    empresa: "Otra",
    requisitos: "Go, Kubernetes",
    salario: 5000,
    modalidad: "PRESENCIAL" as const,
    ciudad: "Bogota",
  },
];

describe("recommender", () => {
  it("parseRequisitos convierte texto a lista limpia", () => {
    expect(parseRequisitos("React, TypeScript ,, Node")).toEqual([
      "React",
      "TypeScript",
      "Node",
    ]);
    expect(parseRequisitos(null)).toEqual([]);
  });

  it("ordena las vacantes de mayor a menor score", () => {
    const recs = buildRecommendations(perfil, vacantes);
    expect(recs[0].vacante.id).toBe("v1");
    expect(recs[0].score).toBeGreaterThan(recs[1].score);
  });

  it("incluye el desglose explicable en cada recomendación", () => {
    const recs = buildRecommendations(perfil, vacantes);
    expect(recs[0].desglose).toHaveProperty("skills");
    expect(recs[0].desglose).toHaveProperty("modalidad");
  });
});
