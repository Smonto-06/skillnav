// HU-28 y HU-29 · Recálculo masivo de scores y métricas del administrador.
//
// Todo sale de la base de datos real: no hay números de ejemplo. Si una métrica
// no se puede calcular con los datos que hay, se reporta como tal en lugar de
// inventar un valor.
import { prisma } from "./prisma";
import { buildRecommendations } from "./recommender";
import { cargarPerfilScoring } from "./perfil-scoring";
import { pesosDesdeConfiguracion } from "./scoring/configuracion";
import { ESTADOS_POSTULACION } from "./presentacion";

/** Umbral a partir del cual un match se considera bueno (HU-29). */
export const UMBRAL_BUEN_MATCH = 60;

export interface ResultadoRecalculo {
  perfiles: number;
  vacantes: number;
  paresEvaluados: number;
  errores: number;
  detalleErrores: string[];
  duracionMs: number;
  /** Cuántos pares superaron el umbral de buen match. */
  buenosMatches: number;
}

/**
 * HU-28 · Recalcula el score de cada candidato contra cada vacante.
 *
 * Los scores se calculan en vivo en cada carga de `/recomendaciones`, así que
 * este proceso no "arregla" datos desactualizados: sirve para verificar que el
 * motor corre sin errores sobre todos los datos reales y para darle al
 * administrador los números de la salud del catálogo. Eso es lo que pide el
 * criterio de aceptación: informar cuántos procesó y cuántos fallaron.
 *
 * Un fallo en un candidato no detiene el proceso: se cuenta, se guarda el
 * mensaje y se sigue con el siguiente.
 */
export async function recalcularScores(): Promise<ResultadoRecalculo> {
  const inicio = Date.now();

  const [candidatos, vacantes] = await Promise.all([
    prisma.candidato.findMany({ where: { rol: "CANDIDATO" }, select: { id: true, email: true, titular: true, resumen: true } }),
    prisma.vacante.findMany(),
  ]);

  const pesos = pesosDesdeConfiguracion(
    await prisma.configuracionScoring.findUnique({ where: { id: 1 } })
  );

  let paresEvaluados = 0;
  let buenosMatches = 0;
  const detalleErrores: string[] = [];

  for (const c of candidatos) {
    try {
      const { perfil } = await cargarPerfilScoring(c);
      const recomendaciones = buildRecommendations(perfil, vacantes, new Date(), pesos);
      paresEvaluados += recomendaciones.length;
      buenosMatches += recomendaciones.filter((r) => r.score >= UMBRAL_BUEN_MATCH).length;
    } catch (e) {
      // Se registra con el correo para poder encontrar el perfil que falló.
      detalleErrores.push(`${c.email}: ${e instanceof Error ? e.message : "error desconocido"}`);
    }
  }

  return {
    perfiles: candidatos.length,
    vacantes: vacantes.length,
    paresEvaluados,
    errores: detalleErrores.length,
    detalleErrores,
    duracionMs: Date.now() - inicio,
    buenosMatches,
  };
}

export interface Metricas {
  candidatos: number;
  candidatosConPerfilUtil: number;
  vacantes: number;
  vacantesSinPostulaciones: number;
  postulaciones: number;
  /** Postulaciones por candidato registrado (no por candidato que postuló). */
  tasaPostulacion: number | null;
  porEstado: { etiqueta: string; cantidad: number }[];
  /** Vacantes con más postulaciones. */
  vacantesPopulares: { titulo: string; empresa: string; postulaciones: number }[];
  ultimoRecalculo: {
    fecha: Date;
    perfiles: number;
    vacantes: number;
    paresEvaluados: number;
    errores: number;
    duracionMs: number;
  } | null;
}

/**
 * HU-29 · Métricas de la plataforma, todas calculadas sobre la BD.
 *
 * `tasaPostulacion` devuelve null cuando no hay candidatos: dividir por cero
 * daría NaN o Infinity, y mostrar "0%" sería mentir — no es que la tasa sea
 * cero, es que todavía no hay nada que medir.
 */
export async function obtenerMetricas(): Promise<Metricas> {
  const [candidatos, vacantes, postulaciones, agrupadoEstado, agrupadoVacante, ultimo] =
    await Promise.all([
      prisma.candidato.count({ where: { rol: "CANDIDATO" } }),
      prisma.vacante.count(),
      // El mismo filtro de rol que el conteo de candidatos. Sin él, numerador
      // y denominador miden poblaciones distintas: una cuenta ADMIN puede
      // postularse, y sus postulaciones sumaban arriba pero no abajo. Con un
      // solo admin con tres postulaciones y ningún candidato activo, el panel
      // llegaba a mostrar "3 postulaciones por candidato".
      prisma.postulacion.count({ where: { candidato: { rol: "CANDIDATO" } } }),
      prisma.postulacion.groupBy({ by: ["estado"], _count: { _all: true } }),
      prisma.postulacion.groupBy({ by: ["vacanteId"], _count: { _all: true } }),
      prisma.ejecucionRecalculo.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

  // Un perfil es "útil" para el motor si tiene al menos una habilidad: sin
  // eso, la dimensión que pesa 40% no tiene con qué comparar.
  const candidatosConPerfilUtil = await prisma.candidato.count({
    where: { rol: "CANDIDATO", habilidades: { some: {} } },
  });

  const conPostulaciones = new Set(agrupadoVacante.map((g) => g.vacanteId));
  const idsPopulares = [...agrupadoVacante]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 5);
  const vacantesPopulares = idsPopulares.length
    ? (
        await prisma.vacante.findMany({
          where: { id: { in: idsPopulares.map((g) => g.vacanteId) } },
          select: { id: true, titulo: true, empresa: true },
        })
      )
        .map((v) => ({
          titulo: v.titulo,
          empresa: v.empresa,
          postulaciones: idsPopulares.find((g) => g.vacanteId === v.id)?._count._all ?? 0,
        }))
        .sort((a, b) => b.postulaciones - a.postulaciones)
    : [];

  const porEstado = ESTADOS_POSTULACION.map((e) => ({
    etiqueta: e.plural,
    cantidad: agrupadoEstado.find((g) => g.estado === e.clave)?._count._all ?? 0,
  }));

  return {
    candidatos,
    candidatosConPerfilUtil,
    vacantes,
    vacantesSinPostulaciones: vacantes - conPostulaciones.size,
    postulaciones,
    tasaPostulacion: candidatos > 0 ? postulaciones / candidatos : null,
    porEstado,
    vacantesPopulares,
    ultimoRecalculo: ultimo
      ? {
          fecha: ultimo.createdAt,
          perfiles: ultimo.perfiles,
          vacantes: ultimo.vacantes,
          paresEvaluados: ultimo.paresEvaluados,
          errores: ultimo.errores,
          duracionMs: ultimo.duracionMs,
        }
      : null,
  };
}
