// Inicio. Con sesión: panel del candidato (mejores coincidencias, perfil, postulaciones
// y preferencias). Sin sesión: presentación de la plataforma.
import Link from "next/link";
import { getCandidatoActual } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRecommendations, parseRequisitos } from "@/lib/recommender";
import { completitud } from "@/lib/completeness";
import { explicarCoincidencias, detalleVacante, modalidadLabel } from "@/lib/presentacion";
import type { Modalidad } from "@/lib/scoring";
import { Alert, Card } from "@/components/ui";
import { BotonPostular, FlechaDerecha, FlechaDiagonal, MatchRing } from "@/components/vacantes";

export const dynamic = "force-dynamic";

const TILES = [
  { clave: "TOTAL", etiqueta: "Enviadas", estilo: "bg-blue-50 text-blue-700" },
  { clave: "EN_REVISION", etiqueta: "En revisión", estilo: "bg-amber-50 text-amber-700" },
  { clave: "ENTREVISTA", etiqueta: "Entrevistas", estilo: "bg-violet-50 text-violet-700" },
  { clave: "OFERTA", etiqueta: "Ofertas", estilo: "bg-green-50 text-green-700" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const candidato = await getCandidatoActual();
  if (!candidato) return <Presentacion />;

  const [educacionCount, experienciaCount, habilidades, preferencia, vacantes, postulaciones] =
    await Promise.all([
      prisma.educacion.count({ where: { candidatoId: candidato.id } }),
      prisma.experiencia.count({ where: { candidatoId: candidato.id } }),
      prisma.habilidad.findMany({ where: { candidatoId: candidato.id } }),
      prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } }),
      prisma.vacante.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.postulacion.findMany({
        where: { candidatoId: candidato.id },
        select: { vacanteId: true, estado: true },
      }),
    ]);

  const nombres = habilidades.map((h) => h.nombre);
  const mejores = buildRecommendations(
    {
      habilidades: nombres,
      salarioMin: preferencia?.salarioMin,
      salarioMax: preferencia?.salarioMax,
      modalidad: preferencia?.modalidad as Modalidad | null,
      ciudad: preferencia?.ubicacion,
    },
    vacantes
  ).slice(0, 3);

  const { porcentaje, faltantes } = completitud({
    nombre: candidato.nombre,
    ciudad: candidato.ciudad,
    contacto: candidato.contacto,
    educacionCount,
    experienciaCount,
    habilidadesCount: habilidades.length,
    tienePreferencia: !!preferencia,
  });

  const yaPostulado = new Set(postulaciones.map((p) => p.vacanteId));
  const conteo = (clave: string) =>
    clave === "TOTAL"
      ? postulaciones.length
      : postulaciones.filter((p) => (p.estado as string) === clave).length;

  const rango =
    preferencia?.salarioMin != null || preferencia?.salarioMax != null
      ? `${preferencia?.salarioMin ?? 0} – ${preferencia?.salarioMax ?? "∞"} USD`
      : null;
  const chips = [modalidadLabel(preferencia?.modalidad), rango, preferencia?.ubicacion].filter(
    Boolean
  ) as string[];

  const nombre = candidato.nombre?.trim() || candidato.email.split("@")[0];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-blue-700">Tu espacio de carrera</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Hola, {nombre}</h1>
      <p className="mt-2 text-slate-600">Oportunidades y avances elegidos para ti.</p>

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Mejores coincidencias */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Tus mejores coincidencias</h2>
              <p className="text-sm text-slate-500">Oportunidades que encajan con tu perfil.</p>
            </div>
            <Link
              href="/recomendaciones"
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
            >
              Ver todas <FlechaDerecha />
            </Link>
          </div>

          {mejores.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">No hay vacantes en el catálogo todavía.</p>
            </Card>
          ) : (
            <ul className="space-y-4">
              {mejores.map(({ vacante, score }) => (
                <li key={vacante.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/recomendaciones#${vacante.id}`}
                          className="inline-flex items-center gap-1 text-lg font-semibold hover:text-blue-700"
                        >
                          {vacante.titulo}
                          <FlechaDiagonal className="h-4 w-4 text-blue-700" />
                        </Link>
                        <p className="text-slate-600">{vacante.empresa}</p>
                        <p className="mt-1 text-sm text-slate-500">{detalleVacante(vacante)}</p>
                      </div>
                      <MatchRing score={score} />
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-sm text-slate-600">
                        {explicarCoincidencias(nombres, parseRequisitos(vacante.requisitos))}
                      </p>
                      <div className="mt-4 flex justify-end">
                        <BotonPostular
                          vacanteId={vacante.id}
                          postulado={yaPostulado.has(vacante.id)}
                          volverA="/?ok=Postulado+exitosamente"
                          texto="Postularme"
                        />
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Columna lateral */}
        <aside className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Tu perfil</h2>
              <span className="text-sm font-semibold">{porcentaje}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-blue-700 transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {faltantes.length === 0
                ? "Tu perfil está completo. ¡Ya puedes destacar!"
                : `Completa: ${faltantes.join(", ")}. Mejorará tus coincidencias.`}
            </p>
            <Link
              href="/perfil"
              className="mt-4 block rounded-md bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-800"
            >
              {faltantes.length === 0 ? "Revisar mi perfil" : "Completar mi perfil"}
            </Link>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Postulaciones</h2>
              <Link
                href="/postulaciones"
                aria-label="Ver postulaciones"
                className="rounded-md p-1 text-blue-700 hover:bg-blue-50"
              >
                <FlechaDerecha />
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {TILES.map((t) => (
                <div key={t.clave} className={`rounded-lg px-3 py-3 ${t.estilo}`}>
                  <p className="text-lg font-semibold">{conteo(t.clave)}</p>
                  <p className="text-xs text-slate-600">{t.etiqueta}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Tus preferencias</h2>
              <Link href="/preferencias" className="text-sm font-medium text-blue-700 hover:underline">
                Editar
              </Link>
            </div>
            {chips.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Aún no defines tus preferencias. Agrégalas para afinar tus recomendaciones.
              </p>
            )}
          </Card>
        </aside>
      </div>
    </main>
  );
}

function Presentacion() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-medium text-blue-700">Tu espacio de carrera</p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight">SkillNav</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        Encuentra oportunidades laborales alineadas con tu perfil y preferencias.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/registro"
          className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
        >
          Iniciar sesión
        </Link>
      </div>

      <section className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { title: "Perfil completo", desc: "Datos personales, educación, experiencia y habilidades." },
          { title: "Preferencias laborales", desc: "Salario, modalidad, ubicación y disponibilidad." },
          { title: "Recomendaciones inteligentes", desc: "Vacantes ordenadas por Match Score (HU-24)." },
          { title: "Postulación y seguimiento", desc: "Postúlate con un clic y sigue el estado de cada aplicación." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
