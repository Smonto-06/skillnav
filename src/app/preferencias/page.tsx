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

export default async function PreferenciasPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string };
}) {
  const candidato = await requireCandidato();
  const pref = await prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } });

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">Preferencias laborales</h1>
      <Card>
        <form action={guardarPreferenciasAction} className="space-y-4">
          {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
          {searchParams.error && <Alert message={searchParams.error} />}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Salario mínimo (USD)">
              <input
                name="salarioMin"
                type="number"
                min="0"
                defaultValue={pref?.salarioMin ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Salario máximo (USD)">
              <input
                name="salarioMax"
                type="number"
                min="0"
                defaultValue={pref?.salarioMax ?? ""}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Modalidad">
            <select name="modalidad" defaultValue={pref?.modalidad ?? ""} className={inputClass}>
              {MODALIDADES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ubicación preferida">
            <input
              name="ubicacion"
              defaultValue={pref?.ubicacion ?? ""}
              placeholder="Ej. Medellín"
              className={inputClass}
            />
          </Field>

          <Field label="Disponibilidad">
            <input
              name="disponibilidad"
              defaultValue={pref?.disponibilidad ?? ""}
              placeholder="Ej. Inmediata, 30 días"
              className={inputClass}
            />
          </Field>

          <SubmitButton>Guardar preferencias</SubmitButton>
        </form>
      </Card>
    </main>
  );
}
