"use client";
// Enlaces principales del header con resaltado de la sección activa.
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/perfil", label: "Perfil" },
  { href: "/preferencias", label: "Preferencias" },
  { href: "/recomendaciones", label: "Recomendaciones" },
  { href: "/postulaciones", label: "Postulaciones" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 overflow-x-auto text-sm">
      {LINKS.map(({ href, label }) => {
        const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${
              activo
                ? "bg-blue-50 font-medium text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
