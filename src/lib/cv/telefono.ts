// HU-22 · Cuál de los teléfonos de un CV es el del candidato.
//
// Un CV con referencias trae varios números: el del candidato (en CONTACTO o en
// la cabecera, junto a su correo y su cédula) y los de las personas que lo
// recomiendan (en REFERENCIAS, junto a sus nombres). Tomar "el primero que
// aparezca" falla en cuanto el PDF viene a dos columnas, porque pdf.js extrae en
// orden de dibujo y REFERENCIAS puede salir antes que CONTACTO.
//
// Por eso cada número se clasifica por lo que lo rodea, no por su posición:
//
// 1. Si el reparto por secciones es fiable, manda la sección: CONTACTO o la
//    cabecera es del candidato, REFERENCIAS es de una referencia.
// 2. Si el layout está mezclado, manda la cercanía: un número junto a los datos
//    propios del candidato (correo, cédula, LinkedIn, dirección) es suyo; uno
//    junto al nombre de otra persona o a un cargo de jefe es de una referencia.
//
// El mismo clasificador verifica la respuesta del motor con IA, que puede
// equivocarse en lo mismo aunque el prompt se lo advierta.
import type { ContextoCV } from "./parser";

// Un documento de identidad se parece mucho a un teléfono. Si la línea lo
// anuncia como cédula, NIT o pasaporte, no es un teléfono.
export const RE_DOCUMENTO =
  /\b(c\.?c\.?|cedula|cédula|nit|t\.?i\.?|pasaporte|documento|identificacion|identificación)\b/i;

/**
 * Celular colombiano: 10 dígitos que empiezan por 3, con o sin indicativo +57
 * y con cualquier separación interna. Se exige el 3 inicial a propósito: es lo
 * que distingue un celular de una cédula de 10 dígitos.
 */
