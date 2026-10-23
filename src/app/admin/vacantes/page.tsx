// E7 · Listado de vacantes del administrador (HU-26).
// Lista desde BD con acción por registro: editar y eliminar.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Alert, Card } from "@/components/ui";
import { detalleVacante } from "@/lib/presentacion";
import { BotonEliminarVacante } from "./acciones";

export const dynamic = "force-dynamic";

export default async function AdminVacantesPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const admin = await requireAdmin();

  const vacantes = await prisma.vacante.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { postulaciones: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm font-medium text-acento-texto">Panel de administración</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de vacantes</h1>
        <Link
          href="/admin/vacantes/nueva"
          className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-marca hover:bg-acento-hover"
        >
          Nueva vacante
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Sesión de {admin.email} · {vacantes.length}{" "}
        {vacantes.length === 1 ? "vacante publicada" : "vacantes publicadas"}
      </p>

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      {vacantes.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-slate-600">
            Todavía no hay vacantes en el catálogo. Crea la primera para que los candidatos reciban
            recomendaciones.
          </p>
        </Card>
      ) : (
        <ul className="mt-6 space-y-3">
          {vacantes.map((v) => (
            <li key={v.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900">{v.titulo}</h2>
                  <p className="text-sm text-slate-600">{v.empresa}</p>
                  {detalleVacante(v) && (
                    <p className="mt-1 text-sm text-slate-500">{detalleVacante(v)}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {v.requisitos
                      ? `Requisitos: ${v.requisitos}`
                      : "Sin requisitos declarados (abierta a cualquier perfil)"}
                    {v.experienciaMin != null && ` · Mínimo ${v.experienciaMin} año(s)`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {v._count.postulaciones === 0
                      ? "Sin postulaciones"
                      : `${v._count.postulaciones} postulación(es)`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/vacantes/${v.id}`}
                    className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </Link>
                  <BotonEliminarVacante
                    id={v.id}
                    titulo={v.titulo}
                    postulaciones={v._count.postulaciones}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
