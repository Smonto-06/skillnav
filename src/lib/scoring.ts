// Motor de scoring (HU-24) - cálculo determinista y explicable de compatibilidad
// perfil <-> vacante. Mismos datos -> mismo score.
//
// Dimensiones y pesos por defecto:
//   habilidades 40%  requisitos de la vacante cubiertos, con sinónimos, equivalencias,
//                    afines y áreas (taxonomia.ts), ponderados por nivel/años declarados
//   rol         20%  afinidad entre el titular/cargos del candidato y el rol de la vacante
//                    (un Full Stack cubre una vacante Backend; un Backend cubre la mitad
//                    de una Full Stack)
//   experiencia 15%  años de experiencia relevante frente a los años que pide la vacante
//   salario     10%, modalidad 10%, ubicación 5%
import {
  AREA_LABEL,
  Area,
  HabilidadCatalogo,
  adyacencia,
  areasDeCargo,
  areasDeRequisito,
  clave,
  cubiertas,
  habilidadesMencionadas,
  ngramas,
  resolverHabilidad,
  rolesDeCargo,
} from "./taxonomia";
import { Periodo, aniosDe, aniosTotales, formatoDuracion } from "./trayectoria";

export type Modalidad = "PRESENCIAL" | "REMOTO" | "HIBRIDO";
export type NivelHabilidad = "BASICO" | "INTERMEDIO" | "AVANZADO" | "EXPERTO";

export interface HabilidadPerfil {
  nombre: string;
  nivel?: NivelHabilidad | null;
  anios?: number | null;
}

export interface ExperienciaPerfil extends Periodo {
  cargo: string;
  empresa?: string | null;
  descripcion?: string | null;
}

export interface PerfilScoring {
  /** Acepta nombres sueltos (compatibilidad) o habilidades con nivel y años. */
  habilidades: (string | HabilidadPerfil)[];
  titular?: string | null;
  resumen?: string | null;
  experiencias?: ExperienciaPerfil[];
  /** Títulos de estudios, cursos y certificaciones (evidencia de conocimientos). */
  educacion?: { titulo: string }[];
  salarioMin?: number | null;
  salarioMax?: number | null;
  modalidad?: Modalidad | null;
  ciudad?: string | null;
}

export interface VacanteScoring {
  titulo?: string | null;
  requisitos: string[];
  experienciaMin?: number | null;
  salario?: number | null;
  modalidad?: Modalidad | null;
  ciudad?: string | null;
}

export interface Desglose {
  skills: number;
  rol: number;
  experiencia: number;
  salario: number;
  modalidad: number;
  ubicacion: number;
}

export type EstadoRequisito = "cumple" | "parcial" | "falta";

export interface EvaluacionRequisito {
  requisito: string;
  credito: number;
  estado: EstadoRequisito;
  motivo: string;
}

export interface ResultadoScoring {
  score: number;
  desglose: Desglose;
  requisitos: EvaluacionRequisito[];
  motivoRol: string;
  motivoExperiencia: string;
}

// Pesos por defecto (configurables por el admin en E7). Suman 1.
export const PESOS_DEFAULT = {
  skills: 0.4,
  rol: 0.2,
  experiencia: 0.15,
  salario: 0.1,
  modalidad: 0.1,
  ubicacion: 0.05,
} as const;

// Compatibilidad entre la modalidad que prefiere el candidato (fila) y la que
// ofrece la vacante (columna). No es simétrica: quien busca híbrido acepta
// cualquiera de las dos jornadas, mientras que quien busca remoto solo cubre
// parcialmente un híbrido (tendría que ir a la oficina algunos días).
export const COMPAT_MODALIDAD: Record<Modalidad, Record<Modalidad, number>> = {
  HIBRIDO: { HIBRIDO: 1, PRESENCIAL: 0.75, REMOTO: 0.75 },
  PRESENCIAL: { PRESENCIAL: 1, HIBRIDO: 0.75, REMOTO: 0 },
  REMOTO: { REMOTO: 1, HIBRIDO: 0.5, PRESENCIAL: 0 },
};

export const NIVEL_LABEL: Record<NivelHabilidad, string> = {
  BASICO: "Básico",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
  EXPERTO: "Experto",
};

