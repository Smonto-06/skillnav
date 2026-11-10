import { describe, it, expect } from "vitest";
import {
  EvaluadorHabilidades,
  EvaluadorModalidad,
  EvaluadorSalario,
  EvaluadorUbicacion,
  EVALUADORES_POR_DEFECTO,
} from "./evaluadores";
import { MotorScoring } from "./motor";
import { construirContexto, PESOS_DEFAULT } from "./nucleo";

const AHORA = new Date(Date.UTC(2026, 10, 9));
const ctx = (perfil: Parameters<typeof construirContexto>[0]) => construirContexto(perfil, AHORA);

// Lo que el refactor habilita: probar UNA dimension sin calcular las otras cinco.
describe("EvaluadorSalario · aislado", () => {
  const ev = new EvaluadorSalario();
  const perfil = { habilidades: [], salarioMin: 3000, salarioMax: 6000 };

  it("da 1 si el salario cae dentro del rango esperado", () => {
    expect(ev.evaluar(perfil, { requisitos: [], salario: 4500 }).valor).toBe(1);
  });

  it("da 0.8 si paga mas de lo esperado: fuera del rango pero a favor", () => {
    expect(ev.evaluar(perfil, { requisitos: [], salario: 9000 }).valor).toBe(0.8);
  });

  it("degrada proporcionalmente si paga menos del minimo", () => {
    expect(ev.evaluar(perfil, { requisitos: [], salario: 1500 }).valor).toBe(0.5);
  });

  it("es neutro sin dato en vez de penalizar al candidato", () => {
    expect(ev.evaluar(perfil, { requisitos: [], salario: null }).valor).toBe(0.5);
  });

  it("trata el cero como salario no publicado, no como oferta de cero pesos", () => {
    // El formulario de la vacante deja 0 cuando el campo va vacio. Con el
    // guard anterior (== null) ese 0 pasaba como oferta real y, al caer dentro
    // del rango, le daba el maximo a una vacante que no paga nada.
    const r = ev.evaluar({ habilidades: [] }, { requisitos: [], salario: 0 });
    expect(r.valor).toBe(0.5);
    expect(r.motivo).toMatch(/no publica/i);
  });
});

describe("EvaluadorModalidad · aislado", () => {
  const ev = new EvaluadorModalidad();

  it("hibrido cubre presencial y remoto", () => {
    const p = { habilidades: [], modalidad: "HIBRIDO" as const };
    expect(ev.evaluar(p, { requisitos: [], modalidad: "PRESENCIAL" }).valor).toBe(0.75);
    expect(ev.evaluar(p, { requisitos: [], modalidad: "REMOTO" }).valor).toBe(0.75);
    expect(ev.evaluar(p, { requisitos: [], modalidad: "HIBRIDO" }).valor).toBe(1);
  });

  it("presencial y remoto siguen siendo incompatibles", () => {
    expect(
      ev.evaluar({ habilidades: [], modalidad: "REMOTO" }, { requisitos: [], modalidad: "PRESENCIAL" }).valor
    ).toBe(0);
  });

  it("sin preferencia no restringe", () => {
    expect(ev.evaluar({ habilidades: [] }, { requisitos: [], modalidad: "PRESENCIAL" }).valor).toBe(1);
  });
});

