// HU-27 · Configuración de los pesos del motor de scoring.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Alert, Card } from "@/components/ui";
import { MotorScoring } from "@/lib/scoring";
import { pesosDesdeConfiguracion, sumaDe } from "@/lib/scoring/configuracion";
import { guardarPesosAction, restablecerPesosAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ScoringPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  await requireAdmin();

  const config = await prisma.configuracionScoring.findUnique({ where: { id: 1 } });
  const pesos = pesosDesdeConfiguracion(config);
  // Las etiquetas salen del motor, no de una lista repetida acá: si mañana se
  // agrega una dimensión, aparece sola en este formulario.
  const dimensiones = new MotorScoring(undefined, pesos).dimensiones();
  const suma = sumaDe(pesos);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/vacantes" className="text-sm text-acento-texto hover:underline">
        ← Volver al panel
      </Link>
      <p className="mt-2 text-sm font-medium text-acento-texto">Panel de administración</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Pesos del motor de scoring</h1>
      <p className="mt-2 text-sm text-slate-600">
        Define cuánto aporta cada dimensión al Match Score. Los pesos deben sumar{" "}
        <strong>1.00</strong> para que el puntaje siga siendo un porcentaje comparable entre
        vacantes. El cambio aplica de inmediato a las recomendaciones de todos los candidatos.
      </p>

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      <Card className="mt-6">
        <form action={guardarPesosAction} className="space-y-4">
          <ul className="space-y-3">
            {dimensiones.map((d) => (
              <li key={d.clave} className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor={`peso-${d.clave}`}
                  className="w-44 shrink-0 text-sm font-medium text-slate-700"
                >
                  {d.etiqueta}
                </label>
                <input
                  id={`peso-${d.clave}`}
                  name={d.clave}
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  defaultValue={d.peso}
                  className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento"
                />
                <span className="text-sm text-slate-500">
                  {Math.round(d.peso * 100)}% del puntaje
                </span>
              </li>
            ))}
          </ul>

          <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">
            Suma actual: <strong>{suma.toFixed(2)}</strong>
            {config?.editadoPor && (
              <span className="ml-2 text-xs text-slate-500">
                · último cambio por {config.editadoPor}
              </span>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-marca hover:bg-acento-hover"
            >
              Guardar pesos
            </button>
            {/* Normalizar evita que el administrador tenga que hacer la cuenta
                a mano para que los valores sumen 1. */}
            <button
              type="submit"
              name="accion"
              value="normalizar"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ajustar para que sumen 1
            </button>
          </div>
        </form>
      </Card>

      <form action={restablecerPesosAction} className="mt-6 border-t border-slate-200 pt-4">
        <button className="text-sm text-slate-600 hover:underline">
          Restablecer los valores de fábrica (40 / 20 / 15 / 10 / 10 / 5)
        </button>
      </form>
    </main>
  );
}