const FACTOR_NIVEL: Record<NivelHabilidad, number> = {
  BASICO: 0.6,
  INTERMEDIO: 0.8,
  AVANZADO: 0.95,
  EXPERTO: 1,
};

// Qué tanto respalda el perfil una habilidad declarada: por nivel, por años de uso,
// o el mejor de ambos. Sin dato se asume intermedio-alto (0.85).
export function factorDominio(h: HabilidadPerfil): number {
  const porNivel = h.nivel ? FACTOR_NIVEL[h.nivel] : null;
  const a = h.anios;
  const porAnios = a == null ? null : a >= 5 ? 1 : a >= 3 ? 0.95 : a >= 1 ? 0.8 : 0.65;
  if (porNivel == null && porAnios == null) return 0.85;
  return Math.max(porNivel ?? 0, porAnios ?? 0);
}

function aHabilidad(h: string | HabilidadPerfil): HabilidadPerfil {
  return typeof h === "string" ? { nombre: h } : h;
}

function detalleDominio(h: HabilidadPerfil): string {
  const partes = [h.nivel ? NIVEL_LABEL[h.nivel] : null, h.anios ? `${h.anios} ${h.anios === 1 ? "año" : "años"}` : null];
  const txt = partes.filter(Boolean).join(", ");
  return txt ? ` (${txt})` : "";
}

// Cumple si el respaldo supera 0.7: dominio intermedio o más, directo o por equivalencia.
// Un nivel básico, una habilidad afín o una mención en texto quedan como parcial.
const estadoDe = (c: number): EstadoRequisito => (c > 0.7 ? "cumple" : c > 0 ? "parcial" : "falta");

// Crédito para una tecnología que no está en "Habilidades" pero el candidato
// menciona en su resumen o en las funciones de un cargo.
const CREDITO_MENCION = 0.5;

interface Mencion {
  gramas: Set<string>;
  fuente: string;
}

function textosDelPerfil(perfil: PerfilScoring): Mencion[] {
  const textos: Mencion[] = [];
  if (perfil.resumen) textos.push({ gramas: ngramas(perfil.resumen), fuente: "tu resumen profesional" });
  for (const e of perfil.experiencias ?? []) {
    if (e.descripcion) {
      textos.push({
        gramas: ngramas(e.descripcion),
        fuente: `tu experiencia${e.empresa ? ` en ${e.empresa}` : ` como ${e.cargo}`}`,
      });
    }
  }
  // Cursos, certificaciones y títulos también evidencian conocimientos ("Curso de Docker").
  for (const ed of perfil.educacion ?? []) {
    textos.push({ gramas: ngramas(ed.titulo), fuente: `tu formación (${ed.titulo})` });
  }
  return textos;
}

/* ---------------- Áreas del candidato ---------------- */

interface Cobertura {
  valor: number;
  fuente: string;
}

// Cuánto acredita un rol el tiempo ejercido: una semana como "Full Stack" no es
// lo mismo que tres años. 2+ años = 1; menos de 3 meses apenas cuenta.
export function factorTiempo(anios: number): number {
  return anios >= 2 ? 1 : anios >= 1 ? 0.9 : anios >= 0.5 ? 0.75 : anios >= 0.25 ? 0.5 : 0.25;
}