describe("EvaluadorUbicacion · aislado", () => {
  const ev = new EvaluadorUbicacion();

  it("ignora las tildes al comparar ciudades", () => {
    const p = { habilidades: [], ciudad: "Medellín", modalidad: "PRESENCIAL" as const };
    expect(ev.evaluar(p, { requisitos: [], ciudad: "Medellin", modalidad: "PRESENCIAL" }).valor).toBe(1);
  });

  it("la ciudad deja de importar si el trabajo es remoto", () => {
    const p = { habilidades: [], ciudad: "Medellin" };
    expect(ev.evaluar(p, { requisitos: [], ciudad: "Bogota", modalidad: "REMOTO" }).valor).toBe(1);
  });

  it("es neutro si la vacante no indica la ciudad", () => {
    // La ciudad de la vacante es opcional. Antes se comparaba contra "" y el
    // candidato perdia la dimension entera con un motivo que era falso: no se
    // puede afirmar que este en otra ciudad si no se sabe cual es.
    const p = { habilidades: [], ciudad: "Medellin", modalidad: "PRESENCIAL" as const };
    for (const ciudad of [null, "", "   "]) {
      const r = ev.evaluar(p, { requisitos: [], ciudad, modalidad: "PRESENCIAL" });
      expect(r.valor).toBe(0.5);
      expect(r.motivo).not.toMatch(/otra ciudad/i);
    }
  });

  it("sigue penalizando cuando la vacante si esta en otra ciudad", () => {
    const p = { habilidades: [], ciudad: "Medellin", modalidad: "PRESENCIAL" as const };
    expect(ev.evaluar(p, { requisitos: [], ciudad: "Bogota", modalidad: "PRESENCIAL" }).valor).toBe(0);
  });
});

describe("EvaluadorHabilidades · aislado", () => {
  const ev = new EvaluadorHabilidades();

  it("una vacante sin requisitos esta abierta a cualquier perfil", () => {
    const perfil = { habilidades: [] };
    const r = ev.evaluar(perfil, { requisitos: [] }, ctx(perfil));
    expect(r.valor).toBe(1);
    expect(r.requisitos).toEqual([]);
  });

  it("devuelve el detalle por requisito, no solo el promedio", () => {
    const perfil = { habilidades: ["React"] };
    const r = ev.evaluar(perfil, { requisitos: ["React", "Cobol"] }, ctx(perfil));
    expect(r.requisitos).toHaveLength(2);
    expect(r.valor).toBeGreaterThan(0);
    expect(r.valor).toBeLessThan(1);
  });
});

// COMPOSITE: el motor trata una coleccion de evaluadores como si fuera uno.
describe("MotorScoring · composite", () => {
  const perfil = { habilidades: ["React"], modalidad: "REMOTO" as const };
  const vacante = { titulo: "Frontend Developer", requisitos: ["React"], modalidad: "REMOTO" as const };

  it("combina las seis dimensiones en un puntaje de 0 a 100", () => {
    const r = new MotorScoring().calcular(perfil, vacante, AHORA);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(Object.keys(r.desglose).sort()).toEqual(
      ["experiencia", "modalidad", "rol", "salario", "skills", "ubicacion"]
    );
  });

  it("se le puede pasar un subconjunto de evaluadores", () => {
    // Solo modalidad: el resto del desglose queda en 0 y el score refleja
    // unicamente el peso de esa dimension.
    const soloModalidad = new MotorScoring([new EvaluadorModalidad()]);
    const r = soloModalidad.calcular(perfil, vacante, AHORA);
    expect(r.desglose.modalidad).toBe(1);
    expect(r.desglose.skills).toBe(0);
    expect(r.score).toBe(Math.round(PESOS_DEFAULT.modalidad * 100));
  });

  it("los pesos los aplica el motor, no los evaluadores", () => {
    // Si modalidad pesara todo, un match perfecto de modalidad daria 100.
    const pesos = { ...PESOS_DEFAULT, skills: 0, rol: 0, experiencia: 0, salario: 0, modalidad: 1, ubicacion: 0 };
    const r = new MotorScoring(EVALUADORES_POR_DEFECTO, pesos).calcular(perfil, vacante, AHORA);
    expect(r.score).toBe(100);
  });

  it("expone las dimensiones con su peso para el panel de administracion", () => {
    const d = new MotorScoring().dimensiones();
    expect(d).toHaveLength(6);
    expect(d.find((x) => x.clave === "skills")?.peso).toBe(PESOS_DEFAULT.skills);
    expect(d.find((x) => x.clave === "skills")?.etiqueta).toBe("Habilidades");
  });

  it("los pesos por defecto suman 1", () => {
    const suma = Object.values(PESOS_DEFAULT).reduce((a, b) => a + b, 0);
    expect(suma).toBeCloseTo(1, 10);
  });
});
