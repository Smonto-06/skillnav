// Decide qué enlaces muestra el encabezado y cuál va resaltado.
// Vive fuera del componente para poder probarlo sin montar React.

export type EnlaceNav = { href: string; label: string };

export const LINKS_CANDIDATO: EnlaceNav[] = [
  { href: "/", label: "Inicio" },
  { href: "/perfil", label: "Perfil" },
  { href: "/preferencias", label: "Preferencias" },
  { href: "/recomendaciones", label: "Recomendaciones" },
  { href: "/postulaciones", label: "Postulaciones" },
];

// Dentro del panel, los enlaces del candidato no llevan a ninguna parte útil y
// confunden sobre en qué modo está la sesión (HU-25, HU-26).
export const LINKS_ADMIN: EnlaceNav[] = [
  { href: "/admin/vacantes", label: "Vacantes" },
  { href: "/admin/scoring", label: "Pesos del motor" },
  { href: "/admin/metricas", label: "Métricas" },
  { href: "/", label: "Ver el sitio" },
];

/**
 * El criterio es la ruta y no el rol: una cuenta ADMIN que esté navegando la
 * aplicación como candidata sigue necesitando sus propios enlaces.
 */
export function linksPara(pathname: string): EnlaceNav[] {
  return pathname.startsWith("/admin") ? LINKS_ADMIN : LINKS_CANDIDATO;
}

/**
 * Marca el enlace de la sección actual.
 *
 * La raíz se compara exacta porque con `startsWith` quedaría activa en todas
 * las rutas. Eso además hace que "Ver el sitio" no se resalte dentro de
 * /admin, que es donde ese enlace aparece.
 */
export function esActivo(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  // Sin exigir la barra, /admin/vacantes se activaría con /admin/vacantes-xyz.
  return pathname.startsWith(href + "/");
}
