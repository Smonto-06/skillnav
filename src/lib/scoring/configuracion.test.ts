import { describe, it, expect } from "vitest";
import {
  CLAVES_PESO,
  normalizarPesos,
  pesosDesdeConfiguracion,
  sumaDe,
  validarPesos,
} from "./configuracion";
import { PESOS_DEFAULT } from "./nucleo";

const completo = (p: Partial<Record<string, number>>) => ({
  skills: 0, rol: 0, experiencia: 0, salario: 0, modalidad: 0, ubicacion: 0, ...p,
});

describe("validarPesos", () => {
  it("acepta los pesos por defecto", () => {
    const r = validarPesos({ ...PESOS_DEFAULT });
    expect(r.ok).toBe(true);
  });

  // Hay combinaciones razonables que no suman exacto en punto flotante:
  // 0.7 + 0.1 + 0.1 + 0.1 da 0.9999999999999999. Sin tolerancia, el
  // administrador veria rechazada una configuracion que si suma 1.
  it("tolera el error de punto flotante", () => {
    const pesos = completo({ skills: 0.7, rol: 0.1, experiencia: 0.1, salario: 0.1 });
    expect(sumaDe(pesos)).not.toBe(1);
    expect(validarPesos(pesos).ok).toBe(true);
  });

  it("rechaza si la suma no es 1 y dice cuanto suma", () => {
    const r = validarPesos(completo({ skills: 0.5, rol: 0.2 }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/suman 0\.7/);
      expect(r.error).toMatch(/deben sumar 1/i);
    }
  });

  it("rechaza un peso negativo: invertiria el significado de la dimension", () => {
    const r = validarPesos(completo({ skills: 1.2, rol: -0.2 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/entre 0 y 1/);
  });

  it("rechaza un peso mayor que 1: romperia la escala de 0 a 100", () => {
    expect(validarPesos(completo({ skills: 1.5, rol: -0.5 })).ok).toBe(false);
  });

  it("rechaza texto que no es numero", () => {
    const r = validarPesos({ ...PESOS_DEFAULT, skills: "mucho" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no es un número/i);
  });

  it("acepta poner una dimension en cero si el resto compensa", () => {
    // Apagar ubicacion es una decision legitima del administrador.
    const r = validarPesos(completo({ skills: 0.45, rol: 0.2, experiencia: 0.15, salario: 0.1, modalidad: 0.1, ubicacion: 0 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pesos.ubicacion).toBe(0);
  });
});

describe("normalizarPesos", () => {
  it("reparte proporcionalmente conservando la relacion entre valores", () => {
    // El doble de peso en skills que en rol se mantiene despues de normalizar.
    const r = normalizarPesos(completo({ skills: 2, rol: 1 }));
    expect(sumaDe(r)).toBeCloseTo(1, 6);
    expect(r.skills / r.rol).toBeCloseTo(2, 3);
  });

  it("la suma queda exactamente en 1 pese al redondeo", () => {
    const r = normalizarPesos(completo({ skills: 1, rol: 1, experiencia: 1 }));
    expect(sumaDe(r)).toBeCloseTo(1, 9);
  });

  it("vuelve a los pesos de fabrica si todo esta en cero, en vez de dividir por cero", () => {
    expect(normalizarPesos(completo({}))).toEqual({ ...PESOS_DEFAULT });
  });

  it("ignora valores negativos tratandolos como cero", () => {
    const r = normalizarPesos(completo({ skills: 1, rol: -5 }));
    expect(r.skills).toBeCloseTo(1, 4);
    expect(r.rol).toBe(0);
  });
});

describe("pesosDesdeConfiguracion", () => {
  it("usa los pesos de fabrica si no hay fila guardada", () => {
    expect(pesosDesdeConfiguracion(null)).toEqual({ ...PESOS_DEFAULT });
  });

  it("respeta una configuracion guardada valida", () => {
    const guardada = completo({ skills: 0.5, rol: 0.2, experiencia: 0.1, salario: 0.1, modalidad: 0.1 });
    expect(pesosDesdeConfiguracion(guardada).skills).toBe(0.5);
  });

  // Una fila manipulada a mano en la BD no debe producir scores sin sentido.
  it("normaliza una configuracion guardada que no suma 1", () => {
    const r = pesosDesdeConfiguracion(completo({ skills: 10, rol: 10 }));
    expect(sumaDe(r)).toBeCloseTo(1, 6);
    expect(r.skills).toBeCloseTo(0.5, 3);
  });

  it("rellena con el valor de fabrica un campo que llego nulo", () => {
    const r = pesosDesdeConfiguracion({ skills: 0.4, rol: 0.2, experiencia: 0.15, salario: 0.1, modalidad: 0.1 });
    expect(r.ubicacion).toBe(PESOS_DEFAULT.ubicacion);
  });

  it("cubre las seis dimensiones", () => {
    const r = pesosDesdeConfiguracion(null);
    expect(Object.keys(r).sort()).toEqual([...CLAVES_PESO].sort());
  });
});
