// E1 · Registro con email + contraseña (HU-01).
import Link from "next/link";
import { redirect } from "next/navigation";
import { registrarAction } from "@/app/actions/auth";
import { getCandidatoActual } from "@/lib/auth";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const candidato = await getCandidatoActual();
  if (candidato) redirect("/perfil");

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">Crear cuenta</h1>
      <Card>
        <form action={registrarAction} className="space-y-4">
          <Alert message={searchParams.error} />
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} />
          </Field>
          <Field label="Contraseña (mín. 8 caracteres)">
            <input name="password" type="password" required className={inputClass} />
          </Field>
          <Field label="Confirmar contraseña">
            <input name="confirm" type="password" required className={inputClass} />
          </Field>
          <SubmitButton>Registrarme</SubmitButton>
        </form>
      </Card>
      <p className="mt-4 text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
