// E6 · Historial de postulaciones con estado, filtros y avance por etapa.
import Link from "next/link";
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ESTADOS_POSTULACION, detalleVacante, estadoLabel } from "@/lib/presentacion";
import { Alert, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const ESTADO_COLOR: Record<string, string> = {
  POSTULADO: "bg-blue-50 text-blue-700",
  EN_REVISION: "bg-amber-50 text-amber-700",
  ENTREVISTA: "bg-violet-50 text-violet-700",
  OFERTA: "bg-green-50 text-green-700",
  DESCARTADO: "bg-red-50 text-red-700",
};

// Etapas del avance (la de rechazo se muestra aparte, no como paso).
const ETAPAS = ESTADOS_POSTULACION.filter((e) => e.clave !== "DESCARTADO");

export default async function PostulacionesPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string; estado?: string };
}) {
  const candidato = await requireCandidato();

  const postulaciones = await prisma.postulacion.findMany({
    where: { candidatoId: candidato.id },
    include: { vacante: true },
    orderBy: { fecha: "desc" },
  });

  const filtro = ESTADOS_POSTULACION.some((e) => e.clave === searchParams.estado)
    ? searchParams.estado
    : undefined;
  const visibles = filtro
    ? postulaciones.filter((p) => (p.estado as string) === filtro)
    : postulaciones;

  const filtros = [{ clave: undefined, etiqueta: "Todas" }, ...ESTADOS_POSTULACION];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-blue-700">Tu búsqueda en marcha</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Mis postulaciones</h1>
      <p className="mt-1 text-sm text-slate-500">
        Consulta el estado y el avance de cada oportunidad.
      </p>

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {filtros.map((f) => {
          const activo = f.clave === filtro;
          return (
            <Link
              key={f.etiqueta}
              href={f.clave ? `/postulaciones?estado=${f.clave}` : "/postulaciones"}
              aria-current={activo ? "page" : undefined}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activo
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        {postulaciones.length === 0 ? (
          <Card className="text-center">
            <h2 className="font-semibold">Aún no te has postulado.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Descubre oportunidades que encajan con tu perfil y mantén aquí el seguimiento de
              cada una.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Mira tus 3 mejores vacantes
            </Link>
          </Card>
        ) : visibles.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-slate-600">
              No tienes postulaciones en estado &ldquo;{estadoLabel(filtro ?? "")}&rdquo;.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {visibles.map((p) => {
              const estado = p.estado as string;
              const indiceEtapa = ETAPAS.findIndex((e) => e.clave === estado);
              return (
                <li key={p.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold">{p.vacante.titulo}</h2>
                        <p className="text-slate-600">{p.vacante.empresa}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {[
                            `Postulado el ${new Date(p.fecha).toLocaleDateString("es-CO")}`,
                            detalleVacante(p.vacante),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          ESTADO_COLOR[estado] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {estadoLabel(estado)}
                      </span>
                    </div>

                    {estado === "DESCARTADO" ? (
                      <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
                        Esta oportunidad no avanzó. Sigue explorando vacantes recomendadas.
                      </p>
                    ) : (
                      <ol className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4">
                        {ETAPAS.map((e, i) => (
                          <li key={e.clave}>
                            <div
                              className={`h-1.5 rounded-full ${
                                i <= indiceEtapa ? "bg-blue-700" : "bg-slate-200"
                              }`}
                            />
                            <p
                              className={`mt-1.5 text-xs ${
                                i <= indiceEtapa ? "font-medium text-slate-700" : "text-slate-400"
                              }`}
                            >
                              {e.etiqueta}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
