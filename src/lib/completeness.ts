// Completitud del perfil (HU-08). Función pura y testeable.
// Cada sección aporta un peso; devuelve porcentaje 0-100 y las secciones faltantes.
export interface CompletitudInput {
  nombre?: string | null;
  ciudad?: string | null;
  contacto?: string | null;
  educacionCount: number;
  experienciaCount: number;
  habilidadesCount: number;
  tienePreferencia: boolean;
}

interface Seccion {
  clave: string;
  etiqueta: string;
  completa: boolean;
}

export function completitud(input: CompletitudInput): {
  porcentaje: number;
  faltantes: string[];
  secciones: Seccion[];
} {
  const secciones: Seccion[] = [
    { clave: "nombre", etiqueta: "Nombre", completa: !!input.nombre?.trim() },
    { clave: "ciudad", etiqueta: "Ciudad", completa: !!input.ciudad?.trim() },
    { clave: "contacto", etiqueta: "Contacto", completa: !!input.contacto?.trim() },
    { clave: "educacion", etiqueta: "Educación", completa: input.educacionCount > 0 },
    { clave: "experiencia", etiqueta: "Experiencia", completa: input.experienciaCount > 0 },
    { clave: "habilidades", etiqueta: "Habilidades", completa: input.habilidadesCount > 0 },
    { clave: "preferencias", etiqueta: "Preferencias", completa: input.tienePreferencia },
  ];

  const completas = secciones.filter((s) => s.completa).length;
  const porcentaje = Math.round((completas / secciones.length) * 100);
  const faltantes = secciones.filter((s) => !s.completa).map((s) => s.etiqueta);

  return { porcentaje, faltantes, secciones };
}
