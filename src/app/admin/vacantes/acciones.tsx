"use client";
// Botón de eliminar con confirmación en el navegador (HU-26).
// Es cliente solo por el confirm(): borrar es destructivo y no debe ser un click.
// La validación real está en eliminarVacanteAction, que vuelve a exigir ADMIN y
// bloquea el borrado si la vacante ya tiene postulaciones.
import { useFormStatus } from "react-dom";
import { eliminarVacanteAction } from "../actions";

function Boton({ titulo, postulaciones }: { titulo: string; postulaciones: number }) {
  const { pending } = useFormStatus();
  const bloqueada = postulaciones > 0;

  return (
    <button
      type="submit"
      disabled={pending || bloqueada}
      title={
        bloqueada
          ? "No se puede eliminar: ya tiene postulaciones de candidatos"
          : `Eliminar ${titulo}`
      }
      onClick={(e) => {
        if (!confirm(`¿Eliminar la vacante "${titulo}"? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
      className="rounded-full border border-red-200 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

export function BotonEliminarVacante({
  id,
  titulo,
  postulaciones,
}: {
  id: string;
  titulo: string;
  postulaciones: number;
}) {
  return (
    <form action={eliminarVacanteAction}>
      <input type="hidden" name="id" value={id} />
      <Boton titulo={titulo} postulaciones={postulaciones} />
    </form>
  );
}
