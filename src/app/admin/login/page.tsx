// E7 · Login de administrador (HU-25).
// Misma mecánica de sesión que el login de candidato, pero exige rol ADMIN.
import { redirect } from "next/navigation";
import { getCandidatoActual } from "@/lib/auth";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";
import { loginAdminAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  // Si ya hay sesión de admin no tiene sentido pedir credenciales otra vez.
  const cuenta = await getCandidatoActual();
  if (cuenta?.rol === "ADMIN") redirect("/admin/vacantes");

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <p className="text-sm font-medium text-acento-texto">Panel interno</p>
      <h1 className="mb-6 mt-1 text-2xl font-bold">Acceso de administrador</h1>
      <Card>
        <form action={loginAdminAction} className="space-y-4">
          <Alert message={searchParams.error} />
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} />
          </Field>
          <Field label="Contraseña">
            <input name="password" type="password" required className={inputClass} />
          </Field>
          <SubmitButton>Entrar al panel</SubmitButton>
        </form>
      </Card>
      <p className="mt-4 text-sm text-slate-500">
        Esta entrada es solo para cuentas con permisos de administración del catálogo de vacantes.
      </p>
    </main>
  );
}
