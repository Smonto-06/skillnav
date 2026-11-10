// HU-27 · Pesos del motor de scoring configurables por el administrador.
//
// Funciones puras para validar y normalizar: la lectura y escritura en BD vive
// en la Server Action, pero las reglas de qué es una configuración válida se
// prueban sin servidor ni base de datos.
import { PESOS_DEFAULT } from "./nucleo";
import type { Pesos } from "./motor";
import type { ClaveDimension } from "./evaluadores";

export const CLAVES_PESO: ClaveDimension[] = [
  "skills",
  "rol",
  "experiencia",
  "salario",
  "modalidad",
  "ubicacion",
];

/**
 * Tolerancia al comparar la suma contra 1.
 *
 * Hay combinaciones perfectamente razonables que no suman exacto en punto
 * flotante: 0.7 + 0.1 + 0.1 + 0.1 da 0.9999999999999999 en JavaScript. Exigir
 * igualdad exacta rechazaría configuraciones que sí suman 1.
 */
export const TOLERANCIA = 1e-6;

export type ResultadoValidacion =
  | { ok: true; pesos: Pesos }
  | { ok: false; error: string };

export function sumaDe(pesos: Partial<Record<ClaveDimension, number>>): number {
  return CLAVES_PESO.reduce((s, k) => s + (pesos[k] ?? 0), 0);
}

/**
 * Valida los pesos que llegan del formulario del administrador.
 *
 * Reglas, y el porqué de cada una:
 * - Cada peso entre 0 y 1: un peso negativo invertiría el significado de la
 *   dimensión y uno mayor que 1 rompería la escala de 0 a 100.
 * - La suma debe ser 1: si no, el score deja de ser un porcentaje comparable
 *   entre vacantes, y es exactamente lo que pide el criterio de aceptación.
 */
export function validarPesos(crudo: Record<string, unknown>): ResultadoValidacion {
  const pesos = {} as Pesos;

  for (const clave of CLAVES_PESO) {
    const valor = Number(crudo[clave]);
    if (!Number.isFinite(valor)) {
      return { ok: false, error: `El peso de ${clave} no es un número válido.` };
    }
    if (valor < 0 || valor > 1) {
      return { ok: false, error: `El peso de ${clave} debe estar entre 0 y 1.` };
    }
    pesos[clave] = valor;
  }

  const suma = sumaDe(pesos);
  if (Math.abs(suma - 1) > TOLERANCIA) {
    return {
      ok: false,
      error: `Los pesos deben sumar 1.00 y suman ${suma.toFixed(4)}. Ajusta los valores.`,
    };
  }

  return { ok: true, pesos };
}

/**
 * Reparte proporcionalmente para que la suma dé 1, conservando la relación
 * entre los valores que escribió el administrador.
 *
 * Sirve para el botón "normalizar": es más útil que rechazar el formulario y
 * dejarlo haciendo la cuenta a mano.
 */
export function normalizarPesos(crudo: Partial<Record<ClaveDimension, number>>): Pesos {
  const limpio = {} as Pesos;
  for (const k of CLAVES_PESO) {
    const v = Number(crudo[k]);
    limpio[k] = Number.isFinite(v) && v > 0 ? v : 0;
  }

  const suma = sumaDe(limpio);
  // Todo en cero no se puede normalizar: se vuelve a los pesos por defecto en
  // lugar de dividir por cero y dejar la configuración inservible.
  if (suma <= 0) return { ...PESOS_DEFAULT };

  const normalizado = {} as Pesos;
  for (const k of CLAVES_PESO) {
    normalizado[k] = Number((limpio[k] / suma).toFixed(4));
  }

  // Redondear a 4 decimales puede dejar la suma en 0.9999: la diferencia se
  // absorbe en la dimensión de mayor peso, que es donde menos se nota.
  const resto = 1 - sumaDe(normalizado);
  if (Math.abs(resto) > 0) {
    const mayor = CLAVES_PESO.reduce((a, b) => (normalizado[a] >= normalizado[b] ? a : b));
    normalizado[mayor] = Number((normalizado[mayor] + resto).toFixed(6));
  }

  return normalizado;
}

/** Convierte la fila de BD a los pesos del motor, cayendo a los de fábrica. */
export function pesosDesdeConfiguracion(
  fila: Partial<Record<ClaveDimension, number>> | null | undefined
): Pesos {
  if (!fila) return { ...PESOS_DEFAULT };

  const pesos = {} as Pesos;
  for (const k of CLAVES_PESO) {
    const v = fila[k];
    pesos[k] = typeof v === "number" && Number.isFinite(v) ? v : PESOS_DEFAULT[k];
  }

  // Una configuración guardada que no suma 1 (por una migración o un cambio
  // manual en la BD) no debe producir scores sin sentido: se normaliza.
  return Math.abs(sumaDe(pesos) - 1) > TOLERANCIA ? normalizarPesos(pesos) : pesos;
}