// Certeza (0-1) con la que el perfil cubre cada área, y de dónde sale:
// cargos (según el tiempo ejercido), titular (declarado; pesa completo si la
// experiencia lo respalda) y habilidades sueltas.
function coberturaDeAreas(
  perfil: PerfilScoring,
  habilidades: HabilidadPerfil[],
  ahora: Date
): Map<Area, Cobertura> {
  const cob = new Map<Area, Cobertura>();
  const subir = (area: Area, valor: number, fuente: string) => {
    if ((cob.get(area)?.valor ?? 0) < valor) cob.set(area, { valor, fuente });
  };

  // 1. Cargos: años ejercidos en cada área, sin contar dos veces los simultáneos.
  const porArea = new Map<Area, { exps: ExperienciaPerfil[]; especifico: boolean }>();
  for (const e of perfil.experiencias ?? []) {
    for (const rol of rolesDeCargo(e.cargo)) {
      for (const area of rol.areas) {
        const actual = porArea.get(area) ?? { exps: [], especifico: false };
        if (!actual.exps.includes(e)) actual.exps.push(e);
        actual.especifico ||= !rol.generico;
        porArea.set(area, actual);
      }
    }
  }
  const respaldoPorCargos = new Map<Area, number>();
  porArea.forEach(({ exps, especifico }, area) => {
    const conFechas = exps.filter((e) => e.inicio);
    const anios = aniosTotales(conFechas, ahora);
    const base = conFechas.length ? factorTiempo(anios) : 0.5; // sin fechas: no se puede medir
    const valor = base * (especifico ? 1 : 0.7);
    const principal = [...exps].sort((a, b) => aniosDe(b, ahora) - aniosDe(a, ahora))[0];
    const tiempo = conFechas.length ? formatoDuracion(anios) : "sin fechas";
    respaldoPorCargos.set(area, valor);
    subir(area, valor, `tu experiencia como ${principal.cargo} (${tiempo})`);
  });

  // 2. Titular y habilidades que en realidad son roles ("Full Stack"): declarados,
  //    cuentan completo si la experiencia en esa área lo respalda (6+ meses).
  const declarados: [string, string][] = [];
  if (perfil.titular) declarados.push([perfil.titular, `tu perfil ${perfil.titular}`]);
  for (const h of habilidades) if (!resolverHabilidad(h.nombre)) declarados.push([h.nombre, `tu perfil ${h.nombre}`]);
  for (const [texto, fuente] of declarados) {
    for (const rol of rolesDeCargo(texto)) {
      for (const area of rol.areas) {
        const respaldado = (respaldoPorCargos.get(area) ?? 0) >= 0.75;
        subir(area, rol.generico ? 0.7 : respaldado ? 1 : 0.85, fuente);
      }
    }
  }

  // 3. Habilidades técnicas agrupadas por área.
  const habilidadesPorArea = new Map<Area, string[]>();
  for (const h of habilidades) {
    const s = resolverHabilidad(h.nombre);
    for (const area of s?.areas ?? []) {
      habilidadesPorArea.set(area, [...(habilidadesPorArea.get(area) ?? []), s!.nombre]);
    }
  }
  habilidadesPorArea.forEach((nombres, area) => {
    const n = nombres.length;
    const valor = n >= 3 ? 0.8 : n === 2 ? 0.6 : 0.4;
    subir(area, valor, `tus habilidades de ${AREA_LABEL[area]} (${nombres.slice(0, 3).join(", ")})`);
  });
  return cob;
}

// Cobertura de un área considerando áreas vecinas (backend aporta a datos).
function cubreArea(cob: Map<Area, Cobertura>, area: Area): Cobertura {
  let mejor: Cobertura = { valor: 0, fuente: "" };
  cob.forEach((c, desde) => {
    const v = c.valor * adyacencia(desde, area);
    if (v > mejor.valor) mejor = { valor: v, fuente: c.fuente };
  });
  return mejor;
}

/* ---------------- Habilidades ---------------- */

// Qué tanto respalda el perfil una habilidad concreta del catálogo.
function evaluarHabilidad(
  req: HabilidadCatalogo,
  habilidades: HabilidadPerfil[],
  menciones: Mencion[]
): { credito: number; motivo: string } {
  let mejor = { credito: 0, motivo: "No aparece en tu perfil" };
  for (const h of habilidades) {
    const propia = resolverHabilidad(h.nombre);
    if (!propia) continue;
    const f = factorDominio(h);
    let credito = 0;
    let motivo = "";
    if (propia.id === req.id) {
      credito = f;
      motivo = `Lo tienes${detalleDominio(h)}`;
    } else if (cubiertas(propia.id).has(req.id)) {
      credito = 0.9 * f;
      motivo = `Lo cubre tu dominio de ${propia.nombre}`;
    } else {
      const afin = propia.afines.find(([id]) => id === req.id)?.[1] ?? 0;
      if (afin) {
        credito = afin * f;
        motivo = `Relacionado: manejas ${propia.nombre}`;
      }
    }
    if (credito > mejor.credito) mejor = { credito, motivo };
  }
  if (mejor.credito < CREDITO_MENCION) {
    const claves = [req.id, req.nombre, ...req.alias].map(clave);
    const mencion = menciones.find((m) => claves.some((k) => m.gramas.has(k)));
    if (mencion) {
      mejor = {
        credito: CREDITO_MENCION,
        motivo: `Lo mencionas en ${mencion.fuente}; agrégalo a tus habilidades con su nivel`,
      };
    }
  }
  return mejor;
}

