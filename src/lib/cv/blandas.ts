// Vocabulario de habilidades blandas e idiomas.
//
// `taxonomia.ts` solo conoce tecnologías, porque existe para calcular afinidad
// técnica. Pero una hoja de vida administrativa, comercial o de servicio no
// menciona ninguna tecnología: su sección de habilidades dice "Liderazgo",
// "Trabajo en equipo", "Atención al cliente". Sin este catálogo el parser
// devolvía cero habilidades para esos perfiles, que son la mayoría del mercado.
//
// El modelo `Habilidad` ya distingue TECNICA de BLANDA; acá está lo que falta
// para poder llenar la segunda.
/**
 * Normaliza conservando la separación entre palabras.
 *
 * No se puede usar `clave` de taxonomia.ts: esa quita todos los caracteres no
 * alfanuméricos, incluidos los espacios, porque está pensada para nombres de
 * tecnología de una sola palabra ("Node.js" -> "nodejs"). Para frases como
 * "trabajo en equipo" eso destruye los límites de palabra y ninguna búsqueda
 * puede volver a encontrarlas.
 */
export function aplanar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface HabilidadBlanda {
  nombre: string;
  /** Variantes con las que aparece escrita en los CV. */
  alias: string[];
}

export const HABILIDADES_BLANDAS: HabilidadBlanda[] = [
  { nombre: "Liderazgo", alias: ["liderazgo", "lider", "liderar equipos"] },
  { nombre: "Comunicación", alias: ["comunicacion", "comunicacion efectiva", "comunicacion asertiva"] },
  { nombre: "Trabajo en equipo", alias: ["trabajo en equipo", "trabajo colaborativo", "colaboracion"] },
  { nombre: "Trabajo bajo presión", alias: ["trabajo bajo presion", "manejo de presion", "tolerancia a la presion"] },
  { nombre: "Toma de decisiones", alias: ["toma de decisiones", "capacidad de decision"] },
  { nombre: "Gestión del tiempo", alias: ["gestion del tiempo", "manejo del tiempo", "organizacion del tiempo"] },
  { nombre: "Pensamiento estratégico", alias: ["pensamiento estrategico", "vision estrategica"] },
  { nombre: "Pensamiento crítico", alias: ["pensamiento critico", "analisis critico"] },
  { nombre: "Resolución de problemas", alias: ["resolucion de problemas", "solucion de problemas"] },
  { nombre: "Atención al cliente", alias: ["atencion al cliente", "servicio al cliente", "atencion al usuario"] },
  { nombre: "Adaptabilidad", alias: ["adaptabilidad", "flexibilidad", "adaptacion al cambio"] },
  { nombre: "Proactividad", alias: ["proactividad", "proactivo", "iniciativa"] },
  { nombre: "Responsabilidad", alias: ["responsabilidad", "responsable"] },
  { nombre: "Puntualidad", alias: ["puntualidad", "puntual"] },
  { nombre: "Empatía", alias: ["empatia", "empatico"] },
  { nombre: "Negociación", alias: ["negociacion", "capacidad de negociacion"] },
  { nombre: "Creatividad", alias: ["creatividad", "creativo"] },
  { nombre: "Organización", alias: ["organizacion", "organizado", "capacidad organizativa"] },
  { nombre: "Aprendizaje rápido", alias: ["aprendizaje rapido", "aprendo rapido", "facilidad de aprendizaje"] },
  { nombre: "Manejo de personal", alias: ["manejo de personal", "gestion de personal", "supervision de personal"] },
  { nombre: "Ventas", alias: ["ventas", "asesoria comercial", "cierre de ventas"] },
  { nombre: "Manejo de caja", alias: ["manejo de caja", "caja registradora", "cajero"] },
];

export const IDIOMAS: HabilidadBlanda[] = [
  { nombre: "Español", alias: ["espanol", "castellano", "spanish"] },
  { nombre: "Inglés", alias: ["ingles", "english"] },
  { nombre: "Francés", alias: ["frances", "french"] },
  { nombre: "Portugués", alias: ["portugues", "portuguese"] },
  { nombre: "Alemán", alias: ["aleman", "german"] },
  { nombre: "Italiano", alias: ["italiano", "italian"] },
  { nombre: "Mandarín", alias: ["mandarin", "chino"] },
];

// Índice alias normalizado -> nombre canónico, construido una vez.
function construirIndice(catalogo: HabilidadBlanda[]): Map<string, string> {
  const indice = new Map<string, string>();
  for (const h of catalogo) {
    indice.set(aplanar(h.nombre), h.nombre);
    for (const a of h.alias) indice.set(aplanar(a), h.nombre);
  }
  return indice;
}

const INDICE_BLANDAS = construirIndice(HABILIDADES_BLANDAS);
const INDICE_IDIOMAS = construirIndice(IDIOMAS);

/**
 * Busca habilidades blandas e idiomas en un texto.
 *
 * Compara contra el texto normalizado con límites de palabra, para que
 * "puntualidad" no se dispare dentro de otra palabra. Devuelve los nombres
 * canónicos, sin repetir.
 */
function buscar(indice: Map<string, string>, texto: string): string[] {
  // Se rodea de espacios para que los límites de palabra funcionen también al
  // principio y al final del texto.
  const plano = ` ${aplanar(texto)} `;
  const encontradas = new Set<string>();
  for (const [alias, nombre] of indice) {
    if (!alias) continue;
    if (plano.includes(` ${alias} `)) encontradas.add(nombre);
  }
  return Array.from(encontradas).sort();
}

export function blandasMencionadas(texto: string): string[] {
  return buscar(INDICE_BLANDAS, texto);
}

export function idiomasMencionados(texto: string): string[] {
  return buscar(INDICE_IDIOMAS, texto);
}
