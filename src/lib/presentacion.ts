// Helpers de presentación compartidos por las páginas (funciones puras y testeables).
// Traducen datos de BD a textos legibles: modalidad, línea de detalle de la vacante,
// explicación de habilidades que coinciden y etiquetas de estado de postulación.
import type { Modalidad } from "./scoring";

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  PRESENCIAL: "Presencial",
  REMOTO: "Remoto",
  HIBRIDO: "Híbrido",
};

export function modalidadLabel(m?: string | null): string | null {
  return m ? MODALIDAD_LABEL[m as Modalidad] ?? m : null;
}

// "Híbrido · Medellin · 3800 USD" (omite los datos que la vacante no tenga).
export function detalleVacante(v: {
  modalidad?: string | null;
  ciudad?: string | null;
  salario?: number | null;
}): string {
  return [modalidadLabel(v.modalidad), v.ciudad, v.salario != null ? `${v.salario} USD` : null]
    .filter(Boolean)
    .join(" · ");
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Separa los requisitos de la vacante en los que el candidato ya cubre y los que le faltan.
// Usa la misma normalización que el scoring para que el texto y el porcentaje coincidan.
export function coincidencias(
  habilidades: string[],
  requisitos: string[]
): { coinciden: string[]; faltan: string[] } {
  const propias = new Set(habilidades.map(norm));
  const coinciden = requisitos.filter((r) => propias.has(norm(r)));
  const faltan = requisitos.filter((r) => !propias.has(norm(r)));
  return { coinciden, faltan };
}

// Frase corta que explica el componente de habilidades del Match Score.
export function explicarCoincidencias(habilidades: string[], requisitos: string[]): string {
  if (requisitos.length === 0) return "Esta vacante no exige habilidades específicas.";
  const { coinciden, faltan } = coincidencias(habilidades, requisitos);
  if (coinciden.length === 0) {
    return `Aún no hay coincidencias directas; esta vacante requiere ${faltan.join(", ")}.`;
  }
  if (faltan.length === 0) {
    return `Cumples todos los requisitos: ${coinciden.join(", ")}.`;
  }
  return `Coincides en ${coinciden.join(", ")}; podrías fortalecer ${faltan.join(", ")}.`;
}

// Estados de postulación tal como se muestran al candidato, en orden de avance.
// OFERTA aún no existe en el enum de Prisma: se muestra para completar el embudo
// y empezará a contar cuando se agregue ese estado a la BD.
export const ESTADOS_POSTULACION = [
  { clave: "POSTULADO", etiqueta: "Enviada", plural: "Enviadas" },
  { clave: "EN_REVISION", etiqueta: "En revisión", plural: "En revisión" },
  { clave: "ENTREVISTA", etiqueta: "Entrevista", plural: "Entrevistas" },
  { clave: "OFERTA", etiqueta: "Oferta", plural: "Ofertas" },
  { clave: "DESCARTADO", etiqueta: "Rechazada", plural: "Rechazadas" },
] as const;

export function estadoLabel(clave: string): string {
  return ESTADOS_POSTULACION.find((e) => e.clave === clave)?.etiqueta ?? clave;
}

// Compara sin mayúsculas ni tildes ("Medellín" encuentra "Medellin").
function plano(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// Filtro del buscador: `q` busca en cargo, empresa, requisitos y descripción;
// `ciudad` en la ciudad de la vacante. Vacíos no filtran.
export function filtrarVacantes<
  T extends {
    titulo: string;
    empresa: string;
    requisitos?: string | null;
    descripcion?: string | null;
    ciudad?: string | null;
  },
>(vacantes: T[], q?: string, ciudad?: string): T[] {
  const texto = plano(q ?? "");
  const lugar = plano(ciudad ?? "");
  return vacantes.filter(
    (v) =>
      (!texto ||
        [v.titulo, v.empresa, v.requisitos ?? "", v.descripcion ?? ""].some((c) =>
          plano(c).includes(texto)
        )) &&
      (!lugar || plano(v.ciudad ?? "").includes(lugar))
  );
}