function evaluarRequisito(
  requisito: string,
  habilidades: HabilidadPerfil[],
  cob: Map<Area, Cobertura>,
  menciones: Mencion[]
): EvaluacionRequisito {
  const resultado = (credito: number, motivo: string): EvaluacionRequisito => ({
    requisito,
    credito,
    estado: estadoDe(credito),
    motivo,
  });

  // 1. Una habilidad del catálogo escrita de cualquier forma ("node js").
  const req = resolverHabilidad(requisito);
  if (req) {
    const r = evaluarHabilidad(req, habilidades, menciones);
    return resultado(r.credito, r.motivo);
  }

  // 2. Una frase que nombra tecnologías ("Experiencia con React y Node.js"):
  //    se evalúa cada una y se promedia.
  const mencionadas = habilidadesMencionadas(requisito);
  if (mencionadas.length) {
    const evaluadas = mencionadas.map((s) => ({ s, ...evaluarHabilidad(s, habilidades, menciones) }));
    const credito = evaluadas.reduce((t, e) => t + e.credito, 0) / evaluadas.length;
    const motivo = evaluadas
      .map((e) => `${e.s.nombre}: ${e.motivo.charAt(0).toLowerCase()}${e.motivo.slice(1)}`)
      .join(" · ");
    return resultado(credito, motivo);
  }

  // 3. Requisito genérico de área ("Backend", "Experiencia en frontend").
  const areas = areasDeRequisito(requisito);
  if (areas.length) {
    const coberturas = areas.map((a) => cubreArea(cob, a));
    const credito = coberturas.reduce((t, c) => t + c.valor, 0) / areas.length;
    const fuente = coberturas.find((c) => c.valor > 0)?.fuente;
    return resultado(credito, fuente ? `Lo cubre ${fuente}` : "Tu perfil no muestra esta área");
  }

  // 4. Fuera del catálogo: coincidencia literal (sin mayúsculas ni signos).
  const propia = habilidades.find((h) => clave(h.nombre) === clave(requisito));
  return propia
    ? resultado(factorDominio(propia), `Lo tienes${detalleDominio(propia)}`)
    : resultado(0, "No aparece en tu perfil");
}

/* ---------------- Rol y experiencia ---------------- */

function evaluarRol(areasVacante: Area[], cob: Map<Area, Cobertura>): { valor: number; motivo: string } {
  if (areasVacante.length === 0) return { valor: 1, motivo: "La vacante no define un rol específico." };
  const coberturas = areasVacante.map((a) => cubreArea(cob, a));
  const valor = coberturas.reduce((s, c) => s + c.valor, 0) / areasVacante.length;
  const nombres = areasVacante.map((a) => AREA_LABEL[a]).join(" y ");
  const fuente = coberturas.filter((c) => c.valor > 0).sort((a, b) => b.valor - a.valor)[0]?.fuente;
  if (!fuente) return { valor, motivo: `Tu perfil aún no muestra experiencia en ${nombres}.` };
  if (valor >= 0.95) return { valor, motivo: `Rol ${nombres}: lo cubre ${fuente}.` };
  return { valor, motivo: `Rol ${nombres}: cubierto en parte por ${fuente}.` };
}

