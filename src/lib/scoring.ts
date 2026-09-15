// Motor de scoring (HU-24) - calculo determinista de compatibilidad perfil <-> vacante.
// Mismos datos -> mismo score. Devuelve el desglose para transparencia (Match Score).

export type Modalidad = "PRESENCIAL" | "REMOTO" | "HIBRIDO";

export interface PerfilScoring {
  habilidades: string[];
  salarioMin?: number | null;
  salarioMax?: number | null;
  modalidad?: Modalidad | null;
  ciudad?: string | null;
}

export interface VacanteScoring {
  requisitos: string[];
  salario?: number | null;
  modalidad?: Modalidad | null;
  ciudad?: string | null;
}

export interface Desglose {
  skills: number;
  salario: number;
  modalidad: number;
  ubicacion: number;
}

// Pesos por defecto (configurables por el admin en E7). Suman 1.
export const PESOS_DEFAULT = {
  skills: 0.5,
  salario: 0.2,
  modalidad: 0.2,
  ubicacion: 0.1,
} as const;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function matchScore(
  perfil: PerfilScoring,
  vacante: VacanteScoring,
  pesos = PESOS_DEFAULT
): { score: number; desglose: Desglose } {
  // Skills: proporcion de requisitos cubiertos por las habilidades del candidato.
  const skillsCand = new Set(perfil.habilidades.map(norm));
  const reqs = vacante.requisitos.map(norm).filter(Boolean);
  const skills =
    reqs.length === 0
      ? 0
      : reqs.filter((r) => skillsCand.has(r)).length / reqs.length;

  // Salario: 1 si la vacante cae dentro del rango esperado; degrada si esta por debajo.
  let salario = 0;
  if (vacante.salario == null) {
    salario = 0.5; // sin dato: neutro
  } else {
    const min = perfil.salarioMin ?? 0;
    const max = perfil.salarioMax ?? Number.MAX_SAFE_INTEGER;
    if (vacante.salario >= min && vacante.salario <= max) salario = 1;
    else if (vacante.salario > max) salario = 0.8; // paga mas: aceptable
    else salario = Math.max(0, vacante.salario / Math.max(min, 1));
  }

  // Modalidad: 1 si coincide o no hay preferencia.
  const modalidad =
    !perfil.modalidad || perfil.modalidad === vacante.modalidad ? 1 : 0;

  // Ubicacion: 1 si coincide ciudad, o si la modalidad es remoto, o sin preferencia.
  const ubicacion =
    !perfil.ciudad ||
    perfil.modalidad === "REMOTO" ||
    norm(perfil.ciudad) === norm(vacante.ciudad ?? "")
      ? 1
      : 0;

  const desglose: Desglose = { skills, salario, modalidad, ubicacion };

  const total =
    skills * pesos.skills +
    salario * pesos.salario +
    modalidad * pesos.modalidad +
    ubicacion * pesos.ubicacion;

  // score 0-100, redondeado para estabilidad.
  return { score: Math.round(total * 100), desglose };
}