const RE_CELULAR_CO = /(?:\+?57[\s.-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g;
/** Fijo colombiano: indicativo de ciudad + 7 dígitos. */
const RE_FIJO_CO = /(?:\+?57[\s.-]?)?\(?\d{1,3}\)?[\s.-]?[2-8]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g;

const RE_EMAIL = /[\w.+-]{1,64}@[\w-]{1,63}\.[\w.-]{2,63}/;

/** Datos que solo pone el candidato sobre sí mismo. */
const RE_DATO_PROPIO =
  /(@|linkedin|github|direcci[oó]n|\bcalle\b|\bcra\b|\bcl\b|barrio|\bmedell[ií]n\b|\bbogot[aá]\b|\bcali\b)/i;

/**
 * Marca inequívoca de referencia en la misma línea del número
 * ("Ref. laboral: Marta Díaz 320...", "Jefe inmediato: ..."). Solo palabras que
 * nunca describen al candidato: un cargo como "Administrador" sí puede ser el
 * titular del propio candidato, así que no basta para descartar su número.
 */
const RE_MARCA_REFERENCIA = /\b(referencia|referencias|references|ref|jefe|jefa)\b/i;

/** Vocabulario de una referencia: quién es la persona que recomienda (pesa por cercanía). */
const RE_VOCAB_REFERENCIA =
  /\b(referencia|referencias|references|jefe|jefa|supervisor|supervisora|coordinador|coordinadora|gerente|director|directora|docente|profesor|profesora|administrador|administradora|propietario|propietaria|due[ñn]o|due[ñn]a|ref)\b/i;

/** Primeras palabras de una institución: parecen nombres propios y no lo son. */
const RE_INSTITUCION = /^(colegio|universidad|instituto|institucion|institución|escuela|liceo|corporacion|corporación|fundacion|fundación|empresa|almacen|almacén|tienda|sena)\b/i;

/** Solo los dígitos, sin indicativo: para comparar números escritos distinto. */
export function digitos(tel: string): string {
  const d = tel.replace(/\D/g, "");
  return d.length > 10 && d.startsWith("57") ? d.slice(2) : d;
}

export type DuenoTelefono = "candidato" | "referencia" | "incierto";

export interface TelefonoEncontrado {
  valor: string;
  linea: number;
  evidencia: string;
  dueno: DuenoTelefono;
  /** Por qué se atribuyó así: se muestra al candidato como evidencia. */
  motivo: string;
  /** Líneas hasta el dato propio más cercano: desempata entre números del candidato. */
  cercania: number;
}

/**
 * Nombre de una persona escrito como línea propia ("Paula Espinosa Osorio"):
 * de 2 a 4 palabras con mayúscula inicial, sin dígitos ni @. En un CV, fuera de
 * la cabecera, eso casi siempre es una referencia.
 */
function esNombreDePersona(ctx: ContextoCV, linea: string, nombreCandidato?: string): boolean {
  const l = linea.trim();
  if (/[\d@]/.test(l) || ctx.encabezado(l) || RE_INSTITUCION.test(l)) return false;
  const palabras = l.split(/\s+/);
  if (palabras.length < 2 || palabras.length > 4) return false;
  if (!palabras.every((p) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+$/.test(p))) return false;
  // El nombre del propio candidato no delata una referencia.
  if (nombreCandidato && mismaPersona(l, nombreCandidato)) return false;
  return true;
}

function mismaPersona(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
  const pa = norm(a);
  const pb = new Set(norm(b));
  // Dos palabras en común bastan: "Samuel Montoya" vs "Samuel Montoya Espinosa".
  return pa.filter((p) => pb.has(p)).length >= 2;
}

/** Distancia en líneas a la más cercana que cumple la condición (Infinity si no hay). */
function distancia(lineas: string[], desde: number, cumple: (l: string, i: number) => boolean): number {
  let mejor = Infinity;
  lineas.forEach((l, i) => {
    if (i !== desde && cumple(l, i)) mejor = Math.min(mejor, Math.abs(i - desde));
  });
  return mejor;
}

/** Sección a la que pertenece cada línea según el último encabezado visto. */
function seccionPorLinea(ctx: ContextoCV): (string | null)[] {
  let actual: string | null = null;
  return ctx.lineas.map((l) => {
    const encabezado = ctx.encabezado(l);
    if (encabezado) actual = encabezado;
    return encabezado ? null : actual;
  });
}

/**
 * Todos los teléfonos del CV, cada uno con su dueño probable.
 *
 * @param nombreCandidato si ya se conoce, evita tomar su nombre por el de una referencia
 */
export function clasificarTelefonos(ctx: ContextoCV, nombreCandidato?: string): TelefonoEncontrado[] {
  const lineas = ctx.lineas;
  const fiable = !ctx.layoutMezclado;
  const secciones = seccionPorLinea(ctx);

  const encontrados: TelefonoEncontrado[] = [];
  const vistos = new Set<string>();
  lineas.forEach((linea, i) => {
    if (RE_DOCUMENTO.test(linea)) return;
    for (const re of [RE_CELULAR_CO, RE_FIJO_CO]) {
      for (const m of Array.from(linea.matchAll(re))) {
        const valor = m[0].trim();
        const clave = digitos(valor);
        if (clave.length < 7 || vistos.has(clave)) continue;
        vistos.add(clave);
        encontrados.push({
          valor,
          linea: i,
          evidencia: linea.slice(0, 80),
          dueno: "incierto",
          motivo: "",
          cercania: Infinity,
        });
      }
    }
  });

  for (const t of encontrados) {
    const seccion = secciones[t.linea];

    // 1) Layout fiable: la sección decide.
    if (fiable && seccion === "referencias") {
      t.dueno = "referencia";
      t.motivo = "Está en la sección de referencias";
      continue;
    }
    if (fiable && (seccion === "contacto" || seccion === null)) {
      t.dueno = "candidato";
      t.motivo = seccion === "contacto" ? "Está en la sección de contacto" : "Está en la cabecera del CV";
      continue;
    }

    // 2) La propia línea lo anuncia ("Ref: Juan Pérez 300...", "Jefe inmediato").
    if (RE_MARCA_REFERENCIA.test(lineas[t.linea])) {
      t.dueno = "referencia";
      t.motivo = "La línea lo identifica como una referencia";
      continue;
    }

    // 3) Cercanía: ¿está más cerca de los datos del candidato o de otra persona?
    const aDatosPropios = distancia(
      lineas,
      t.linea,
      (l) => RE_DOCUMENTO.test(l) || RE_EMAIL.test(l) || RE_DATO_PROPIO.test(l)
    );
    const aReferencia = distancia(
      lineas,
      t.linea,
      (l, i) =>
        RE_VOCAB_REFERENCIA.test(l) ||
        // Un nombre de persona fuera de las primeras líneas es de una referencia.
        (i > 2 && esNombreDePersona(ctx, l, nombreCandidato))
    );
    t.cercania = aDatosPropios;
    if (aDatosPropios < aReferencia) {
      t.dueno = "candidato";
      t.motivo = "Está junto a tus datos personales (correo, documento o dirección)";
    } else if (aReferencia < aDatosPropios) {
      t.dueno = "referencia";
      t.motivo = "Está junto al nombre de otra persona (una referencia)";
    } else {
      t.dueno = "incierto";
      t.motivo = "No se pudo saber si es tuyo o de una referencia";
    }
  }
  return encontrados;
}

/**
 * El teléfono del candidato, o null si ninguno se le puede atribuir.
 *
 * Preferencia: atribuido al candidato (el más cercano a sus datos) y, si no hay
 * ninguno, uno incierto. Nunca uno clasificado como de referencia: es mejor
 * dejar el campo vacío para que el candidato lo escriba que guardar el número
 * de otra persona en su perfil.
 */
export function telefonoDelCandidato(
  ctx: ContextoCV,
  nombreCandidato?: string
): (TelefonoEncontrado & { confianza: "alta" | "media" | "baja" }) | null {
  const todos = clasificarTelefonos(ctx, nombreCandidato);
  const celularPrimero = (t: TelefonoEncontrado) => (/^\+?(57)?\s?3/.test(t.valor.replace(/[\s.-]/g, "")) ? 0 : 1);
  const orden = (a: TelefonoEncontrado, b: TelefonoEncontrado) =>
    celularPrimero(a) - celularPrimero(b) || a.cercania - b.cercania || a.linea - b.linea;

  const propios = todos.filter((t) => t.dueno === "candidato").sort(orden);
  if (propios.length) {
    const hayReferencias = todos.some((t) => t.dueno === "referencia");
    // Alta solo si la sección lo dice o no hay ningún número de referencia con
    // el que confundirlo; por cercanía en un layout mezclado queda en media.
    const porSeccion = propios[0].motivo.startsWith("Está en la sección") || propios[0].motivo.startsWith("Está en la cabecera");
    return { ...propios[0], confianza: porSeccion || !hayReferencias ? "alta" : "media" };
  }
  const inciertos = todos.filter((t) => t.dueno === "incierto").sort(orden);
  return inciertos.length ? { ...inciertos[0], confianza: "baja" } : null;
}

/** Los números atribuidos a referencias, en forma de solo dígitos. */
export function telefonosDeReferencias(ctx: ContextoCV, nombreCandidato?: string): Set<string> {
  return new Set(
    clasificarTelefonos(ctx, nombreCandidato)
      .filter((t) => t.dueno === "referencia")
      .map((t) => digitos(t.valor))
  );
}
