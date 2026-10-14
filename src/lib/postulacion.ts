// Reglas de postulación (E6), separadas de la acción para poder probarlas.
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Solo se permite volver a una ruta interna ("/recomendaciones?ok=..."): un valor
// externo ("https://...", "//otro-sitio") convertiría el botón en una redirección
// abierta, porque el destino viaja en un campo oculto que el usuario puede alterar.
export function rutaInterna(destino: string | null | undefined, porDefecto: string): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) {
    return porDefecto;
  }
  return destino;
}

export type ResultadoPostulacion = "creada" | "existente" | "vacante-inexistente";

// Crea la postulación una sola vez aunque lleguen varios envíos simultáneos
// (doble clic, red lenta). Buscar-y-crear corre en una transacción SERIALIZABLE:
// si dos envíos compiten, Postgres aborta uno y ese envío se trata como "ya existía".
export async function postular(candidatoId: string, vacanteId: string): Promise<ResultadoPostulacion> {
  const vacante = await prisma.vacante.findUnique({ where: { id: vacanteId }, select: { id: true } });
  if (!vacante) return "vacante-inexistente";
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existente = await tx.postulacion.findFirst({ where: { candidatoId, vacanteId } });
        if (existente) return "existente" as const;
        await tx.postulacion.create({ data: { candidatoId, vacanteId } });
        return "creada" as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (e) {
    // P2034: conflicto de serialización; otro envío simultáneo ya la creó.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") return "existente";
    throw e;
  }
}
