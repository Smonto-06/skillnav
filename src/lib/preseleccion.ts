// Preselección de candidatas antes de puntuar (etapa de "recall").
//
// EL PROBLEMA QUE RESUELVE
//
// Puntuar una vacante cuesta del orden de medio milisegundo. Con las decenas de
// vacantes de hoy eso es imperceptible, pero el costo crece en línea recta: un
// catálogo de 50.000 tardaría decenas de segundos por visita. El recorrido por
// lotes de `catalogo.ts` acota la memoria, no el tiempo: si hay que puntuar
// 50.000, hay que puntuar 50.000.
//
// LA FORMA CORRECTA DE ACOTARLO
//
// Es el mismo esquema de dos etapas que usan los buscadores: una etapa barata
// que propone un conjunto reducido de candidatas, y una cara que las ordena
// bien. Acá la etapa cara ya existe y es el Match Score; lo que faltaba era la
// barata.
//
// POR QUÉ SE PRESELECCIONA POR HABILIDADES Y ROL, Y NO POR CIUDAD
//
// La preselección solo es defendible si descarta cosas que no iban a quedar
// arriba. Las dimensiones del Match Score no pesan igual: habilidades 40% y rol
// 20% suman el 60%, mientras ubicación pesa 5% y modalidad 10%.
//
// Preseleccionar por ciudad sería un error: una vacante en otra ciudad con las
// habilidades y el cargo exactos puntúa muy por encima de una vacante local sin
// nada en común, porque solo pierde el 5% de la ubicación. Descartarla antes de
// puntuarla la borraría de la lista.
//
// En cambio, una vacante que no comparte ninguna habilidad ni afinidad de cargo
// ya perdió el 60% del puntaje. No puede competir con las que sí coinciden,
// salvo que el catálogo sea tan pobre que no haya ninguna que coincida — y para
// ese caso está la red de seguridad del final.
//
// QUÉ SE PIERDE
//
// Esto es una aproximación, y conviene decirlo: el orden de las que se
// devuelven es exacto, pero el conjunto del que salen es el que propuso la
// etapa barata. Es el precio de no puntuar el catálogo entero, y es el que
// pagan los sistemas de recomendación reales.

/** A partir de cuántas vacantes conviene preseleccionar en vez de puntuar todo. */
export const UMBRAL_PRESELECCION = 2_000;

/** Cuántas candidatas propone la etapa barata para que las ordene la cara. */
export const CANDIDATAS_OBJETIVO = 1_000;

export interface PerfilParaPreseleccion {
  titular?: string | null;
  /** Igual que en el perfil de scoring: un nombre suelto o una habilidad con detalle. */
  habilidades?: (string | { nombre: string })[];
  experiencias?: { cargo?: string | null }[];
}

const nombreDe = (h: string | { nombre: string }): string =>
  typeof h === "string" ? h : h.nombre;

/**
 * Términos con los que se buscan candidatas: las habilidades del candidato y
 * las palabras significativas de su cargo.
 *
 * Se descartan las palabras muy cortas y las de relleno: buscar "de" o "en"
 * traería el catálogo entero y dejaría la preselección sin efecto.
 */
export function terminosDeBusqueda(perfil: PerfilParaPreseleccion): string[] {
  const terminos = new Set<string>();

  for (const h of perfil.habilidades ?? []) {
    const n = nombreDe(h)?.trim();
    if (n && n.length >= 2) terminos.add(n.toLowerCase());
  }

  const cargos = [perfil.titular, ...(perfil.experiencias ?? []).map((e) => e.cargo)];
  for (const cargo of cargos) {
    for (const palabra of palabrasSignificativas(cargo)) terminos.add(palabra);
  }

  return [...terminos];
}

const VACIAS = new Set([
  "de", "del", "la", "el", "los", "las", "en", "y", "o", "a", "con", "para",
  "por", "un", "una", "al", "se", "su", "sus", "the", "of", "and", "senior",
  "junior", "semi", "ssr", "jr", "sr",
]);

function palabrasSignificativas(texto?: string | null): string[] {
  return (texto ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3 && !VACIAS.has(p));
}

/**
 * Condición de preselección lista para pasarle a Prisma como `where`.
 *
 * Devuelve `null` cuando no hay con qué preseleccionar —un perfil sin
 * habilidades ni cargo—, y en ese caso quien llama debe recorrer el catálogo
 * sin filtrar en vez de devolver una lista vacía: un perfil nuevo tiene que ver
 * vacantes igual.
 */
export function condicionDePreseleccion(
  perfil: PerfilParaPreseleccion,
  maximoTerminos = 25
): { OR: Record<string, unknown>[] } | null {
  const terminos = terminosDeBusqueda(perfil).slice(0, maximoTerminos);
  if (terminos.length === 0) return null;

  // Se busca en requisitos y en título: son los dos campos que alimentan las
  // dos dimensiones de más peso.
  return {
    OR: terminos.flatMap((t) => [
      { requisitos: { contains: t, mode: "insensitive" } },
      { titulo: { contains: t, mode: "insensitive" } },
    ]),
  };
}

export interface FiltrosEstructurales {
  modalidad?: string | null;
  salarioMin?: number | null;
}

/**
 * Arma la lista de condiciones que van dentro de un `AND` de Prisma.
 *
 * Tienen que ir en una lista y no como claves sueltas de un mismo objeto: la
 * preselección y los dos filtros usan la clave `OR`, y al mismo nivel el último
 * sobrescribiría a los anteriores. El síntoma sería un filtro que deja de
 * filtrar, sin ningún error.
 *
 * Los criterios de "sin dato no descarta" son los mismos que ya aplicaba el
 * filtro en memoria: una vacante sin modalidad declarada no contradice el
 * filtro de modalidad, y una sin salario no se puede afirmar que pague menos.
 */
export function condicionesDeCatalogo(
  preseleccion: { OR: Record<string, unknown>[] } | null,
  filtros: FiltrosEstructurales
): Record<string, unknown>[] {
  const condiciones: Record<string, unknown>[] = [];

  if (preseleccion) condiciones.push(preseleccion);

  const modalidad = filtros.modalidad?.trim().toUpperCase();
  if (modalidad) {
    condiciones.push({ OR: [{ modalidad: null }, { modalidad }] });
  }

  if (filtros.salarioMin != null) {
    condiciones.push({ OR: [{ salario: null }, { salario: { gte: filtros.salarioMin } }] });
  }

  return condiciones;
}

/**
 * Decide si para este catálogo conviene preseleccionar.
 *
 * Por debajo del umbral se puntúa todo, que es exacto y ya es barato. Esto es
 * lo que hace que el comportamiento de hoy no cambie: con un catálogo de
 * decenas de vacantes la preselección ni se activa.
 */
export function convienePreseleccionar(totalCatalogo: number, umbral = UMBRAL_PRESELECCION): boolean {
  return totalCatalogo > umbral;
}
