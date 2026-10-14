import { describe, it, expect } from "vitest";
import { factorDominio, matchScore } from "./scoring";

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
        habilidades: [{ nombre: "React", nivel: "EXPERTO" }],
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

const AHORA = new Date(Date.UTC(2026, 9, 1));
const hace = (anios: number) => new Date(AHORA.getTime() - anios * 365.25 * 24 * 3600 * 1000);
const evaluar = (perfil: Parameters<typeof matchScore>[0], vacante: Parameters<typeof matchScore>[1]) =>
  matchScore(perfil, vacante, undefined, AHORA);

describe("matchScore · caso del monitor: Full Stack frente a vacante Backend", () => {
  const fullStack = {
    titular: "Desarrollador Full Stack",
    habilidades: [{ nombre: "Node.js", nivel: "AVANZADO" as const }, { nombre: "React" }],
  };

  it("el rol Full Stack cubre por completo una vacante Backend", () => {
    const r = evaluar(fullStack, { titulo: "Backend Developer", requisitos: [] });
    expect(r.desglose.rol).toBe(1);
    expect(r.motivoRol).toContain("Full Stack");
  });

  it("un requisito genérico 'Backend' lo cumple el perfil Full Stack", () => {
    const r = evaluar(fullStack, { titulo: "Backend Developer", requisitos: ["Backend"] });
    expect(r.requisitos[0].estado).toBe("cumple");
  });

  it("al revés, un Backend cubre solo la mitad de una vacante Full Stack", () => {
    const r = evaluar(
      { titular: "Desarrollador Backend", habilidades: [] },
      { titulo: "Full Stack Engineer", requisitos: [] }
    );
    expect(r.desglose.rol).toBeGreaterThanOrEqual(0.5);
    expect(r.desglose.rol).toBeLessThan(1);
  });

  it("una habilidad escrita como rol ('Full Stack') también cuenta", () => {
    const r = evaluar({ habilidades: ["Full Stack"] }, { titulo: "Backend Developer", requisitos: ["Backend"] });
    expect(r.desglose.rol).toBe(1);
    expect(r.requisitos[0].estado).toBe("cumple");
  });
});

describe("matchScore · habilidades con sinónimos, equivalencias y afines", () => {
  it("reconoce sinónimos: 'node js' cubre el requisito 'Node'", () => {
    const r = evaluar({ habilidades: [{ nombre: "node js", nivel: "EXPERTO" }] }, { requisitos: ["Node"] });
    expect(r.requisitos[0].credito).toBe(1);
  });

  it("PostgreSQL cubre SQL y Next.js cubre React por equivalencia", () => {
    const r = evaluar(
      { habilidades: [{ nombre: "PostgreSQL", nivel: "EXPERTO" }, { nombre: "Next.js", nivel: "EXPERTO" }] },
      { requisitos: ["SQL", "React"] }
    );
    expect(r.requisitos.map((x) => x.estado)).toEqual(["cumple", "cumple"]);
    expect(r.requisitos[0].motivo).toContain("PostgreSQL");
  });

  it("una habilidad afín da crédito parcial (MySQL frente a PostgreSQL)", () => {
    const r = evaluar({ habilidades: [{ nombre: "MySQL", nivel: "EXPERTO" }] }, { requisitos: ["PostgreSQL"] });
    expect(r.requisitos[0].estado).toBe("parcial");
    expect(r.requisitos[0].credito).toBeGreaterThan(0);
  });

  it("el nivel declarado pesa: Experto puntúa más que Básico", () => {
    const basico = evaluar({ habilidades: [{ nombre: "Python", nivel: "BASICO" }] }, { requisitos: ["Python"] });
    const experto = evaluar({ habilidades: [{ nombre: "Python", nivel: "EXPERTO" }] }, { requisitos: ["Python"] });
    expect(basico.desglose.skills).toBeLessThan(experto.desglose.skills);
  });

  it("los años de uso pueden respaldar una habilidad sin nivel", () => {
    expect(factorDominio({ nombre: "Java", anios: 6 })).toBe(1);
    expect(factorDominio({ nombre: "Java", anios: 0 })).toBeLessThan(factorDominio({ nombre: "Java" }));
  });

  it("una equivalencia con nivel intermedio ya cuenta como cumplida", () => {
    const r = evaluar({ habilidades: [{ nombre: "PostgreSQL", nivel: "INTERMEDIO" }] }, { requisitos: ["SQL"] });
    expect(r.requisitos[0].estado).toBe("cumple");
  });

  it("da crédito parcial a lo que se menciona en la experiencia sin declararlo", () => {
    const r = evaluar(
      {
        habilidades: [],
        experiencias: [{ cargo: "Desarrolladora", empresa: "Rappi", descripcion: "Diseñé APIs REST en Node.js" }],
      },
      { requisitos: ["APIs REST", "Docker"] }
    );
    expect(r.requisitos[0]).toMatchObject({ estado: "parcial" });
    expect(r.requisitos[0].motivo).toContain("Rappi");
    expect(r.requisitos[1].estado).toBe("falta");
  });

  it("no confunde menciones por subcadena ('interesante' no es 'REST')", () => {
    const r = evaluar({ habilidades: [], resumen: "Proyecto interesante" }, { requisitos: ["REST"] });
    expect(r.requisitos[0].estado).toBe("falta");
  });

  it("explica lo que falta", () => {
    const r = evaluar({ habilidades: ["React"] }, { requisitos: ["Docker"] });
    expect(r.requisitos[0]).toMatchObject({ estado: "falta", credito: 0 });
  });
});

