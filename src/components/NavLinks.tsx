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
            className={`whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
              activo
                ? "bg-white/10 font-medium text-acento"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
