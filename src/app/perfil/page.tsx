// E2 · Perfil de candidato — datos personales, educación, experiencia, habilidades, completitud.
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completitud } from "@/lib/completeness";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";
import {
  guardarDatosPersonalesAction,
  agregarEducacionAction,
  eliminarEducacionAction,
  agregarExperienciaAction,
  eliminarExperienciaAction,
  actualizarExperienciaAction,
  agregarHabilidadAction,
  eliminarHabilidadAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}) {
  const candidato = await requireCandidato();

  const [educaciones, experiencias, habilidades, preferencia] = await Promise.all([
    prisma.educacion.findMany({ where: { candidatoId: candidato.id }, orderBy: { anio: "desc" } }),
    prisma.experiencia.findMany({ where: { candidatoId: candidato.id }, orderBy: { fechaInicio: "desc" } }),
    prisma.habilidad.findMany({ where: { candidatoId: candidato.id }, orderBy: { nombre: "asc" } }),
    prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } }),
  ]);

  const { porcentaje, faltantes } = completitud({
    nombre: candidato.nombre,
    ciudad: candidato.ciudad,
    contacto: candidato.contacto,
    educacionCount: educaciones.length,
    experienciaCount: experiencias.length,
    habilidadesCount: habilidades.length,
    tienePreferencia: !!preferencia,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <h1 className="text-2xl font-bold">Mi perfil</h1>

      {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
      {searchParams.error && <Alert message={searchParams.error} />}

      {/* Completitud */}
      <Card>
        <h2 className="mb-2 font-semibold">Completitud del perfil</h2>
        <div className="h-3 w-full rounded-full bg-slate-200">
          <div
            className="h-3 rounded-full bg-blue-500 transition-all"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {porcentaje}% completo
          {faltantes.length > 0 && ` · Faltan: ${faltantes.join(", ")}`}
        </p>
      </Card>

      {/* Datos personales */}
      <Card>
        <h2 className="mb-4 font-semibold">Datos personales</h2>
        <form action={guardarDatosPersonalesAction} className="space-y-3">
          <Field label="Nombre">
            <input name="nombre" defaultValue={candidato.nombre ?? ""} required className={inputClass} />
          </Field>
          <Field label="Ciudad">
            <input name="ciudad" defaultValue={candidato.ciudad ?? ""} className={inputClass} />
          </Field>
          <Field label="Contacto (teléfono o LinkedIn)">
            <input name="contacto" defaultValue={candidato.contacto ?? ""} className={inputClass} />
          </Field>
          <SubmitButton>Guardar</SubmitButton>
        </form>
      </Card>

      {/* Educación */}
      <Card>
        <h2 className="mb-4 font-semibold">Educación</h2>
        {educaciones.length > 0 && (
          <ul className="mb-4 divide-y">
            {educaciones.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <strong>{e.titulo}</strong> — {e.institucion}
                  {e.anio ? ` (${e.anio})` : ""}
                </span>
                <form action={eliminarEducacionAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="ml-4 text-red-500 hover:underline">Eliminar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary className="cursor-pointer text-sm text-blue-600 hover:underline">+ Agregar educación</summary>
          <form action={agregarEducacionAction} className="mt-3 space-y-3">
            <Field label="Institución">
              <input name="institucion" required className={inputClass} />
            </Field>
            <Field label="Título">
              <input name="titulo" required className={inputClass} />
            </Field>
            <Field label="Año de graduación">
              <input name="anio" type="number" min="1950" max="2100" className={inputClass} />
            </Field>
            <SubmitButton>Agregar</SubmitButton>
          </form>
        </details>
      </Card>

      {/* Experiencia */}
      <Card>
        <h2 className="mb-4 font-semibold">Experiencia laboral</h2>
        {experiencias.length > 0 && (
          <ul className="mb-4 divide-y">
            {experiencias.map((e) => (
              <li key={e.id} className="py-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <strong>{e.cargo}</strong> · {e.empresa}
                    {e.descripcion && (
                      <p className="mt-1 text-slate-500">{e.descripcion}</p>
                    )}
                  </div>
                  <div className="ml-4 flex shrink-0 gap-2">
                    <a href={`/perfil/experiencia/${e.id}`} className="text-blue-500 hover:underline">
                      Editar
                    </a>
                    <form action={eliminarExperienciaAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="text-red-500 hover:underline">Eliminar</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary className="cursor-pointer text-sm text-blue-600 hover:underline">+ Agregar experiencia</summary>
          <form action={agregarExperienciaAction} className="mt-3 space-y-3">
            <Field label="Empresa">
              <input name="empresa" required className={inputClass} />
            </Field>
            <Field label="Cargo">
              <input name="cargo" required className={inputClass} />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea name="descripcion" rows={2} className={inputClass} />
            </Field>
            <SubmitButton>Agregar</SubmitButton>
          </form>
        </details>
      </Card>

      {/* Habilidades */}
      <Card>
        <h2 className="mb-4 font-semibold">Habilidades</h2>
        {habilidades.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-2">
            {habilidades.map((h) => (
              <li key={h.id} className="flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-sm">
                {h.nombre}
                <span className="text-xs text-slate-400">({h.tipo === "TECNICA" ? "Téc" : "Bland"})</span>
                <form action={eliminarHabilidadAction} className="inline">
                  <input type="hidden" name="id" value={h.id} />
                  <button className="ml-1 text-red-400 hover:text-red-600">×</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary className="cursor-pointer text-sm text-blue-600 hover:underline">+ Agregar habilidad</summary>
          <form action={agregarHabilidadAction} className="mt-3 flex gap-3 items-end">
            <Field label="Nombre">
              <input name="nombre" required className={inputClass} />
            </Field>
            <Field label="Tipo">
              <select name="tipo" className={inputClass}>
                <option value="TECNICA">Técnica</option>
                <option value="BLANDA">Blanda</option>
              </select>
            </Field>
            <SubmitButton>Agregar</SubmitButton>
          </form>
        </details>
      </Card>
    </main>
  );
}
