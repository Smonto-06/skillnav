// E4 · Preferencias laborales (salario, modalidad, ubicación, disponibilidad).
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";
import { guardarPreferenciasAction } from "./actions";

export const dynamic = "force-dynamic";

const MODALIDADES = [
  { value: "", label: "Sin preferencia" },
  { value: "REMOTO", label: "Remoto" },
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "HIBRIDO", label: "Híbrido" },
];

const DISPONIBILIDAD = ["Inmediata", "15 días", "30 días", "Más de 30 días"];

export default async function PreferenciasPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}) {
  const candidato = await requireCandidato();
  const pref = await prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm font-medium text-acento-texto">Lo que buscas</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Preferencias laborales</h1>
      <p className="mt-1 text-sm text-slate-500">
        Salario, modalidad y ciudad pesan el 25% de tu compatibilidad con cada vacante.
      </p>
      <Card className="mt-6">
        <form action={guardarPreferenciasAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
            {searchParams.error && <Alert message={searchParams.error} />}
          </div>

          <Field label="Aspiración salarial mínima (USD)">
            <input
              name="salarioMin"
              type="number"
              min="0"
              defaultValue={pref?.salarioMin ?? ""}
              placeholder="Ej. 2000"
              className={inputClass}
            />
          </Field>
          <Field label="Aspiración salarial máxima (USD)">
            <input
              name="salarioMax"
              type="number"
              min="0"
              defaultValue={pref?.salarioMax ?? ""}
              placeholder="Ej. 4500"
              className={inputClass}
            />
          </Field>

          <Field label="Modalidad de trabajo">
            <select name="modalidad" defaultValue={pref?.modalidad ?? ""} className={inputClass}>
              {MODALIDADES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ciudad donde quieres trabajar">
            <input
              name="ubicacion"
              defaultValue={pref?.ubicacion ?? ""}
              placeholder="Ej. Medellín"
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Disponibilidad para empezar">
              <select name="disponibilidad" defaultValue={pref?.disponibilidad ?? ""} className={inputClass}>
                <option value="">Sin especificar</option>
                {DISPONIBILIDAD.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                {pref?.disponibilidad && !DISPONIBILIDAD.includes(pref.disponibilidad) && (
                  <option value={pref.disponibilidad}>{pref.disponibilidad}</option>
                )}
              </select>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <SubmitButton>Guardar preferencias</SubmitButton>
          </div>
        </form>
      </Card>
    </main>
  );
}
