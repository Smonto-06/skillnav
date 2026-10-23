// E7 · Editar vacante (HU-26).
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Alert } from "@/components/ui";
import { FormVacante } from "@/components/admin";
import { actualizarVacanteAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarVacantePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await requireAdmin();

  const vacante = await prisma.vacante.findUnique({ where: { id: params.id } });
  if (!vacante) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/vacantes" className="text-sm text-acento-texto hover:underline">
        ← Volver al catálogo
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Editar vacante</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        {vacante.titulo} · {vacante.empresa}
      </p>
      {searchParams.error && (
        <div className="mb-4">
          <Alert message={searchParams.error} />
        </div>
      )}
      <FormVacante
        action={actualizarVacanteAction}
        vacante={vacante}
        etiquetaBoton="Guardar cambios"
      />
    </main>
  );
}
