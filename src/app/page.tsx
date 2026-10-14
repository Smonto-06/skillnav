// Inicio. Con sesión: panel del candidato (mejores coincidencias, perfil, postulaciones
// y preferencias). Sin sesión: presentación de la plataforma.
import Link from "next/link";
import { getCandidatoActual } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildRecommendations } from "@/lib/recommender";
import { cargarPerfilScoring } from "@/lib/perfil-scoring";
import { completitud } from "@/lib/completeness";
import { detalleVacante, modalidadLabel, resumenRequisitos } from "@/lib/presentacion";
import { Alert, Card } from "@/components/ui";
import {
  BotonPostular,
  BuscadorVacantes,
  FlechaDerecha,
  FlechaDiagonal,
  MatchRing,
  RequisitosVacante,
} from "@/components/vacantes";

export const dynamic = "force-dynamic";

const TILES = [
  { clave: "TOTAL", etiqueta: "Enviadas", estilo: "bg-acento-suave text-acento-texto" },
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

  const [educacionCount, experienciaCount, habilidadesCount, preferencia, { perfil }, vacantes, postulaciones] =
    await Promise.all([
      prisma.educacion.count({ where: { candidatoId: candidato.id } }),
      prisma.experiencia.count({ where: { candidatoId: candidato.id } }),
      prisma.habilidad.count({ where: { candidatoId: candidato.id } }),
      prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } }),
      cargarPerfilScoring(candidato),
      prisma.vacante.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.postulacion.findMany({
        where: { candidatoId: candidato.id },
        select: { vacanteId: true, estado: true },
      }),
    ]);

  const mejores = buildRecommendations(perfil, vacantes).slice(0, 3);

  const { porcentaje, faltantes } = completitud({
    nombre: candidato.nombre,
    ciudad: candidato.ciudad,
    contacto: candidato.contacto,
    titular: candidato.titular,
    resumen: candidato.resumen,
    educacionCount,
    experienciaCount,
    habilidadesCount,
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
      <p className="text-sm font-medium text-acento-texto">Tu espacio de carrera</p>
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
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-acento-texto hover:underline"
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
              {mejores.map(({ vacante, score, requisitos, motivoRol }) => (
                <li key={vacante.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/recomendaciones#${vacante.id}`}
                          className="inline-flex items-center gap-1 text-lg font-semibold hover:text-acento-texto"
                        >
                          {vacante.titulo}
                          <FlechaDiagonal className="h-4 w-4 text-acento-texto" />
                        </Link>
                        <p className="text-slate-600">{vacante.empresa}</p>
                        <p className="mt-1 text-sm text-slate-500">{detalleVacante(vacante)}</p>
                      </div>
                      <MatchRing score={score} />
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <RequisitosVacante requisitos={requisitos} />
                      <p className="mt-3 text-sm text-slate-600">{resumenRequisitos(requisitos)}</p>
                      <p className="mt-1 text-xs text-slate-500">{motivoRol}</p>
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
                className="h-2 rounded-full bg-acento transition-all"
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
              className="mt-4 block rounded-full bg-acento px-4 py-2.5 text-center text-sm font-semibold text-marca hover:bg-acento-hover"
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
                className="rounded-md p-1 text-acento-texto hover:bg-acento-suave"
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
              <Link href="/preferencias" className="text-sm font-medium text-acento-texto hover:underline">
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

async function Presentacion() {
  const total = await prisma.vacante.count();
  return (
    <main>
      <section className="bg-marca text-white">
        <div className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center">
          <p className="text-sm font-medium text-acento">Tu espacio de carrera</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Encuentra tu trabajo ideal con Skill<span className="text-acento">Nav</span>
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Oportunidades laborales alineadas con tu perfil, tus habilidades y tus preferencias.
          </p>
          <div className="mx-auto mt-8 max-w-3xl text-left">
            <BuscadorVacantes total={total} />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/registro"
              className="rounded-full bg-acento px-6 py-2.5 text-sm font-semibold text-marca hover:bg-acento-hover"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-10 grid max-w-6xl grid-cols-1 gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Perfil completo", desc: "Datos personales, educación, experiencia y habilidades." },
          { title: "Preferencias laborales", desc: "Salario, modalidad, ubicación y disponibilidad." },
          { title: "Recomendaciones inteligentes", desc: "Vacantes ordenadas por Match Score y explicadas." },
          { title: "Postulación y seguimiento", desc: "Postúlate con un clic y sigue el estado de cada aplicación." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="block h-1 w-8 rounded-full bg-acento" aria-hidden />
            <h2 className="mt-3 font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
