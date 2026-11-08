// HU-21 · Subir la hoja de vida.
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";
import { ExtractorFactory, TAMANO_MAXIMO_BYTES } from "@/lib/cv/extractores";
import { subirCVAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SubirCVPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}) {
  const candidato = await requireCandidato();

  // Si ya hay un borrador sin revisar, se va directo a la revisión en lugar de
  // pedir otro archivo y perder lo ya extraído.
  const pendiente = await prisma.borradorCV.findUnique({
    where: { candidatoId: candidato.id },
    select: { archivo: true },
  });
  if (pendiente && !searchParams.ok) redirect("/perfil/cv/revisar");

  const formatos = ExtractorFactory.formatosSoportados().join(", ");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/perfil" className="text-sm text-acento-texto hover:underline">
        ← Volver al perfil
      </Link>
      <p className="mt-2 text-sm font-medium text-acento-texto">Llena tu perfil más rápido</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Subir hoja de vida</h1>
      <p className="mt-2 text-sm text-slate-600">
        Sube tu CV y el sistema lee el archivo para proponerte un borrador de perfil. Antes de
        guardar nada vas a ver qué detectó y qué tan seguro está de cada dato, para que lo
        confirmes o lo corrijas.
      </p>

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      <Card className="mt-6">
        <form action={subirCVAction} className="space-y-4">
          <Field label="Archivo">
            <input
              type="file"
              name="archivo"
              required
              accept=".pdf,.docx,.txt"
              className={inputClass}
            />
          </Field>
          <p className="text-xs text-slate-500">
            Formatos aceptados: {formatos}. Tamaño máximo:{" "}
            {TAMANO_MAXIMO_BYTES / (1024 * 1024)} MB. Si tu CV es un PDF escaneado (una foto del
            documento), el texto no se puede leer automáticamente: en ese caso súbelo en DOCX.
          </p>
          <SubmitButton>Analizar mi hoja de vida</SubmitButton>
        </form>
      </Card>
    </main>
  );
}
