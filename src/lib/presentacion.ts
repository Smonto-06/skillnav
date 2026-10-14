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

// Frase corta que resume cómo el perfil cubre los requisitos de la vacante.
export function resumenRequisitos(
  requisitos: { requisito: string; estado: "cumple" | "parcial" | "falta" }[]
): string {
  if (requisitos.length === 0) return "Esta vacante no exige habilidades específicas.";
  const de = (e: string) => requisitos.filter((r) => r.estado === e).map((r) => r.requisito);
  const [cumple, parcial, falta] = [de("cumple"), de("parcial"), de("falta")];
  if (cumple.length === requisitos.length) {
    return requisitos.length === 1 ? "Cumples el requisito de la vacante." : `Cumples los ${requisitos.length} requisitos de la vacante.`;
  }
  if (falta.length === requisitos.length) {
    return `Aún no hay coincidencias directas; esta vacante requiere ${falta.join(", ")}.`;
  }
  const partes = cumple.length ? [`Cumples ${cumple.length} de ${requisitos.length} requisitos`] : [];
  if (parcial.length) partes.push(`cubres en parte ${parcial.join(", ")}`);
  if (falta.length) partes.push(`podrías fortalecer ${falta.join(", ")}`);
  const frase = partes.join("; ") + ".";
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

// Estados de postulación tal como se muestran al candidato, en orden de avance.
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

// Tipos de formación en orden de nivel (el orden define el desplegable).
// Los "complementarios" se muestran aparte de la formación académica.
export const NIVEL_EDUCATIVO_LABEL: Record<string, string> = {
  BACHILLER: "Bachiller",
  CURSO: "Curso corto",
  CERTIFICACION: "Certificación",
  DIPLOMADO: "Diplomado",
  BOOTCAMP: "Bootcamp",
  TECNICO: "Técnico",
  TECNOLOGO: "Tecnólogo",
  PROFESIONAL: "Profesional (pregrado)",
  ESPECIALIZACION: "Especialización",
  MAESTRIA: "Maestría",
  DOCTORADO: "Doctorado",
};

export const FORMACION_COMPLEMENTARIA = new Set(["CURSO", "CERTIFICACION", "DIPLOMADO", "BOOTCAMP"]);

// Rango para ordenar de mayor a menor nivel.
export function rangoEducativo(nivel?: string | null): number {
  return nivel ? Object.keys(NIVEL_EDUCATIVO_LABEL).indexOf(nivel) : -1;
}

export const NIVEL_IDIOMA_LABEL: Record<string, string> = {
  A1: "A1 · Principiante",
  A2: "A2 · Básico",
  B1: "B1 · Intermedio",
  B2: "B2 · Intermedio alto",
  C1: "C1 · Avanzado",
  C2: "C2 · Maestría",
  NATIVO: "Nativo",
};
