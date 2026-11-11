// HU-22 · Cuál de los teléfonos de un CV es el del candidato.
//
// Un CV con referencias trae varios números: el del candidato (en CONTACTO o en
// la cabecera) y los de las personas que lo recomiendan (en REFERENCIAS, con sus
// nombres). El motor con IA tomaba el de una referencia en un CV real a dos
// columnas, aunque el prompt se lo advertía.
//
// Regla general: un número es del candidato salvo que haya evidencia FUERTE de
// que es de una referencia. Lo que no sirve es la cercanía a la cédula o al
// correo: en un PDF a dos columnas pdf.js extrae en orden de dibujo, y en el CV
// real los datos del candidato quedaban pegados justo a los números de las
// referencias. Las evidencias que sí se sostienen:
//
// 1. Con secciones fiables (una columna), la sección: REFERENCIAS es de otra
//    persona; CONTACTO o la cabecera, del candidato.
// 2. La propia línea lo anuncia ("Ref. laboral: …", "Jefe inmediato …") o trae
//    el nombre de otra persona junto al número.
// 3. Bloque de referencias: con N nombres de referencias, N números seguidos
//    (una línea cada uno) son sus teléfonos. En el CV real: Paula y Sergio, y
//    justo 315 645 8363 y 316 747 43 39 uno detrás del otro.
//
// Entre los que quedan, gana el primero del documento: el candidato pone su
// contacto antes que sus referencias.
//
// El mismo clasificador verifica la respuesta del motor con IA.
import type { ContextoCV } from "./parser";
import { blandasMencionadas, idiomasMencionados } from "./blandas";

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

/**
 * Marca inequívoca de referencia en la misma línea del número. Solo palabras
 * que nunca describen al candidato: un cargo como "Administrador" sí puede ser
 * su propio titular, así que no basta para descartar su número.
 */
const RE_MARCA_REFERENCIA = /\b(referencia|referencias|references|ref|jefe|jefa)\b/i;

/** Primeras palabras de una institución: parecen nombres propios y no lo son. */
const RE_INSTITUCION =
  /^(colegio|universidad|instituto|institucion|institución|escuela|liceo|corporacion|corporación|fundacion|fundación|empresa|almacen|almacén|tienda|sena)\b/i;

/** Solo los dígitos, sin indicativo: para comparar números escritos distinto. */
export function digitos(tel: string): string {
  const d = tel.replace(/\D/g, "");
  return d.length > 10 && d.startsWith("57") ? d.slice(2) : d;
}

export type DuenoTelefono = "candidato" | "referencia";

export interface TelefonoEncontrado {
  valor: string;
  linea: number;
  evidencia: string;
  dueno: DuenoTelefono;
  /** Por qué se atribuyó así: se muestra al candidato como evidencia. */
  motivo: string;
}

function mismaPersona(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
  const pb = new Set(norm(b));
  // Dos palabras en común bastan: "Samuel Montoya" vs "Samuel Montoya Espinosa".
  return norm(a).filter((p) => pb.has(p)).length >= 2;
}

/**
 * Nombre de otra persona ("Paula Espinosa Osorio"): de 2 a 4 palabras con
 * mayúscula inicial, sin @, que no son una institución ni el propio candidato.
 * Se mira el texto sin los números para reconocer "Paula Espinosa 315 ...".
 */
