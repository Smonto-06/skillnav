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

  it("preferir híbrido cubre vacantes presenciales y remotas", () => {
    const presencial = matchScore(
      { habilidades: ["React"], modalidad: "HIBRIDO" },
      { requisitos: ["React"], modalidad: "PRESENCIAL" }
    );
    const remoto = matchScore(
      { habilidades: ["React"], modalidad: "HIBRIDO" },
      { requisitos: ["React"], modalidad: "REMOTO" }
    );
    const hibrido = matchScore(
      { habilidades: ["React"], modalidad: "HIBRIDO" },
      { requisitos: ["React"], modalidad: "HIBRIDO" }
    );

    expect(presencial.desglose.modalidad).toBe(0.75);
    expect(remoto.desglose.modalidad).toBe(0.75);
    expect(hibrido.desglose.modalidad).toBe(1);
  });

  it("una vacante híbrida es compatible en parte con quien busca remoto o presencial", () => {
    const desdeRemoto = matchScore(
      { habilidades: ["React"], modalidad: "REMOTO" },
      { requisitos: ["React"], modalidad: "HIBRIDO" }
    );
    const desdePresencial = matchScore(
      { habilidades: ["React"], modalidad: "PRESENCIAL" },
      { requisitos: ["React"], modalidad: "HIBRIDO" }
    );

    expect(desdeRemoto.desglose.modalidad).toBe(0.5);
    expect(desdePresencial.desglose.modalidad).toBe(0.75);
  });

  it("presencial y remoto siguen siendo incompatibles entre sí", () => {
    expect(
      matchScore(
        { habilidades: ["React"], modalidad: "REMOTO" },
        { requisitos: ["React"], modalidad: "PRESENCIAL" }
      ).desglose.modalidad
    ).toBe(0);
    expect(
      matchScore(
        { habilidades: ["React"], modalidad: "PRESENCIAL" },
        { requisitos: ["React"], modalidad: "REMOTO" }
      ).desglose.modalidad
    ).toBe(0);
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
    experiencias: [{ cargo: "Desarrollador Full Stack", inicio: hace(3), actual: true }],
  };

  it("el rol Full Stack con experiencia cubre por completo una vacante Backend", () => {
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
      {
        titular: "Desarrollador Backend",
        habilidades: [],
        experiencias: [{ cargo: "Desarrollador Backend", inicio: hace(3), actual: true }],
      },
      { titulo: "Full Stack Engineer", requisitos: [] }
    );
    expect(r.desglose.rol).toBe(0.5);
  });

  it("un titular declarado sin experiencia que lo respalde cuenta, pero menos", () => {
    const r = evaluar({ titular: "Desarrolladora Full Stack", habilidades: [] }, { titulo: "Backend Developer", requisitos: ["Backend"] });
    expect(r.desglose.rol).toBe(0.85);
    expect(r.requisitos[0].estado).toBe("cumple");
  });

  it("una habilidad escrita como rol ('Full Stack') también cuenta", () => {
    const r = evaluar({ habilidades: ["Full Stack"] }, { titulo: "Backend Developer", requisitos: ["Backend"] });
    expect(r.desglose.rol).toBe(0.85);
    expect(r.requisitos[0].estado).toBe("cumple");
  });
});

describe("matchScore · el tiempo en el cargo pesa", () => {
  it("una semana como Full Stack apenas acredita el rol", () => {
    const semana = new Date(AHORA.getTime() - 7 * 24 * 3600 * 1000);
    const r = evaluar(
      { habilidades: [], experiencias: [{ cargo: "Desarrollador Full Stack", inicio: semana, fin: AHORA }] },
      { titulo: "Backend Developer", requisitos: [] }
    );
    expect(r.desglose.rol).toBeLessThan(0.5);
    expect(r.motivoRol).toContain("Menos de un mes");
  });

  it("dos años o más en el cargo lo acreditan por completo", () => {
    const r = evaluar(
      { habilidades: [], experiencias: [{ cargo: "Desarrollador Full Stack", inicio: hace(2.5), actual: true }] },
      { titulo: "Backend Developer", requisitos: [] }
    );
    expect(r.desglose.rol).toBe(1);
  });
});

describe("matchScore · más ambigüedades resueltas", () => {
  it("'Desarrollador Java' se entiende como un rol Backend", () => {
    const r = evaluar(
      {
        titular: "Desarrolladora Backend",
        habilidades: [],
        experiencias: [{ cargo: "Desarrolladora Backend", inicio: hace(3), actual: true }],
      },
      { titulo: "Desarrollador Java Senior", requisitos: [] }
    );
    expect(r.desglose.rol).toBe(1);
  });

  it("un requisito escrito como frase se separa en sus tecnologías", () => {
    const r = evaluar(
      { habilidades: [{ nombre: "React", nivel: "AVANZADO" }, { nombre: "Node.js", nivel: "AVANZADO" }] },
      { requisitos: ["Experiencia con React y Node.js"] }
    );
    expect(r.requisitos[0].estado).toBe("cumple");
  });

  it("un curso o certificación cuenta como evidencia parcial", () => {
    const r = evaluar({ habilidades: [], educacion: [{ titulo: "Curso de Docker y Kubernetes" }] }, { requisitos: ["Docker"] });
    expect(r.requisitos[0].estado).toBe("parcial");
    expect(r.requisitos[0].motivo).toContain("Curso de Docker");
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
