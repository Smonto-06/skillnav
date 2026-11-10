"use client";
// Frontera de error de la aplicación. Sin esto, cualquier excepción no
// controlada muestra la pantalla cruda de Next, que en producción no explica
// nada y deja al candidato sin salida.
//
// El caso que la motivó: si el borrador del CV queda con una forma que la
// pantalla de revisión no sabe leer, /perfil/cv redirige a /perfil/cv/revisar,
// que falla — y el botón para descartar el borrador vive en esa misma página.
// El usuario quedaba atrapado sin forma de volver.
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El digest es lo único que permite cruzar este error con los registros
    // del servidor; el mensaje real no viaja al cliente en producción.
    console.error("Error no controlado:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="text-2xl font-bold text-marca">Algo salió mal</h1>
      <p className="mt-3 text-slate-600">
        No pudimos cargar esta página. El error quedó registrado y podés seguir
        usando el resto de la aplicación.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-marca px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Reintentar
        </button>
        <Link
          href="/perfil"
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Ir a mi perfil
        </Link>
        <Link
          href="/"
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Volver al inicio
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 text-xs text-slate-400">
          Código de referencia: {error.digest}
        </p>
      )}
    </main>
  );
}
