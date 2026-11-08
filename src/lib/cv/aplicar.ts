// HU-23 · Traducción del borrador confirmado por el candidato a los datos que
// espera Prisma.
//
// Patrón ADAPTER: `PerfilExtraido` habla el lenguaje del parser (campos con
// confianza y evidencia, años sueltos, periodos como texto). Prisma habla el
// lenguaje del dominio (fechas, enums, filas por tabla). Este módulo adapta uno
// al otro sin que ninguno de los dos conozca al otro.
//
// Vive separado de la Server Action para poder probarlo sin servidor ni base de
// datos: es acá donde se decide qué se guarda y qué se descarta.
import type { EducacionDetectada, ExperienciaDetectada, PerfilExtraido } from "./parser";

export interface SeleccionCV {
  /** Campos simples que el candidato dejó marcados (ya editados por él). */
  nombre?: string;
  titular?: string;
  contacto?: string;
  linkedin?: string;
  /** Habilidades que el candidato confirmó, por nombre. */
  habilidades: string[];
  /** Índices de las experiencias detectadas que el candidato confirmó. */
  experiencias: number[];
  /** Índices de los estudios detectados que el candidato confirmó. */
  educacion: number[];
}

export interface DatosAplicables {
  candidato: {
    nombre?: string;
    titular?: string;
    contacto?: string;
    linkedin?: string;
  };
  habilidades: { nombre: string }[];
  experiencias: {
    cargo: string;
    empresa: string;
    fechaInicio?: Date;
    fechaFin?: Date;
    actual: boolean;
  }[];
  educacion: { titulo: string; institucion: string; anio?: number }[];
}

const vacio = (s?: string) => !s || s.trim() === "";

// Un año suelto del CV se guarda como el 1 de enero en UTC. No inventamos mes
// ni día: el CV no los trae, y usar la fecha local desplazaría el año en zonas
// al oeste de UTC.
export function fechaDeAnio(anio?: number): Date | undefined {
  if (anio == null || !Number.isInteger(anio)) return undefined;
  if (anio < 1950 || anio > 2100) return undefined;
  return new Date(Date.UTC(anio, 0, 1));
}

function adaptarExperiencia(e: ExperienciaDetectada): DatosAplicables["experiencias"][number] | null {
  if (vacio(e.cargo)) return null;
  return {
    cargo: e.cargo.trim(),
    // La empresa es obligatoria en el modelo, pero el CV no siempre la trae
    // de forma reconocible. Marcarla explícitamente es más honesto que
    // guardar una cadena vacía que luego parece un dato real.
    empresa: vacio(e.empresa) ? "(sin especificar)" : e.empresa!.trim(),
    fechaInicio: fechaDeAnio(e.anioInicio),
    fechaFin: e.actual ? undefined : fechaDeAnio(e.anioFin),
    actual: e.actual,
  };
}

function adaptarEducacion(e: EducacionDetectada): DatosAplicables["educacion"][number] | null {
  if (vacio(e.titulo)) return null;
  return {
    titulo: e.titulo.trim(),
    institucion: vacio(e.institucion) ? "(sin especificar)" : e.institucion!.trim(),
    anio: e.anio,
  };
}

/**
 * Construye lo que se va a escribir en la base de datos a partir del borrador
 * y de lo que el candidato confirmó. Solo entra lo seleccionado: un campo que
 * el parser detectó pero el candidato no marcó no se guarda.
 */
export function construirDatosAplicables(
  borrador: PerfilExtraido,
  seleccion: SeleccionCV
): DatosAplicables {
  const candidato: DatosAplicables["candidato"] = {};
  if (!vacio(seleccion.nombre)) candidato.nombre = seleccion.nombre!.trim();
  if (!vacio(seleccion.titular)) candidato.titular = seleccion.titular!.trim();
  if (!vacio(seleccion.contacto)) candidato.contacto = seleccion.contacto!.trim();
  if (!vacio(seleccion.linkedin)) candidato.linkedin = seleccion.linkedin!.trim();

  // Solo habilidades que el parser realmente detectó: así un formulario
  // manipulado no puede inyectar habilidades que nunca estuvieron en el CV.
  const detectadas = new Set(borrador.habilidades.valor);
  const habilidades = Array.from(
    new Set(seleccion.habilidades.map((h) => h.trim()).filter((h) => detectadas.has(h)))
  ).map((nombre) => ({ nombre }));

  const experiencias = seleccion.experiencias
    .map((i) => borrador.experiencias.valor[i])
    .filter(Boolean)
    .map(adaptarExperiencia)
    .filter((e): e is DatosAplicables["experiencias"][number] => e !== null);

  const educacion = seleccion.educacion
    .map((i) => borrador.educacion.valor[i])
    .filter(Boolean)
    .map(adaptarEducacion)
    .filter((e): e is DatosAplicables["educacion"][number] => e !== null);

  return { candidato, habilidades, experiencias, educacion };
}

/** Lee la selección desde el formulario de revisión. */
export function seleccionDesdeFormulario(form: {
  get(name: string): unknown;
  getAll(name: string): unknown[];
}): SeleccionCV {
  const texto = (n: string) => {
    const v = form.get(n);
    return typeof v === "string" ? v : undefined;
  };
  const indices = (n: string) =>
    form
      .getAll(n)
      .map((v) => Number.parseInt(String(v), 10))
      .filter((n) => Number.isInteger(n) && n >= 0);

  return {
    nombre: texto("nombre"),
    titular: texto("titular"),
    contacto: texto("contacto"),
    linkedin: texto("linkedin"),
    habilidades: form.getAll("habilidades").map((v) => String(v)),
    experiencias: indices("experiencias"),
    educacion: indices("educacion"),
  };
}

/** Cuántas filas se van a crear, para confirmarle al candidato qué se guardó. */
export function resumenAplicacion(d: DatosAplicables): string {
  const partes: string[] = [];
  const campos = Object.keys(d.candidato).length;
  if (campos) partes.push(`${campos} dato(s) del perfil`);
  if (d.habilidades.length) partes.push(`${d.habilidades.length} habilidad(es)`);
  if (d.experiencias.length) partes.push(`${d.experiencias.length} experiencia(s)`);
  if (d.educacion.length) partes.push(`${d.educacion.length} estudio(s)`);
  return partes.length ? `Se guardaron ${partes.join(", ")}.` : "No se guardó nada.";
}
