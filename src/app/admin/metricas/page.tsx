// HU-29 · Panel de métricas del administrador · HU-28 · Recálculo masivo.
// Todas las cifras salen de la base de datos; ninguna es de ejemplo.
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Alert, Card } from "@/components/ui";
import { UMBRAL_BUEN_MATCH, obtenerMetricas } from "@/lib/metricas";
import { recalcularAction } from "../actions";

export const dynamic = "force-dynamic";

function Metrica({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{detalle}</p>
    </Card>
  );
}

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  await requireAdmin();
  const m = await obtenerMetricas();

  const pctPerfilUtil =
    m.candidatos > 0 ? Math.round((m.candidatosConPerfilUtil / m.candidatos) * 100) : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/admin/vacantes" className="text-sm text-acento-texto hover:underline">
        ← Volver al panel
      </Link>
      <p className="mt-2 text-sm font-medium text-acento-texto">Panel de administración</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Métricas de la plataforma</h1>

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metrica
          titulo="Tasa de postulación"
          // null y no 0: con cero candidatos la tasa no es cero, es que todavía
          // no hay nada que medir. Mostrar "0" sería mentir.
          valor={m.tasaPostulacion == null ? "Sin datos" : m.tasaPostulacion.toFixed(2)}
          detalle={
            m.tasaPostulacion == null
              ? "Aún no hay candidatos registrados"
              : `${m.postulaciones} postulaciones entre ${m.candidatos} candidatos`
          }
        />
        <Metrica
          titulo="Perfiles aprovechables"
          valor={pctPerfilUtil == null ? "Sin datos" : `${pctPerfilUtil}%`}
          detalle={
            pctPerfilUtil == null
              ? "Aún no hay candidatos registrados"
              : `${m.candidatosConPerfilUtil} de ${m.candidatos} tienen al menos una habilidad`
          }
        />
        <Metrica
          titulo="Salud del catálogo"
          valor={`${m.vacantes - m.vacantesSinPostulaciones}/${m.vacantes}`}
          detalle={
            m.vacantesSinPostulaciones > 0
              ? `${m.vacantesSinPostulaciones} vacante(s) sin ninguna postulación`
              : "Todas las vacantes tienen al menos una postulación"
          }
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900">Postulaciones por estado</h2>
          {m.postulaciones === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Todavía no hay postulaciones.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {m.porEstado.map((e) => (
                <li key={e.etiqueta} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{e.etiqueta}</span>
                  <span className="font-medium text-slate-900">{e.cantidad}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Vacantes con más postulaciones</h2>
          {m.vacantesPopulares.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Ninguna vacante tiene postulaciones todavía.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {m.vacantesPopulares.map((v) => (
                <li key={`${v.empresa}-${v.titulo}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 text-slate-600">
                    <span className="font-medium text-slate-900">{v.titulo}</span> · {v.empresa}
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">{v.postulaciones}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <h2 className="font-semibold text-slate-900">Recalcular scores</h2>
          <p className="mt-2 text-sm text-slate-600">
            Evalúa cada candidato contra cada vacante con los pesos vigentes e informa cuántos
            pares procesó y cuántos fallaron. Los puntajes se calculan en vivo en cada carga de
            las recomendaciones, así que este proceso no corrige datos viejos: sirve para
            verificar que el motor corre sin errores sobre todos los datos reales.
          </p>

          {m.ultimoRecalculo ? (
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between sm:block">
                <dt className="text-slate-500">Última ejecución</dt>
                <dd className="font-medium text-slate-900">
                  {m.ultimoRecalculo.fecha.toLocaleString("es-CO")}
                </dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-slate-500">Pares evaluados</dt>
                <dd className="font-medium text-slate-900">
                  {m.ultimoRecalculo.paresEvaluados} ({m.ultimoRecalculo.perfiles} perfiles ×{" "}
                  {m.ultimoRecalculo.vacantes} vacantes)
                </dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-slate-500">Errores</dt>
                <dd
                  className={`font-medium ${
                    m.ultimoRecalculo.errores > 0 ? "text-red-700" : "text-slate-900"
                  }`}
                >
                  {m.ultimoRecalculo.errores}
                </dd>
              </div>
              <div className="flex justify-between sm:block">
                <dt className="text-slate-500">Duración</dt>
                <dd className="font-medium text-slate-900">{m.ultimoRecalculo.duracionMs} ms</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Nunca se ha ejecutado.</p>
          )}

          <form action={recalcularAction} className="mt-5">
            <button className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-marca hover:bg-acento-hover">
              Ejecutar recálculo
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Un match se considera bueno a partir de {UMBRAL_BUEN_MATCH}%.
          </p>
        </Card>
      </section>
    </main>
  );
}
