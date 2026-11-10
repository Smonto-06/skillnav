"use client";
// Enlaces principales del header con resaltado de la sección activa.
// La decisión de qué enlaces mostrar vive en navegacion.ts, que sí se prueba.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { esActivo, linksPara } from "./navegacion";

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 overflow-x-auto text-sm">
      {linksPara(pathname).map(({ href, label }) => {
        const activo = esActivo(href, pathname);
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
