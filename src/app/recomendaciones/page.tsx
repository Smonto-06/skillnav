// E5 · Recomendaciones ordenadas por matchScore (HU-24).
// Lista de vacantes desde BD + puntaje + acción "Postularse" por registro.
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRecommendations, parseRequisitos } from "@/lib/recommender";
import { detalleVacante, explicarCoincidencias, filtrarVacantes } from "@/lib/presentacion";
import { Alert, Card } from "@/components/ui";
import { BotonPostular, BuscadorVacantes, MatchRing } from "@/components/vacantes";
import type { Modalidad } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const DIMENSIONES = [
  { clave: "skills", etiqueta: "Habilidades", peso: "50%" },
  { clave: "salario", etiqueta: "Salario", peso: "20%" },
  { clave: "modalidad", etiqueta: "Modalidad", peso: "20%" },
  { clave: "ubicacion", etiqueta: "Ubicación", peso: "10%" },
] as const;

export default async function RecomendacionesPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string; q?: string; ciudad?: string };
}) {
  const candidato = await requireCandidato();

  const [habilidades, preferencia, vacantes, postulaciones] = await Promise.all([
    prisma.habilidad.findMany({ where: { candidatoId: candidato.id } }),
    prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } }),
    prisma.vacante.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.postulacion.findMany({ where: { candidatoId: candidato.id }, select: { vacanteId: true } }),
  ]);

  const yaPostulado = new Set(postulaciones.map((p) => p.vacanteId));
  const nombres = habilidades.map((h) => h.nombre);

  const filtrando = !!(searchParams.q?.trim() || searchParams.ciudad?.trim());
  const recomendaciones = buildRecommendations(
    {
      habilidades: nombres,
      salarioMin: preferencia?.salarioMin,
      salarioMax: preferencia?.salarioMax,
      modalidad: preferencia?.modalidad as Modalidad | null,
      ciudad: preferencia?.ubicacion,
    },
    filtrarVacantes(vacantes, searchParams.q, searchParams.ciudad)
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Vacantes recomendadas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ordenadas por compatibilidad con tu perfil y preferencias.
      </p>
      <div className="mt-6 rounded-xl border border-acento/30 bg-acento-suave px-5 py-4 text-sm leading-relaxed text-slate-700">
        <strong className="text-slate-900">¿Qué significa el porcentaje (Match Score)?</strong> Es
        la compatibilidad entre tu perfil y cada vacante, calculada en tiempo real. Considera tus
        habilidades (50%), rango salarial (20%), modalidad preferida (20%) y ciudad (10%). El
        porcentaje <strong className="text-slate-900">cambia</strong> según la información que
        tengas en tu perfil: a más habilidades y preferencias completas, más preciso y útil es el
        resultado. Cada vacante explica qué habilidades coinciden y cuáles podrías fortalecer.
      </div>

      <div className="mt-6">
        <BuscadorVacantes q={searchParams.q} ciudad={searchParams.ciudad} />
      </div>
      {filtrando && (
        <p className="mt-3 text-sm text-slate-500">
          {recomendaciones.length} de {vacantes.length} vacantes coinciden con tu búsqueda ·{" "}
          <a href="/recomendaciones" className="font-medium text-acento-texto hover:underline">
            Quitar filtros
          </a>
        </p>
      )}

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      {recomendaciones.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-slate-500">
            {filtrando
              ? "Ninguna vacante coincide con tu búsqueda. Prueba con otros términos."
              : "No hay vacantes en el catálogo todavía."}
          </p>
        </Card>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {recomendaciones.map(({ vacante, score, desglose }) => (
            <li key={vacante.id} id={vacante.id} className="scroll-mt-6">
              <Card className="h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{vacante.titulo}</h2>
                    <p className="text-slate-600">{vacante.empresa}</p>
                    <p className="mt-1 text-sm text-slate-500">{detalleVacante(vacante)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-3">
                    <MatchRing score={score} />
                    <BotonPostular
                      vacanteId={vacante.id}
                      postulado={yaPostulado.has(vacante.id)}
                      volverA="/recomendaciones?ok=Postulado+exitosamente"
                    />
                  </div>
                </div>

                {vacante.descripcion && (
                  <p className="mt-3 text-sm text-slate-600">{vacante.descripcion}</p>
                )}
                {vacante.requisitos && (
                  <p className="mt-2 text-sm text-slate-500">Requisitos: {vacante.requisitos}</p>
                )}
                <p className="mt-3 text-sm text-slate-600">
                  {explicarCoincidencias(nombres, parseRequisitos(vacante.requisitos))}
                </p>

                <details className="group mt-4 text-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-acento-texto [&::-webkit-details-marker]:hidden">
                    <span className="text-xs transition-transform group-open:rotate-90">▶</span>
                    Cómo se calcula tu compatibilidad
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {DIMENSIONES.map((d) => {
                      const valor = Math.round(desglose[d.clave] * 100);
                      return (
                        <li key={d.clave}>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>
                              {d.etiqueta} <span className="text-slate-400">(peso {d.peso})</span>
                            </span>
                            <span className="font-medium text-slate-700">{valor}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-acento"
                              style={{ width: `${valor}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
