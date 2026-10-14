// Barra de navegación. Con sesión: enlaces centrados y menú de usuario (avatar + salir).
import Link from "next/link";
import { getCandidatoActual } from "@/lib/auth";
import { cerrarSesionAction } from "@/app/actions/auth";
import NavLinks from "./NavLinks";

export default async function Header() {
  const candidato = await getCandidatoActual();
  const nombre = candidato?.nombre?.trim() || candidato?.email.split("@")[0] || "";

  return (
    <header className="bg-marca text-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Skill<span className="text-acento">Nav</span>
        </Link>

        {candidato ? (
          <>
            <div className="order-last w-full md:order-none md:w-auto">
              <NavLinks />
            </div>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-1 py-1 text-sm text-slate-200 hover:bg-white/10 [&::-webkit-details-marker]:hidden">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-acento font-semibold text-marca">
                  {nombre.charAt(0).toUpperCase()}
                </span>
                <span className="hidden font-medium sm:inline">{nombre}</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                  className="h-4 w-4 text-slate-300 transition-transform group-open:rotate-180"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-lg">
                <p className="truncate px-3 py-2 text-xs text-slate-500">{candidato.email}</p>
                <Link href="/perfil" className="block rounded-md px-3 py-2 hover:bg-slate-50">
                  Mi perfil
                </Link>
                <form action={cerrarSesionAction}>
                  <button className="w-full rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50">
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </details>
          </>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="rounded-full px-3 py-1.5 font-medium text-slate-200 hover:bg-white/10 hover:text-white">
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-full bg-acento px-4 py-1.5 font-semibold text-marca hover:bg-acento-hover"
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
