// Carga desde BD todo lo que el motor de scoring necesita de un candidato.
// Centralizado para que Inicio y Recomendaciones evalúen exactamente igual.
import { prisma } from "./prisma";
import type { Modalidad, PerfilScoring } from "./scoring";

export async function cargarPerfilScoring(candidato: {
  id: string;
  titular?: string | null;
  resumen?: string | null;
}): Promise<{ perfil: PerfilScoring; tienePreferencia: boolean }> {
  const [habilidades, experiencias, preferencia] = await Promise.all([
    prisma.habilidad.findMany({ where: { candidatoId: candidato.id } }),
    prisma.experiencia.findMany({ where: { candidatoId: candidato.id } }),
    prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } }),
  ]);
  return {
    perfil: {
      habilidades: habilidades.map((h) => ({ nombre: h.nombre, nivel: h.nivel, anios: h.anios })),
      titular: candidato.titular,
      resumen: candidato.resumen,
      experiencias: experiencias.map((e) => ({
        cargo: e.cargo,
        empresa: e.empresa,
        descripcion: e.descripcion,
        inicio: e.fechaInicio,
        fin: e.fechaFin,
        actual: e.actual,
      })),
      salarioMin: preferencia?.salarioMin,
      salarioMax: preferencia?.salarioMax,
      modalidad: preferencia?.modalidad as Modalidad | null,
      ciudad: preferencia?.ubicacion,
    },
    tienePreferencia: !!preferencia,
  };
}
