// E5 · Recomendaciones ordenadas por matchScore (HU-24).
// Lista de vacantes desde BD + puntaje + acción "Postularse" por registro.
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRecommendations } from "@/lib/recommender";
import { Alert, Card } from "@/components/ui";
import { postularseAction } from "@/app/postulaciones/actions";
import type { Modalidad } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function RecomendacionesPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const candidato = await requireCandidato();

  const [habilidades, preferencia, vacantes, postulaciones] = await Promise.all([
    prisma.habilidad.findMany({ where: { candidatoId: candidato.id } }),
    prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } }),
    prisma.vacante.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.postulacion.findMany({ where: { candidatoId: candidato.id }, select: { vacanteId: true } }),
  ]);

  const yaPostulado = new Set(postulaciones.map((p) => p.vacanteId));

  const recomendaciones = buildRecommendations(
    {
      habilidades: habilidades.map((h) => h.nombre),
      salarioMin: preferencia?.salarioMin,
      salarioMax: preferencia?.salarioMax,
      modalidad: preferencia?.modalidad as Modalidad | null,
      ciudad: preferencia?.ubicacion,
    },
    vacantes
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold">Vacantes recomendadas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Ordenadas por compatibilidad con tu perfil y preferencias.
      </p>

      {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
      {searchParams.error && <Alert message={searchParams.error} />}

      {vacantes.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No hay vacantes en el catálogo todavía.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {recomendaciones.map(({ vacante, score, desglose }) => (
            <li key={vacante.id}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="font-semibold">{vacante.titulo}</h2>
                    <p className="text-sm text-slate-600">{vacante.empresa}</p>
                    {vacante.ciudad && (
                      <p className="text-xs text-slate-400">{vacante.ciudad} · {vacante.modalidad}</p>
                    )}
                    {vacante.descripcion && (
                      <p className="mt-1 text-sm text-slate-600">{vacante.descripcion}</p>
                    )}
                    {vacante.requisitos && (
                      <p className="mt-1 text-xs text-slate-400">
                        Requisitos: {vacante.requisitos}
                      </p>
                    )}
                    <details className="mt-2 text-xs text-slate-400">
                      <summary className="cursor-pointer">Desglose del score</summary>
                      <ul className="mt-1 ml-4 space-y-0.5">
                        <li>Skills: {Math.round(desglose.skills * 100)}%</li>
                        <li>Salario: {Math.round(desglose.salario * 100)}%</li>
                        <li>Modalidad: {Math.round(desglose.modalidad * 100)}%</li>
                        <li>Ubicación: {Math.round(desglose.ubicacion * 100)}%</li>
                      </ul>
                    </details>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                      {score}%
                    </span>
                    {yaPostulado.has(vacante.id) ? (
                      <span className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-400">
                        Postulado
                      </span>
                    ) : (
                      <form action={postularseAction}>
                        <input type="hidden" name="vacanteId" value={vacante.id} />
                        <input type="hidden" name="redirect" value="/recomendaciones?ok=Postulado+exitosamente" />
                        <button className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
                          Postularse
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
