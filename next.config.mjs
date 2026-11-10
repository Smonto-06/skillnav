// Comprobación de configuración antes de compilar.
//
// `SESSION_SECRET` firma las cookies de sesión. Si falta, el código tenía un
// valor por defecto que está publicado en este mismo repositorio, así que
// cualquiera podía fabricarse la cookie de cualquier cuenta sin que nada lo
// delatara. Ahora falta la variable y el build se detiene.
//
// La comprobación va acá y no solo en tiempo de ejecución a propósito: un
// despliegue que falla no se publica y el sitio que ya estaba en línea sigue
// sirviéndose intacto. Si la validación viviera únicamente en el servidor, el
// mismo olvido tumbaría la aplicación en producción.
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error(
    [
      "",
      "Falta la variable de entorno SESSION_SECRET.",
      "",
      "Firma las cookies de sesión. Sin ella se usaría un secreto que está en",
      "el repositorio y cualquiera podría suplantar una cuenta, incluida una",
      "de administración.",
      "",
      "En Vercel: Settings -> Environment Variables -> Add.",
      "Generar un valor al azar, por ejemplo con:",
      "  node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"",
      "",
    ].join("\n")
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
