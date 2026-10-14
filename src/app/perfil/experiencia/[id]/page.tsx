// E2 · Edición de experiencia laboral — formulario lanzado desde la lista (CRUD completo).
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aMes } from "@/lib/trayectoria";
import { SUGERENCIAS_TITULAR } from "@/lib/taxonomia";
import { Alert, Card } from "@/components/ui";
import FormExperiencia from "@/app/perfil/FormExperiencia";

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
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/perfil" className="text-sm font-medium text-acento-texto hover:underline">
        ← Volver a mi perfil
      </Link>
      <h1 className="mb-6 mt-2 text-3xl font-bold tracking-tight">Editar experiencia</h1>
      <datalist id="sugerencias-titular">
        {SUGERENCIAS_TITULAR.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <Card>
        <div className="mb-4">
          <Alert message={searchParams.error} />
        </div>
        <FormExperiencia
          exp={{
            id: exp.id,
            cargo: exp.cargo,
            empresa: exp.empresa,
            inicio: aMes(exp.fechaInicio),
            fin: aMes(exp.fechaFin),
            actual: exp.actual,
            descripcion: exp.descripcion ?? "",
          }}
        />
      </Card>
    </main>
  );
}