function nombreDeOtraPersona(ctx: ContextoCV, linea: string, nombreCandidato?: string): boolean {
  const l = linea
    .replace(/[+\d][\d\s.()-]{6,}/g, " ")
    .replace(/[-–:·|,]/g, " ")
    .trim();
  if (!l || /[@\d]/.test(l) || ctx.encabezado(l) || RE_INSTITUCION.test(l)) return false;
  // "Español Inglés" o "Trabajo En Equipo" también son palabras con mayúscula.
  if (idiomasMencionados(l).length || blandasMencionadas(l).length) return false;
  const palabras = l.split(/\s+/);
  if (palabras.length < 2 || palabras.length > 4) return false;
  if (!palabras.every((p) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+$/.test(p))) return false;
  return !(nombreCandidato && mismaPersona(l, nombreCandidato));
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
 * Todos los teléfonos del CV, cada uno con su dueño.
 *
 * @param nombreCandidato si ya se conoce, evita tomar su nombre por el de una referencia
 */
export function clasificarTelefonos(ctx: ContextoCV, nombreCandidato?: string): TelefonoEncontrado[] {
  const lineas = ctx.lineas;
  // Dos encabezados seguidos ("CONTACTO" y luego "REFERENCIAS") dejan la primera
  // sección vacía: su contenido salió en otro lado, así que la sección de cada
  // número no significa nada aunque el resto del documento parezca ordenado.
  const encabezadosSeguidos = lineas.some((l, i) => i > 0 && ctx.encabezado(l) && ctx.encabezado(lineas[i - 1]));
  const fiable = !ctx.layoutMezclado && !encabezadosSeguidos;
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
          dueno: "candidato",
          motivo: "No hay señales de que sea de una referencia",
        });
      }
    }
  });

  // 3) Bloque de referencias: varios números seguidos, uno por línea, cuando hay
  //    al menos tantos nombres de otras personas. Se calcula antes del recorrido
  //    para marcar el bloque entero.
  const nombres = lineas.filter((l) => nombreDeOtraPersona(ctx, l, nombreCandidato)).length;
  const soloNumero = (i: number) =>
    encontrados.some((t) => t.linea === i) && lineas[i].replace(/[\d\s+().-]/g, "") === "";
  const enBloque = new Set<number>();
  if (nombres >= 2) {
    for (let i = 0; i < lineas.length; ) {
      if (!soloNumero(i)) {
        i++;
        continue;
      }
      let fin = i;
      while (fin + 1 < lineas.length && soloNumero(fin + 1)) fin++;
      // Al menos dos (un número suelto no forma un bloque) y no más que los
      // nombres de referencias. Y solo si quedan otros números por fuera: si
      // todos forman el bloque, no hay con qué distinguir el del candidato.
      const largo = fin - i + 1;
      if (largo >= 2 && largo <= nombres && encontrados.length > largo) {
        for (let j = i; j <= fin; j++) enBloque.add(j);
      }
      i = fin + 1;
    }
  }

  for (const t of encontrados) {
    const seccion = secciones[t.linea];
    const linea = lineas[t.linea];

    if (fiable && seccion === "referencias") {
      // 1) Layout fiable: la sección decide.
      t.dueno = "referencia";
      t.motivo = "Está en la sección de referencias";
    } else if (fiable && seccion === "contacto") {
      t.motivo = "Está en la sección de contacto";
    } else if (fiable && seccion === null) {
      t.motivo = "Está en la cabecera del CV";
    } else if (RE_MARCA_REFERENCIA.test(linea)) {
      // 2) La propia línea lo anuncia como referencia.
      t.dueno = "referencia";
      t.motivo = "La línea lo identifica como una referencia";
    } else if (nombreDeOtraPersona(ctx, linea, nombreCandidato)) {
      t.dueno = "referencia";
      t.motivo = "Está en la misma línea que el nombre de otra persona";
    } else if (enBloque.has(t.linea)) {
      // 3) Parte del bloque de teléfonos de las referencias.
      t.dueno = "referencia";
      t.motivo = "Forma un bloque de números seguidos junto con los de las otras referencias";
    }
  }
  return encontrados;
}

/**
 * El teléfono del candidato, o null si ninguno se le puede atribuir.
 *
 * Nunca devuelve uno clasificado como de referencia: es mejor dejar el campo
 * vacío para que el candidato lo escriba que guardar el número de otra persona.
 */
export function telefonoDelCandidato(
  ctx: ContextoCV,
  nombreCandidato?: string
): (TelefonoEncontrado & { confianza: "alta" | "media" | "baja" }) | null {
  const todos = clasificarTelefonos(ctx, nombreCandidato);
  const esCelular = (t: TelefonoEncontrado) => /^(\+?57)?3/.test(t.valor.replace(/[\s.()-]/g, ""));
  // Celulares antes que fijos; entre iguales, el primero del documento.
  const propios = todos
    .filter((t) => t.dueno === "candidato")
    .sort((a, b) => Number(esCelular(b)) - Number(esCelular(a)) || a.linea - b.linea);
  if (!propios.length) return null;

  const elegido = propios[0];
  const porSeccion =
    elegido.motivo.startsWith("Está en la sección") || elegido.motivo.startsWith("Está en la cabecera");
  const hayReferencias = todos.some((t) => t.dueno === "referencia");
  // Alta: lo dice la sección, o es el único número del CV. Media: se descartaron
  // referencias por bloque o marca, o quedan varios números posibles.
  const confianza = porSeccion || (todos.length === 1 && !hayReferencias) ? "alta" : "media";
  return {
    ...elegido,
    motivo:
      hayReferencias && !porSeccion
        ? "Es el número que queda tras descartar los de las referencias"
        : elegido.motivo,
    confianza,
  };
}

/** Los números atribuidos a referencias, en forma de solo dígitos. */
export function telefonosDeReferencias(ctx: ContextoCV, nombreCandidato?: string): Set<string> {
  return new Set(
    clasificarTelefonos(ctx, nombreCandidato)
      .filter((t) => t.dueno === "referencia")
      .map((t) => digitos(t.valor))
  );
}
