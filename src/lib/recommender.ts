// Recomendador baseline explicable (E5 / HU-24).
// Toma el perfil del candidato y el catálogo de vacantes, calcula el matchScore
// de cada una y las ordena de mayor a menor. Separa el parsing de requisitos
// (texto -> lista) de la lógica de scoring, que vive en scoring.ts.
import { matchScore, Modalidad, PerfilScoring, ResultadoScoring } from "./scoring";

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
export function parseRequisitos(requisitos?: string | null): string[] {
  return (requisitos ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildRecommendations<V extends VacanteInput>(
  perfil: PerfilInput,
  vacantes: V[],
  ahora = new Date()
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
        undefined,
        ahora
      ),
    }))
    .sort((a, b) => b.score - a.score);
}
