import { describe, it, expect } from "vitest";
import { MotorReglas, analizarCV, etiquetaMotor } from "./analizar";
import type { MotorAnalisisCV } from "./motor";
import type { PerfilExtraido } from "./parser";

const CV = `Laura Gomez Restrepo
Desarrolladora Full Stack
laura@ejemplo.com

EXPERIENCIA LABORAL
Backend Developer - Bancolombia (2023 - actual)

EDUCACION
Ingenieria de Sistemas - Universidad EAFIT (2021)

HABILIDADES
React, TypeScript, PostgreSQL`;

const perfilFalso = (nombre: string): PerfilExtraido => ({
  nombre: { valor: nombre, confianza: "alta", evidencia: "test" },
  habilidades: { valor: ["Inventada"], confianza: "alta", evidencia: "test" },
  experiencias: { valor: [], confianza: "alta", evidencia: "test" },
  educacion: { valor: [], confianza: "alta", evidencia: "test" },
  layoutMezclado: false,
  textoOriginal: CV,
});

/** Motor que siempre funciona, para verificar que se prefiere. */
const motorBueno: MotorAnalisisCV = {
  nombre: "llm",
  disponible: () => true,
  analizar: async () => perfilFalso("Vino del LLM"),
};

/** Motor configurado pero que falla al llamar. */
const motorQueFalla: MotorAnalisisCV = {
  nombre: "llm",
  disponible: () => true,
  analizar: async () => {
    throw new Error("Groq respondio 429");
  },
};

/** Motor sin clave: no esta disponible. */
const motorSinClave: MotorAnalisisCV = {
  nombre: "llm",
  disponible: () => false,
  analizar: async () => {
    throw new Error("no deberia llamarse");
  },
};

/** Motor que se pasa del tiempo permitido. */
const motorLento: MotorAnalisisCV = {
  nombre: "llm",
  disponible: () => true,
  analizar: async () => {
    const e = new Error("abortado");
    e.name = "AbortError";
    throw e;
  },
};

describe("MotorReglas", () => {
  it("siempre esta disponible: no depende de red ni de claves", () => {
    expect(new MotorReglas().disponible()).toBe(true);
  });

  it("produce el mismo borrador que el parser por reglas", async () => {
    const p = await new MotorReglas().analizar(CV);
    expect(p.nombre?.valor).toBe("Laura Gomez Restrepo");
    expect(p.habilidades.valor).toContain("React");
  });
});

describe("analizarCV · eleccion de motor", () => {
  it("usa el motor con IA cuando esta disponible", async () => {
    const r = await analizarCV(CV, motorBueno, new MotorReglas());
    expect(r.motor).toBe("llm");
    expect(r.perfil.nombre?.valor).toBe("Vino del LLM");
    expect(r.motivoRespaldo).toBeUndefined();
  });

  it("cae a reglas si no hay clave, sin siquiera intentar la llamada", async () => {
    const r = await analizarCV(CV, motorSinClave, new MotorReglas());
    expect(r.motor).toBe("reglas");
    expect(r.motivoRespaldo).toMatch(/clave/i);
    // Y el resultado sigue siendo util, no vacio.
    expect(r.perfil.habilidades.valor).toContain("React");
  });
});

// Esta es la garantia que pidio el board: que exista respaldo si la API falla.
describe("analizarCV · respaldo ante fallos", () => {
  it("cae a reglas si la API devuelve error, y dice por que", async () => {
    const r = await analizarCV(CV, motorQueFalla, new MotorReglas());
    expect(r.motor).toBe("reglas");
    expect(r.motivoRespaldo).toContain("429");
    expect(r.perfil.nombre?.valor).toBe("Laura Gomez Restrepo");
  });

  it("cae a reglas si el modelo se demora, con un motivo legible", async () => {
    const r = await analizarCV(CV, motorLento, new MotorReglas());
    expect(r.motor).toBe("reglas");
    expect(r.motivoRespaldo).toMatch(/tardó demasiado/i);
  });

  it("nunca deja al candidato sin borrador", async () => {
    for (const motor of [motorQueFalla, motorSinClave, motorLento]) {
      const r = await analizarCV(CV, motor, new MotorReglas());
      expect(r.perfil.textoOriginal).toBe(CV);
      expect(r.perfil.habilidades.valor.length).toBeGreaterThan(0);
    }
  });
});

describe("etiquetaMotor", () => {
  it("le dice al candidato si lo leyo una IA o no", () => {
    expect(etiquetaMotor("llm")).toMatch(/inteligencia artificial/i);
    expect(etiquetaMotor("reglas")).toMatch(/sin IA/i);
  });
});
