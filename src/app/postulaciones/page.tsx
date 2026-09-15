// E6 · Historial de postulaciones con estado.
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  POSTULADO: "Postulado",
  EN_REVISION: "En revisión",
  ENTREVISTA: "Entrevista",
  DESCARTADO: "Descartado",
};

const ESTADO_COLOR: Record<string, string> = {
  POSTULADO: "bg-blue-100 text-blue-700",
  EN_REVISION: "bg-yellow-100 text-yellow-700",
  ENTREVISTA: "bg-green-100 text-green-700",
  DESCARTADO: "bg-red-100 text-red-700",
};

export default async function PostulacionesPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const candidato = await requireCandidato();

  const postulaciones = await prisma.postulacion.findMany({
    where: { candidatoId: candidato.id },
    include: { vacante: true },
    orderBy: { fecha: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">Mis postulaciones</h1>

      {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
      {searchParams.error && <Alert message={searchParams.error} />}

      {postulaciones.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            Aún no te has postulado a ninguna vacante.{" "}
            <a href="/recomendaciones" className="text-blue-600 hover:underline">
              Ver recomendaciones
            </a>
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {postulaciones.map((p) => (
            <li key={p.id}>
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{p.vacante.titulo}</h2>
                    <p className="text-sm text-slate-600">{p.vacante.empresa}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(p.fecha).toLocaleDateString("es-CO")}
                      {p.vacante.modalidad ? ` · ${p.vacante.modalidad}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${ESTADO_COLOR[p.estado] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {ESTADO_LABEL[p.estado] ?? p.estado}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
