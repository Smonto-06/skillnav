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

  it("descarta los trozos sin letras ni digitos", () => {
    // Un "React, -, Node" escrito a mano dejaba el guion como un requisito
    // mas, siempre incumplido, que hundia el promedio de la dimension con mas
    // peso del Match Score.
    expect(parseRequisitos("React, -, Node")).toEqual(["React", "Node"]);
    expect(parseRequisitos("React, ., , ?, Node")).toEqual(["React", "Node"]);
    expect(parseRequisitos(" , - , . ")).toEqual([]);
  });

  it("no descarta nombres legitimos con simbolos", () => {
    expect(parseRequisitos("C++, C#, .NET, Node.js")).toEqual(["C++", "C#", ".NET", "Node.js"]);
  });
});
