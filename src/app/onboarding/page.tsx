// HU-03 · Wizard de onboarding guiado.
//
// No duplica formularios: cada paso lleva a la pantalla del perfil que ya
// existe. Así no hay dos formas de guardar lo mismo que luego se
// desincronicen; el wizard aporta el orden, el porqué y el avance.
import Link from "next/link";
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { estadoOnboarding } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const candidato = await requireCandidato();

  const [habilidadesCount, experienciaCount, preferencia] = await Promise.all([
    prisma.habilidad.count({ where: { candidatoId: candidato.id } }),
    prisma.experiencia.count({ where: { candidatoId: candidato.id } }),
    prisma.preferencia.findUnique({ where: { candidatoId: candidato.id }, select: { id: true } }),
  ]);

  const e = estadoOnboarding({
    nombre: candidato.nombre,
    titular: candidato.titular,
    habilidadesCount,
    experienciaCount,
    tienePreferencia: !!preferencia,
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-sm font-medium text-acento-texto">Bienvenido a SkillNav</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">
        {e.terminado ? "Tu perfil está listo" : "Completemos tu perfil"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {e.terminado
          ? "Ya tienes todo lo que el motor necesita para recomendarte vacantes con precisión."
          : "Cuatro pasos, en orden de cuánto mejoran tus recomendaciones. Puedes hacerlos ahora o cuando quieras."}
      </p>

      {/* Indicador de progreso */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            {e.completados} de {e.total} pasos
          </span>
          <span className="text-slate-500">{e.porcentaje}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={e.porcentaje}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance del onboarding"
        >
          <div
            className="h-full rounded-full bg-acento transition-all"
            style={{ width: `${e.porcentaje}%` }}
          />
        </div>
      </div>

      {/* Atajo: subir el CV completa varios pasos de una sola vez. */}
      {!e.terminado && (
        <div className="mt-6 rounded-xl border border-acento/30 bg-acento-suave px-5 py-4">
          <p className="text-sm text-slate-700">
            <strong className="text-slate-900">¿Tienes tu hoja de vida a mano?</strong> Súbela y
            llenamos varios de estos pasos de una sola vez; después solo revisas.
          </p>
          <Link
            href="/perfil/cv"
            className="mt-3 inline-block rounded-full bg-acento px-4 py-2 text-sm font-semibold text-marca hover:bg-acento-hover"
          >
            Subir hoja de vida
          </Link>
        </div>
      )}

      <ol className="mt-6 space-y-3">
        {e.pasos.map((p, i) => {
          const esSiguiente = e.siguiente?.clave === p.clave;
          return (
            <li key={p.clave}>
              <Card
                className={
                  esSiguiente ? "border-acento/50" : p.completo ? "bg-slate-50" : undefined
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      p.completo
                        ? "bg-acento text-marca"
                        : "border border-slate-300 text-slate-500"
                    }`}
                    aria-hidden
                  >
                    {p.completo ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {p.titulo}
                      {p.completo && (
                        <span className="ml-2 text-xs font-normal text-acento-texto">Listo</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{p.porQue}</p>
                  </div>
                  <Link
                    href={p.ruta}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
                      esSiguiente
                        ? "bg-acento text-marca hover:bg-acento-hover"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p.completo ? "Editar" : "Completar"}
                  </Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-5">
        {e.terminado ? (
          <Link
            href="/recomendaciones"
            className="rounded-full bg-acento px-5 py-2 text-sm font-semibold text-marca hover:bg-acento-hover"
          >
            Ver mis vacantes recomendadas
          </Link>
        ) : (
          <>
            {/* Omitir es un requisito de la HU: el candidato no queda atrapado
                en el wizard y puede volver cuando quiera desde su perfil. */}
            <Link href="/perfil" className="text-sm text-slate-600 hover:underline">
              Omitir por ahora y completarlo después
            </Link>
            <Link href="/recomendaciones" className="text-sm text-slate-600 hover:underline">
              Ver vacantes igualmente
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