describe("matchScore · experiencia relevante", () => {
  const vacante = { titulo: "Backend Developer", requisitos: [], experienciaMin: 3 };

  it("cumple el mínimo con cargos del área", () => {
    const r = evaluar(
      { habilidades: [], experiencias: [{ cargo: "Desarrollador Backend", inicio: hace(4), actual: true }] },
      vacante
    );
    expect(r.desglose.experiencia).toBe(1);
  });

  it("cuenta de forma proporcional si no alcanza el mínimo", () => {
    const r = evaluar(
      { habilidades: [], experiencias: [{ cargo: "Desarrollador Backend", inicio: hace(1.5), actual: true }] },
      vacante
    );
    expect(r.desglose.experiencia).toBeCloseTo(0.5, 1);
  });

  it("la experiencia de otra área cuenta a la mitad", () => {
    const r = evaluar(
      { habilidades: [], experiencias: [{ cargo: "Diseñador UX", inicio: hace(3), fin: AHORA }] },
      vacante
    );
    expect(r.desglose.experiencia).toBeCloseTo(0.5, 1);
  });

  it("dos cargos simultáneos del área no cuentan doble", () => {
    const r = evaluar(
      {
        habilidades: [],
        experiencias: [
          { cargo: "Desarrollador Backend", inicio: hace(2), fin: AHORA },
          { cargo: "Backend freelance", inicio: hace(2), fin: AHORA },
        ],
      },
      { titulo: "Backend Developer", requisitos: [], experienciaMin: 4 }
    );
    expect(r.desglose.experiencia).toBeCloseTo(0.5, 1);
  });

  it("una fecha de finalización futura no suma experiencia", () => {
    const futuro = new Date(AHORA.getTime() + 5 * 365.25 * 24 * 3600 * 1000);
    const r = evaluar(
      { habilidades: [], experiencias: [{ cargo: "Desarrollador Backend", inicio: hace(1), fin: futuro }] },
      { titulo: "Backend Developer", requisitos: [], experienciaMin: 2 }
    );
    expect(r.desglose.experiencia).toBeCloseTo(0.5, 1);
  });

  it("sin mínimo exigido no penaliza", () => {
    const r = evaluar({ habilidades: [] }, { requisitos: [] });
    expect(r.desglose.experiencia).toBe(1);
  });
});
