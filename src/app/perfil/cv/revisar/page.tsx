// HU-23 · Revisar los datos pre-diligenciados antes de guardarlos.
// Nada se escribe en el perfil hasta que el candidato confirme acá.
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";
import { resumenExtraccion, type Confianza, type PerfilExtraido } from "@/lib/cv/parser";
import { aplicarCVAction, descartarBorradorAction } from "../actions";

export const dynamic = "force-dynamic";

const ESTILO_CONFIANZA: Record<Confianza, string> = {
  alta: "border-acento/40 bg-acento-suave text-acento-texto",
  media: "border-amber-200 bg-amber-50 text-amber-800",
  baja: "border-red-200 bg-red-50 text-red-700",
};

const TEXTO_CONFIANZA: Record<Confianza, string> = {
  alta: "Confianza alta",
  media: "Revisa",
  baja: "Revisa con cuidado",
};

function Insignia({ confianza }: { confianza: Confianza }) {
  return (
    <span
      className={`ml-2 rounded-full border px-2 py-0.5 text-xs font-medium ${ESTILO_CONFIANZA[confianza]}`}
    >
      {TEXTO_CONFIANZA[confianza]}
    </span>
  );
}

export default async function RevisarCVPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const candidato = await requireCandidato();

  const guardado = await prisma.borradorCV.findUnique({ where: { candidatoId: candidato.id } });
  if (!guardado) redirect("/perfil/cv");

  const b = guardado.datos as unknown as PerfilExtraido;
  const r = resumenExtraccion(b);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm font-medium text-acento-texto">Paso 2 de 2</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Revisa lo que encontramos</h1>
      <p className="mt-2 text-sm text-slate-600">
        Leímos <strong>{guardado.archivo}</strong> y detectamos {r.detectados} de {r.total} datos.
        Desmarca lo que esté mal y corrige el texto si hace falta: <strong>solo se guarda lo
        que dejes marcado</strong>.
      </p>

      {searchParams.error && (
        <div className="mt-4">
          <Alert message={searchParams.error} />
        </div>
      )}

      <form action={aplicarCVAction} className="mt-6 space-y-5">
        <Card>
          <h2 className="font-semibold text-slate-900">Datos personales</h2>
          <p className="mt-1 text-xs text-slate-500">
            Deja un campo en blanco si no quieres guardarlo.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo">
              <input name="nombre" defaultValue={b.nombre?.valor ?? ""} className={inputClass} />
              {b.nombre && <Insignia confianza={b.nombre.confianza} />}
            </Field>
            <Field label="Contacto">
              <input
                name="contacto"
                defaultValue={b.telefono?.valor ?? b.email?.valor ?? ""}
                className={inputClass}
              />
              {b.telefono && <Insignia confianza={b.telefono.confianza} />}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Titular profesional">
                <input
                  name="titular"
                  defaultValue={b.titular?.valor ?? ""}
                  className={inputClass}
                />
                {b.titular && <Insignia confianza={b.titular.confianza} />}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="LinkedIn">
                <input
                  name="linkedin"
                  defaultValue={b.linkedin?.valor ?? ""}
                  className={inputClass}
                />
                {b.linkedin && <Insignia confianza={b.linkedin.confianza} />}
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">
            Habilidades ({r.habilidades})
            <Insignia confianza={b.habilidades.confianza} />
          </h2>
          <p className="mt-1 text-xs text-slate-500">{b.habilidades.evidencia}</p>
          {b.habilidades.valor.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No reconocimos habilidades en el archivo. Puedes agregarlas a mano desde tu perfil.
            </p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {b.habilidades.valor.map((h) => (
                <li key={h}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                    <input type="checkbox" name="habilidades" value={h} defaultChecked />
                    {h}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">
            Experiencia laboral ({r.experiencias})
            <Insignia confianza={b.experiencias.confianza} />
          </h2>
          <p className="mt-1 text-xs text-slate-500">{b.experiencias.evidencia}</p>
          {b.experiencias.valor.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No encontramos cargos con fechas. Agrégalos a mano desde tu perfil.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {b.experiencias.valor.map((e, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      name="experiencias"
                      value={i}
                      defaultChecked
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">{e.cargo}</span>
                      {e.empresa && <span className="text-slate-600"> · {e.empresa}</span>}
                      {e.periodo && <span className="block text-xs text-slate-500">{e.periodo}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">
            Educación ({r.educacion})
            <Insignia confianza={b.educacion.confianza} />
          </h2>
          <p className="mt-1 text-xs text-slate-500">{b.educacion.evidencia}</p>
          {b.educacion.valor.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No encontramos estudios. Agrégalos a mano desde tu perfil.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {b.educacion.valor.map((e, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      name="educacion"
                      value={i}
                      defaultChecked
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">{e.titulo}</span>
                      {e.institucion && <span className="text-slate-600"> · {e.institucion}</span>}
                      {e.anio && <span className="block text-xs text-slate-500">{e.anio}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>Guardar en mi perfil</SubmitButton>
          <Link href="/perfil" className="text-sm text-slate-600 hover:underline">
            Volver sin guardar
          </Link>
        </div>
      </form>

      <form action={descartarBorradorAction} className="mt-6 border-t border-slate-200 pt-4">
        <button className="text-sm text-red-600 hover:underline">
          Descartar este borrador y subir otro archivo
        </button>
      </form>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-slate-600 hover:underline">
          Ver el texto que leímos del archivo
        </summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          {b.textoOriginal}
        </pre>
      </details>
    </main>
  );
}
