// Formulario de experiencia laboral (agregar y editar comparten campos y validación).
import { Field, inputClass, SubmitButton } from "@/components/ui";
import { actualizarExperienciaAction, agregarExperienciaAction } from "./actions";

export default function FormExperiencia({
  exp,
}: {
  exp?: {
    id: string;
    cargo: string;
    empresa: string;
    inicio: string;
    fin: string;
    actual: boolean;
    descripcion: string;
  };
}) {
  return (
    <form action={exp ? actualizarExperienciaAction : agregarExperienciaAction} className="grid gap-4 sm:grid-cols-2">
      {exp && <input type="hidden" name="id" value={exp.id} />}
      <Field label="Cargo *">
        <input
          name="cargo"
          list="sugerencias-titular"
          required
          defaultValue={exp?.cargo}
          placeholder="Ej. Desarrollador Backend"
          className={inputClass}
        />
      </Field>
      <Field label="Empresa *">
        <input name="empresa" required defaultValue={exp?.empresa} placeholder="Ej. Bancolombia" className={inputClass} />
      </Field>
      <Field label="Mes de inicio *">
        <input name="fechaInicio" type="month" required defaultValue={exp?.inicio} className={inputClass} />
      </Field>
      <Field label="Mes de finalización">
        <input name="fechaFin" type="month" defaultValue={exp?.fin} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input type="checkbox" name="actual" defaultChecked={exp?.actual} className="h-4 w-4 accent-acento" />
        Trabajo aquí actualmente (no hace falta mes de finalización)
      </label>
      <div className="sm:col-span-2">
        <Field label="Funciones y logros">
          <textarea
            name="descripcion"
            rows={4}
            maxLength={1500}
            defaultValue={exp?.descripcion}
            placeholder={"Ej. Diseñé y mantuve APIs REST en Node.js para 200.000 usuarios.\nReduje en 40% el tiempo de respuesta optimizando consultas SQL."}
            className={inputClass}
          />
        </Field>
        <p className="mt-1 text-xs text-slate-400">
          Usa verbos de acción y, si puedes, cifras. Menciona las tecnologías que usaste.
        </p>
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>{exp ? "Guardar cambios" : "Agregar experiencia"}</SubmitButton>
      </div>
    </form>
  );
}
