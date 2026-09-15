// Recomendador baseline explicable (E5 / HU-24).
// Toma el perfil del candidato y el catálogo de vacantes, calcula el matchScore
// de cada una y las ordena de mayor a menor. Separa el parsing de requisitos
// (texto -> lista) de la lógica de scoring, que vive en scoring.ts.
import { matchScore, Desglose, Modalidad } from "./scoring";

export interface VacanteInput {
  id: string;
  titulo: string;
  empresa: string;
  descripcion?: string | null;
  requisitos?: string | null;
  salario?: number | null;
  modalidad?: Modalidad | null;
  ciudad?: string | null;
}

export interface PerfilInput {
  habilidades: string[];
  salarioMin?: number | null;
  salarioMax?: number | null;
  modalidad?: Modalidad | null;
  ciudad?: string | null;
}

export interface Recomendacion {
  vacante: VacanteInput;
  score: number;
  desglose: Desglose;
}

// Convierte "React, TypeScript, Node" -> ["React","TypeScript","Node"].
export function parseRequisitos(requisitos?: string | null): string[] {
  return (requisitos ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildRecommendations(
  perfil: PerfilInput,
  vacantes: VacanteInput[]
): Recomendacion[] {
  return vacantes
    .map((vacante) => {
      const { score, desglose } = matchScore(
        {
          habilidades: perfil.habilidades,
          salarioMin: perfil.salarioMin,
          salarioMax: perfil.salarioMax,
          modalidad: perfil.modalidad,
          ciudad: perfil.ciudad,
        },
        {
          requisitos: parseRequisitos(vacante.requisitos),
          salario: vacante.salario,
          modalidad: vacante.modalidad,
          ciudad: vacante.ciudad,
        }
      );
      return { vacante, score, desglose };
    })
    .sort((a, b) => b.score - a.score);
}
