// E7 · Crear vacante (HU-26).
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Alert } from "@/components/ui";
import { FormVacante } from "@/components/admin";
import { crearVacanteAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NuevaVacantePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/vacantes" className="text-sm text-acento-texto hover:underline">
        ← Volver al catálogo
      </Link>
      <h1 className="mb-6 mt-2 text-3xl font-bold tracking-tight">Nueva vacante</h1>
      {searchParams.error && (
        <div className="mb-4">
          <Alert message={searchParams.error} />
        </div>
      )}
      <FormVacante action={crearVacanteAction} etiquetaBoton="Crear vacante" />
    </main>
  );
}
