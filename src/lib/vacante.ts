// Traducción de los datos del formulario de vacante (HU-26) a la forma que
// espera Prisma. Vive aparte de la Server Action para poder probarla sin
// levantar el servidor: es acá donde se decide qué significa "campo vacío".
import { vacanteSchema } from "./validation";

export interface VacanteData {
  titulo: string;
  empresa: string;
  descripcion: string | null;
  requisitos: string | null;
  experienciaMin: number | null;
  salario: number | null;
  modalidad: "PRESENCIAL" | "REMOTO" | "HIBRIDO" | null;
  ciudad: string | null;
}

export type ResultadoVacante =
  | { ok: true; data: VacanteData }
  | { ok: false; error: string };

// "" y undefined se guardan como null: una cadena vacía sería un valor real y
// el scoring la interpretaría como dato declarado.
function oNull<T>(valor: T | "" | undefined): T | null {
  return valor === "" || valor === undefined ? null : valor;
}

export function vacanteDesdeFormulario(raw: {
  titulo?: unknown;
  empresa?: unknown;
  descripcion?: unknown;
  requisitos?: unknown;
  experienciaMin?: unknown;
  salario?: unknown;
  modalidad?: unknown;
  ciudad?: unknown;
}): ResultadoVacante {
  const parsed = vacanteSchema.safeParse({
    titulo: raw.titulo,
    empresa: raw.empresa,
    descripcion: raw.descripcion,
    requisitos: raw.requisitos,
    // Un número vacío llega como "": lo tratamos como ausente, no como 0.
    experienciaMin: raw.experienciaMin || undefined,
    salario: raw.salario || undefined,
    modalidad: raw.modalidad,
    ciudad: raw.ciudad,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const d = parsed.data;
  return {
    ok: true,
    data: {
      titulo: d.titulo,
      empresa: d.empresa,
      descripcion: oNull(d.descripcion),
      requisitos: oNull(d.requisitos),
      experienciaMin: d.experienciaMin ?? null,
      salario: d.salario ?? null,
      modalidad: d.modalidad ?? null,
      ciudad: oNull(d.ciudad),
    },
  };
}
