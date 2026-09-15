// E1 · Login con credenciales (HU-02).
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">Iniciar sesión</h1>
      <Card>
        <form action={loginAction} className="space-y-4">
          <Alert message={searchParams.error} />
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} />
          </Field>
          <Field label="Contraseña">
            <input name="password" type="password" required className={inputClass} />
          </Field>
          <SubmitButton>Entrar</SubmitButton>
        </form>
      </Card>
      <p className="mt-4 text-sm text-slate-600">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-blue-600 hover:underline">
          Regístrate
        </Link>
      </p>
    </main>
  );
}
