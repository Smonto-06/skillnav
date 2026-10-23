// Formulario de vacante compartido por "crear" y "editar" (HU-26).
// Un solo componente evita que los dos formularios se desincronicen.
import { Card, Field, inputClass, SubmitButton } from "./ui";

export interface VacanteFormValores {
  id?: string;
  titulo?: string | null;
  empresa?: string | null;
  descripcion?: string | null;
  requisitos?: string | null;
  experienciaMin?: number | null;
  salario?: number | null;
  modalidad?: string | null;
  ciudad?: string | null;
}

export function FormVacante({
  action,
  vacante = {},
  etiquetaBoton,
}: {
  action: (formData: FormData) => void | Promise<void>;
  vacante?: VacanteFormValores;
  etiquetaBoton: string;
}) {
  return (
    <Card>
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        {vacante.id && <input type="hidden" name="id" value={vacante.id} />}

        <div className="sm:col-span-2">
          <Field label="Título del cargo *">
            <input
              name="titulo"
              required
              defaultValue={vacante.titulo ?? ""}
              placeholder="Ej. Desarrollador Backend"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Empresa *">
          <input
            name="empresa"
            required
            defaultValue={vacante.empresa ?? ""}
            placeholder="Ej. Bancolombia"
            className={inputClass}
          />
        </Field>

        <Field label="Ciudad">
          <input
            name="ciudad"
            defaultValue={vacante.ciudad ?? ""}
            placeholder="Ej. Medellín"
            className={inputClass}
          />
        </Field>

        <Field label="Modalidad">
          <select name="modalidad" defaultValue={vacante.modalidad ?? ""} className={inputClass}>
            <option value="">Sin especificar</option>
            <option value="REMOTO">Remoto</option>
            <option value="HIBRIDO">Híbrido</option>
            <option value="PRESENCIAL">Presencial</option>
          </select>
        </Field>

        <Field label="Salario (USD)">
          <input
            name="salario"
            type="number"
            min="0"
            step="100"
            defaultValue={vacante.salario ?? ""}
            placeholder="Ej. 4500"
            className={inputClass}
          />
        </Field>

        <Field label="Experiencia mínima (años)">
          <input
            name="experienciaMin"
            type="number"
            min="0"
            max="50"
            defaultValue={vacante.experienciaMin ?? ""}
            placeholder="Ej. 3"
            className={inputClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Requisitos (separados por coma)">
            <input
              name="requisitos"
              defaultValue={vacante.requisitos ?? ""}
              placeholder="Ej. React, TypeScript, PostgreSQL"
              className={inputClass}
            />
          </Field>
          <p className="mt-1 text-xs text-slate-500">
            El motor compara cada requisito contra el perfil del candidato reconociendo sinónimos y
            equivalencias. Si dejas la lista vacía, la vacante queda abierta a cualquier perfil.
          </p>
        </div>

        <div className="sm:col-span-2">
          <Field label="Descripción">
            <textarea
              name="descripcion"
              rows={4}
              defaultValue={vacante.descripcion ?? ""}
              placeholder="Responsabilidades del cargo, equipo, beneficios..."
              className={inputClass}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <SubmitButton>{etiquetaBoton}</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