// Años relevantes: los cargos del área de la vacante cuentan completos y el resto
// del tiempo trabajado (otras áreas) a la mitad. Los periodos se unen antes de
// sumar, así dos cargos simultáneos no cuentan doble.
function evaluarExperiencia(
  perfil: PerfilScoring,
  vacante: VacanteScoring,
  areasVacante: Area[],
  ahora: Date
): { valor: number; motivo: string } {
  const exps = perfil.experiencias ?? [];
  const esAfin = (e: ExperienciaPerfil) => {
    const areas = areasDeCargo(e.cargo);
    return (
      areasVacante.length === 0 || areas.some((a) => areasVacante.some((v) => adyacencia(a, v) >= 0.5))
    );
  };
  const delArea = aniosTotales(exps.filter(esAfin), ahora);
  const total = aniosTotales(exps, ahora);
  const relevantes = delArea + 0.5 * Math.max(0, total - delArea);
  const anios = formatoDuracion(relevantes);
  const min = vacante.experienciaMin ?? 0;
  const pide = `Pide ${min} ${min === 1 ? "año" : "años"}`;

  if (min <= 0) {
    return {
      valor: 1,
      motivo:
        relevantes > 0
          ? `Sin mínimo exigido; aportas ${anios} de experiencia relevante.`
          : "La vacante no exige años de experiencia.",
    };
  }
  const valor = Math.min(1, relevantes / min);
  if (valor >= 1) return { valor, motivo: `${pide}; tienes ${anios} de experiencia relevante.` };
  const sinFechas = exps.length > 0 && exps.every((e) => !e.inicio);
  return {
    valor,
    motivo: sinFechas
      ? `${pide}. Agrega las fechas de tus cargos para contarlos.`
      : relevantes > 0
        ? `${pide}; tienes ${anios} de experiencia relevante.`
        : `${pide}; aún no registras experiencia relevante.`,
  };
}

/* ---------------- Score total ---------------- */

export function matchScore(
  perfil: PerfilScoring,
  vacante: VacanteScoring,
  pesos = PESOS_DEFAULT,
  ahora = new Date()
): ResultadoScoring {
  const habilidades = perfil.habilidades.map(aHabilidad);
  const cob = coberturaDeAreas(perfil, habilidades, ahora);
  const menciones = textosDelPerfil(perfil);

  const requisitos = vacante.requisitos
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => evaluarRequisito(r, habilidades, cob, menciones));
  const skills =
    requisitos.length === 0
      ? 1 // sin requisitos: vacante abierta a cualquier perfil
      : requisitos.reduce((s, r) => s + r.credito, 0) / requisitos.length;

  const areasVacante = areasDeCargo(vacante.titulo);
  const rol = evaluarRol(areasVacante, cob);
  const experiencia = evaluarExperiencia(perfil, vacante, areasVacante, ahora);

  // Salario: 1 si la vacante cae dentro del rango esperado; degrada si está por debajo.
  let salario = 0;
  if (vacante.salario == null) {
    salario = 0.5; // sin dato: neutro
  } else {
    const min = perfil.salarioMin ?? 0;
    const max = perfil.salarioMax ?? Number.MAX_SAFE_INTEGER;
    if (vacante.salario >= min && vacante.salario <= max) salario = 1;
    else if (vacante.salario > max) salario = 0.8; // paga más: aceptable
    else salario = Math.max(0, vacante.salario / Math.max(min, 1));
  }

  // Modalidad: 1 si no hay preferencia del candidato o la vacante no especifica;
  // si ambas están declaradas se usa la tabla de compatibilidad (híbrido cubre
  // presencial y remoto, no solo híbrido).
  const modalidad =
    !perfil.modalidad || !vacante.modalidad
      ? 1
      : COMPAT_MODALIDAD[perfil.modalidad][vacante.modalidad];

  // Ubicación: 1 si coincide ciudad, o si la modalidad es remoto, o sin preferencia.
  const ubicacion =
    !perfil.ciudad ||
    perfil.modalidad === "REMOTO" ||
    vacante.modalidad === "REMOTO" ||
    clave(perfil.ciudad) === clave(vacante.ciudad ?? "")
      ? 1
      : 0;

  const desglose: Desglose = {
    skills,
    rol: rol.valor,
    experiencia: experiencia.valor,
    salario,
    modalidad,
    ubicacion,
  };

  const total =
    skills * pesos.skills +
    rol.valor * pesos.rol +
    experiencia.valor * pesos.experiencia +
    salario * pesos.salario +
    modalidad * pesos.modalidad +
    ubicacion * pesos.ubicacion;

  // score 0-100, redondeado para estabilidad.
  return {
    score: Math.round(total * 100),
    desglose,
    requisitos,
    motivoRol: rol.motivo,
    motivoExperiencia: experiencia.motivo,
  };
}

// Nombre canónico de catálogo para mostrar ("node js" -> "Node.js").
export function nombreCanonico(texto: string): string {
  return resolverHabilidad(texto)?.nombre ?? texto.trim();
}
