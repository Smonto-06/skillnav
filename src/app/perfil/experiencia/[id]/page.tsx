// E2 · Edición de experiencia laboral — formulario lanzado desde la lista (CRUD completo).
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";
import { actualizarExperienciaAction } from "@/app/perfil/actions";

export const dynamic = "force-dynamic";

export default async function EditarExperienciaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const candidato = await requireCandidato();
  const exp = await prisma.experiencia.findFirst({
    where: { id: params.id, candidatoId: candidato.id },
  });
  if (!exp) redirect("/perfil");

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">Editar experiencia</h1>
      <Card>
        <form action={actualizarExperienciaAction} className="space-y-4">
          <Alert message={searchParams.error} />
          <input type="hidden" name="id" value={exp.id} />
          <Field label="Empresa">
            <input name="empresa" defaultValue={exp.empresa} required className={inputClass} />
          </Field>
          <Field label="Cargo">
            <input name="cargo" defaultValue={exp.cargo} required className={inputClass} />
          </Field>
          <Field label="Descripción">
            <textarea name="descripcion" defaultValue={exp.descripcion ?? ""} rows={3} className={inputClass} />
          </Field>
          <div className="flex gap-3">
            <SubmitButton>Guardar cambios</SubmitButton>
            <a href="/perfil" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
              Cancelar
            </a>
          </div>
        </form>
      </Card>
    </main>
  );
}
