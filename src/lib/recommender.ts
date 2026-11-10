// Recomendador baseline explicable (E5 / HU-24).
// Toma el perfil del candidato y el catálogo de vacantes, calcula el matchScore
// de cada una y las ordena de mayor a menor. Separa el parsing de requisitos
// (texto -> lista) de la lógica de scoring, que vive en scoring.ts.
import {
  PESOS_DEFAULT,
  matchScore,
  type Modalidad,
  type Pesos,
  type PerfilScoring,
  type ResultadoScoring,
} from "./scoring";

export interface VacanteInput {
  id: string;
  titulo: string;
  empresa: string;
  descripcion?: string | null;
  requisitos?: string | null;
  experienciaMin?: number | null;
  salario?: number | null;
  modalidad?: Modalidad | null;
  ciudad?: string | null;
}

export type PerfilInput = PerfilScoring;

export interface Recomendacion<V extends VacanteInput = VacanteInput> extends ResultadoScoring {
  vacante: V;
}

// Convierte "React, TypeScript, Node" -> ["React","TypeScript","Node"].
//
// Se descartan los trozos sin letras ni dígitos: en un "React, -, Node"
// escrito a mano, el guión quedaba como un requisito más, siempre incumplido,
// que hundía el promedio de la dimensión con más peso del Match Score.
export function parseRequisitos(requisitos?: string | null): string[] {
  return (requisitos ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

export function buildRecommendations<V extends VacanteInput>(
  perfil: PerfilInput,
  vacantes: V[],
  ahora = new Date(),
  // HU-27: los pesos los define el administrador. Si no se pasan se usan los
  // de fábrica, así que las llamadas que ya existían no cambian de resultado.
  pesos: Pesos = PESOS_DEFAULT
): Recomendacion<V>[] {
  return vacantes
    .map((vacante) => ({
      vacante,
      ...matchScore(
        perfil,
        {
          titulo: vacante.titulo,
          requisitos: parseRequisitos(vacante.requisitos),
          experienciaMin: vacante.experienciaMin,
          salario: vacante.salario,
          modalidad: vacante.modalidad,
          ciudad: vacante.ciudad,
        },
        pesos,
        ahora
      ),
    }))
    .sort((a, b) => b.score - a.score);
}
