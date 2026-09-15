// Barra de navegación. Muestra los enlaces del núcleo cuando hay sesión.
import Link from "next/link";
import { getCandidatoActual } from "@/lib/auth";
import { cerrarSesionAction } from "@/app/actions/auth";

export default async function Header() {
  const candidato = await getCandidatoActual();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          SkillNav
        </Link>

        {candidato ? (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/perfil" className="hover:text-blue-600">
              Perfil
            </Link>
            <Link href="/preferencias" className="hover:text-blue-600">
              Preferencias
            </Link>
            <Link href="/recomendaciones" className="hover:text-blue-600">
              Recomendaciones
            </Link>
            <Link href="/postulaciones" className="hover:text-blue-600">
              Postulaciones
            </Link>
            <span className="hidden text-slate-400 sm:inline">
              {candidato.email}
            </span>
            <form action={cerrarSesionAction}>
              <button className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">
                Salir
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="hover:text-blue-600">
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
