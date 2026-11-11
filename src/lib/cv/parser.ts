// HU-22 · Extracción estructurada de datos a partir del texto de una hoja de vida.
//
// Patrón COMPOSITE / CHAIN OF RESPONSIBILITY: el parser no sabe cómo se
// detecta cada campo. Mantiene una lista de `DetectorCampo`, y cada detector
// aporta lo que sabe reconocer sobre el borrador compartido. Agregar un campo
// nuevo (idiomas, certificaciones) es agregar un detector, sin tocar el resto.
//
// Decisión de diseño importante: ningún dato se guarda directo en el perfil.
// Cada campo detectado viaja con una confianza, y HU-23 le muestra el borrador
// al candidato para que confirme o corrija. Un parser por reglas se equivoca, y
// es más honesto mostrar la duda que escribir datos falsos en el perfil.
import { HabilidadCatalogo, clave, detectarRoles, habilidadesMencionadas } from "../taxonomia";
import { blandasMencionadas, idiomasMencionados } from "./blandas";

export type Confianza = "alta" | "media" | "baja";

export interface CampoDetectado<T> {
  valor: T;
  confianza: Confianza;
  /** De dónde salió el dato, para que el candidato pueda juzgarlo. */
  evidencia: string;
}

export interface ExperienciaDetectada {
  cargo: string;
  empresa?: string;
  /** Texto del periodo tal como aparece en el CV ("2023 - 2026", "mar 2024 - actual"). */
  periodo?: string;
  anioInicio?: number;
  anioFin?: number;
  actual: boolean;
}

export interface EducacionDetectada {
  titulo: string;
  institucion?: string;
  anio?: number;
}

export interface PerfilExtraido {
  nombre?: CampoDetectado<string>;
  email?: CampoDetectado<string>;
  telefono?: CampoDetectado<string>;
  linkedin?: CampoDetectado<string>;
  titular?: CampoDetectado<string>;
  habilidades: CampoDetectado<string[]>;
  /** Cuáles de las habilidades son blandas o idiomas (el resto son técnicas). */
  habilidadesBlandas?: Set<string> | string[];
  experiencias: CampoDetectado<ExperienciaDetectada[]>;
  educacion: CampoDetectado<EducacionDetectada[]>;
  /**
   * true si el CV venía a varias columnas y el reparto por secciones no era
   * fiable. Se avisa al candidato para que revise con más cuidado (HU-23).
   */
  layoutMezclado: boolean;
  /** Texto completo, por si el candidato quiere revisar el original. */
  textoOriginal: string;
}

/** Contrato de cada detector del composite. */
export interface DetectorCampo {
  readonly campo: string;
  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void;
}

// ---------------------------------------------------------------------------
// Contexto: el texto ya preprocesado, para que los detectores no repitan trabajo
// ---------------------------------------------------------------------------

/** Encabezados habituales de una hoja de vida en español e inglés. */
const ENCABEZADOS: Record<string, string[]> = {
  experiencia: [
    "experiencia laboral",
    "experiencia profesional",
    "experiencia",
    "trayectoria",
    "historial laboral",
    "work experience",
    "employment",
  ],
  educacion: [
    "educacion",
    "formacion academica",
    "formacion",
    "estudios",
    "education",
    "academic background",
  ],
  habilidades: [
    "habilidades",
    "competencias",
    "conocimientos",
    "aptitudes",
    "tecnologias",
    "skills",
    "technical skills",
  ],
  perfil: ["perfil profesional", "perfil", "resumen", "acerca de mi", "sobre mi", "summary", "about"],
  // Estos tres no aportan datos al perfil, pero reconocerlos es lo que permite
  // darse cuenta de que el CV viene a varias columnas: si no están en el
  // catálogo, pasan por contenido de la sección anterior y el desorden se
  // vuelve invisible.
  idiomas: ["idiomas", "languages", "nivel de idiomas"],
  // El catálogo de estos dos es más ancho que el de los demás a propósito: de
  // que se reconozcan depende saber cuál teléfono es del candidato y cuál de
  // sus referencias. Un encabezado que no esté acá no rompe nada, pero deja la
  // decisión en manos de la heurística de la cabecera.
  contacto: [
    "contacto",
    "contactos",
    "datos de contacto",
    "informacion de contacto",
    "información de contacto",
    "datos personales",
    "informacion personal",
    "información personal",
    "datos basicos",
    "datos básicos",
    "contact",
    "contact information",
    "personal information",
  ],
  referencias: [
    "referencias",
    "referencias personales",
    "referencias laborales",
    "referencias familiares",
    "referencia personal",
    "referencia laboral",
    "contactos de referencia",
    "references",
  ],
};

export class ContextoCV {
  readonly lineas: string[];
  /** Secciones reconocidas por encabezado: clave -> líneas que contiene. */
  readonly secciones: Map<string, string[]>;

  constructor(readonly texto: string) {
    this.lineas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    this.secciones = ContextoCV.partirEnSecciones(this.lineas);
  }

  /**
   * Una línea es encabezado si coincide (sin tildes ni mayúsculas) con alguno
   * de los títulos conocidos y es corta. El límite de longitud evita confundir
   * un encabezado con una frase que lo menciona de pasada.
   */
  static encabezadoDe(linea: string): string | null {
    const limpia = clave(linea.replace(/[:·•|]/g, " "));
    if (!limpia || limpia.length > 40) return null;
    for (const [seccion, titulos] of Object.entries(ENCABEZADOS)) {
      if (titulos.some((t) => limpia === clave(t))) return seccion;
    }
    return null;
  }

  private static partirEnSecciones(lineas: string[]): Map<string, string[]> {
    const secciones = new Map<string, string[]>();
    let actual: string | null = null;
    for (const linea of lineas) {
      const encabezado = ContextoCV.encabezadoDe(linea);
      if (encabezado) {
        actual = encabezado;
        if (!secciones.has(actual)) secciones.set(actual, []);
        continue;
      }
      if (actual) secciones.get(actual)!.push(linea);
    }
    return secciones;
  }

  /**
   * Un CV a dos columnas rompe el supuesto de "encabezado seguido de su
   * contenido": pdf.js extrae el texto en orden de dibujo, no de lectura, así
   * que los encabezados de la columna derecha salen juntos y su contenido
   * aparece antes o después, mezclado con el de la izquierda.
   *
   * Síntoma observable: encabezados pegados entre sí (secciones vacías) o una
   * sección que se queda con casi todo el documento porque es la última.
   * Cuando eso pasa, repartir por secciones hace más daño que bien y cada
   * detector debe mirar el documento completo.
   */
  static layoutEsConfiable(lineas: string[], secciones: Map<string, string[]>): boolean {
    if (secciones.size < 2) return false;

    // Señal directa: dos encabezados seguidos, sin una sola línea de contenido
    // entre ellos. En un CV de una columna eso no pasa.
    let seguidos = 0;
    let anterior = false;
    for (const l of lineas) {
      const esEncabezado = ContextoCV.encabezadoDe(l) !== null;
      if (esEncabezado && anterior) seguidos++;
      anterior = esEncabezado;
    }
    if (seguidos >= 2) return false;

    const tamanos = Array.from(secciones.values()).map((v) => v.length);
    const vacias = tamanos.filter((n) => n === 0).length;
    // Dos o más encabezados sin contenido propio: están pegados.
    if (vacias >= 2) return false;

    // Una sola sección se quedó con más del 60% del documento: se tragó el
    // resto por estar al final del orden de dibujo.
    const total = lineas.length;
    const mayor = Math.max(...tamanos);
    if (total > 0 && mayor / total > 0.6) return false;

    return true;
  }

  /** true si el reparto por secciones es poco fiable (CV a varias columnas). */
  get layoutMezclado(): boolean {
    return !ContextoCV.layoutEsConfiable(this.lineas, this.secciones);
  }

  /**
   * Líneas donde buscar un campo. Con layout confiable, las de su sección;
   * con layout mezclado, todo el documento, porque la sección no significa nada.
   */
  fuente(nombre: string): string[] {
    if (this.layoutMezclado) return this.lineas;
    return this.secciones.get(nombre) ?? [];
  }

  seccion(nombre: string): string[] {
    return this.secciones.get(nombre) ?? [];
  }

  /** Las primeras líneas, donde casi siempre están nombre y contacto. */
  get cabecera(): string[] {
    return this.lineas.slice(0, 8);
  }
}

// ---------------------------------------------------------------------------
// Detectores
// ---------------------------------------------------------------------------

/**
 * Correo electrónico.
 *
 * Los cuantificadores van acotados a propósito. Con `[\w.+-]+` sin tope, una
 * corrida larga de caracteres válidos que no termine en `@` —una línea de
 * guiones separadora, un bloque en base64— hace que el motor retroceda desde
 * cada posición y el costo pasa a ser cuadrático: medido sobre el parser real,
 * 20.000 guiones tardaban 255 ms y 60.000 tardaban 2,4 s, bloqueando el único
 * hilo de Node para todos los usuarios. Los topes salen del propio formato:
 * 64 caracteres la parte local y 63 cada etiqueta del dominio (RFC 5321).
 */
const RE_EMAIL = /[\w.+-]{1,64}@[\w-]{1,63}\.[\w.-]{2,63}/;
const RE_LINKEDIN = /(?:linkedin\.com\/in\/|linkedin:\s*)([\w%-]+)/i;

// Un documento de identidad se parece mucho a un teléfono. Si la línea lo
// anuncia como cédula, NIT o pasaporte, no es un teléfono.
const RE_DOCUMENTO = /\b(c\.?c\.?|cedula|cédula|nit|t\.?i\.?|pasaporte|documento|identificacion|identificación)\b/i;

/**
 * Celular colombiano: 10 dígitos que empiezan por 3, con o sin indicativo +57
 * y con cualquier separación interna. Se exige el 3 inicial a propósito: es lo
 * que distingue un celular de una cédula de 10 dígitos.
 */
const RE_CELULAR_CO = /(?:\+?57[\s.-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/;
/** Fijo colombiano: indicativo de ciudad + 7 dígitos. */
const RE_FIJO_CO = /(?:\+?57[\s.-]?)?\(?\d{1,3}\)?[\s.-]?[2-8]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/;

/** Extrae un teléfono descartando las líneas que anuncian un documento. */
export function telefonoDe(lineas: string[]): { valor: string; evidencia: string } | null {
  const candidatas = lineas.filter((l) => !RE_DOCUMENTO.test(l));
  // Primero celulares: son los que un candidato quiere que lo contacten.
  for (const re of [RE_CELULAR_CO, RE_FIJO_CO]) {
    for (const linea of candidatas) {
      const m = linea.match(re);
      if (m) return { valor: m[0].trim(), evidencia: linea.slice(0, 80) };
    }
  }
  return null;
}

/**
 * Teléfono del candidato, no el de sus referencias.
 *
 * Una hoja de vida con referencias trae varios teléfonos, y tomar el primero
 * que aparezca es una lotería: si la sección de referencias quedó antes en el
 * texto, se guardaba el número del jefe anterior como si fuera el del
 * candidato. Pasó con una hoja de vida real.
 *
 * Se busca por prioridad y la confianza refleja de dónde salió:
 *
 * 1. La sección que el propio CV rotuló como CONTACTO. Si el documento lo
 *    dice, no hay que adivinar.
 * 2. La cabecera, donde casi siempre están los datos de contacto aunque no
 *    haya encabezado.
 * 3. El resto del documento, pero sin pasar de donde empiezan las referencias.
 *
 * El corte usa `encabezadoDe` y no una búsqueda de palabras sueltas: buscar
 * "jefe" o "referencia" en cualquier línea truncaría el CV de alguien cuyo
 * cargo sea "Jefe de Bodega".
 */
export function telefonoDeCandidato(
  ctx: ContextoCV
): { valor: string; evidencia: string; confianza: Confianza } | null {
  const inicioReferencias = ctx.lineas.findIndex(
    (l) => ContextoCV.encabezadoDe(l) === "referencias"
  );
  const antesDeReferencias =
    inicioReferencias >= 0 ? ctx.lineas.slice(0, inicioReferencias) : ctx.lineas;

  // Con layout mezclado el reparto por secciones no significa nada, así que la
  // sección CONTACTO no es evidencia de nada y se salta.
  const seccionContacto = ctx.layoutMezclado ? [] : ctx.seccion("contacto");

  const intentos: Array<{ lineas: string[]; confianza: Confianza }> = [
    { lineas: seccionContacto, confianza: "alta" },
    { lineas: ctx.cabecera, confianza: "alta" },
    { lineas: antesDeReferencias, confianza: "media" },
  ];

  for (const intento of intentos) {
    const hallado = telefonoDe(intento.lineas);
    if (hallado) return { ...hallado, confianza: intento.confianza };
  }
  return null;
}

export class DetectorContacto implements DetectorCampo {
  readonly campo = "contacto";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    const email = ctx.texto.match(RE_EMAIL)?.[0];
    if (email) {
      // Un email tiene forma inequívoca: si aparece, es un email.
      borrador.email = { valor: email.toLowerCase(), confianza: "alta", evidencia: email };
    }

    const tel = telefonoDeCandidato(ctx);
    if (tel) {
      // La confianza la decide de dónde salió el número: alta si el propio CV
      // lo puso bajo CONTACTO o en la cabecera, media si hubo que buscarlo en
      // el cuerpo del documento.
      borrador.telefono = {
        valor: tel.valor,
        confianza: tel.confianza,
        evidencia: tel.evidencia,
      };
    }

    const linkedin = ctx.texto.match(RE_LINKEDIN);
    if (linkedin) {
      borrador.linkedin = {
        valor: `linkedin.com/in/${linkedin[1]}`,
        confianza: "alta",
        evidencia: linkedin[0],
      };
    }
  }
}

/** Palabras que delatan que una línea pertenece a referencias, no al candidato. */
const RE_REFERENCIAS = /\b(referencia|referencias|references|jefe|contacto de)\b/i;

const esLineaNombre = (l: string) =>
  !ContextoCV.encabezadoDe(l) && !/[@\d]/.test(l) && l.length <= 60;

/**
 * Nombre partido en varias líneas de una sola palabra en mayúsculas
 * ("SAMUEL" / "MONTOYA" / "ESPINOSA"): así lo renderizan las plantillas que
 * ponen el nombre como título grande, y pdf.js lo devuelve línea por línea.
 */
export function nombrePorMayusculas(lineas: string[]): string | null {
  const esPalabraMayus = (l: string) =>
    /^[A-ZÁÉÍÓÚÑÜ]{2,}$/.test(l.trim()) && !ContextoCV.encabezadoDe(l);

  let mejor: string[] = [];
  let actual: string[] = [];
  for (const l of lineas) {
    if (esPalabraMayus(l)) {
      actual.push(l.trim());
      if (actual.length > mejor.length) mejor = [...actual];
    } else {
      actual = [];
    }
  }
  // Al menos dos palabras: una sola en mayúsculas suele ser un encabezado
  // que no está en nuestro catálogo ("PERFIL", "LOGROS").
  return mejor.length >= 2 ? mejor.join(" ") : null;
}

export class DetectorNombre implements DetectorCampo {
  readonly campo = "nombre";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    // 1) Nombre como título grande partido en líneas en mayúsculas.
    const mayusculas = nombrePorMayusculas(ctx.lineas);
    if (mayusculas) {
      borrador.nombre = {
        valor: mayusculas
          .split(" ")
          .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
          .join(" "),
        confianza: "media",
        evidencia: mayusculas,
      };
      return;
    }

    // 2) Primera línea corta de 2 a 4 palabras, descartando las que pertenecen
    // al bloque de referencias: en un CV con referencias, el primer nombre que
    // aparece puede ser el de la referencia y no el del candidato.
    const indiceReferencias = ctx.lineas.findIndex((l) => RE_REFERENCIAS.test(l));
    const candidata = ctx.cabecera.find((l, i) => {
      if (!esLineaNombre(l)) return false;
      // Si ya pasamos el encabezado de referencias, esta línea no es confiable.
      if (indiceReferencias >= 0 && i > indiceReferencias) return false;
      const palabras = l.split(/\s+/);
      return palabras.length >= 2 && palabras.length <= 4;
    });
    if (candidata) {
      // Baja: es la heurística más frágil de todas y conviene que el
      // candidato la revise siempre.
      borrador.nombre = { valor: candidata, confianza: "baja", evidencia: candidata };
    }
  }
}

export class DetectorTitular implements DetectorCampo {
  readonly campo = "titular";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    // Primero la sección de perfil, si el CV la trae y el layout es fiable:
    // con columnas mezcladas, la primera línea de "perfil" puede ser cualquier
    // cosa de otra columna (en el CV de prueba era un cargo con fechas).
    const perfil = ctx.layoutMezclado ? [] : ctx.seccion("perfil");
    if (perfil.length) {
      const linea = perfil[0];
      borrador.titular = {
        valor: linea.slice(0, 120),
        confianza: "media",
        evidencia: linea.slice(0, 120),
      };
      return;
    }

    // Si no, la línea de la cabecera que mencione un rol o una tecnología
    // reconocible y no sea el nombre ya detectado.
    //
    // Hay que mirar los roles y no solo las tecnologías: un titular típico es
    // "Desarrolladora Full Stack", que no contiene ninguna tecnología del
    // catálogo pero sí un rol. Antes se perdía, y con él la afinidad de rol,
    // que pesa el 20% del match score.
    const nombre = borrador.nombre?.valor;
    const linea = ctx.cabecera.find(
      (l) =>
        l !== nombre &&
        !/[@]/.test(l) &&
        // Una línea con fechas es una entrada de experiencia, no un titular.
        !RE_PERIODO.test(l) &&
        (detectarRoles(l).some((r) => !r.generico) || habilidadesMencionadas(l).length > 0)
    );
    if (linea) {
      borrador.titular = { valor: linea.slice(0, 120), confianza: "baja", evidencia: linea };
    }
  }
}

export class DetectorHabilidades implements DetectorCampo {
  readonly campo = "habilidades";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    const seccion = ctx.seccion("habilidades");
    const confiable = !ctx.layoutMezclado && seccion.length > 0;
    // Con layout mezclado la sección no significa nada: se busca en todo el
    // documento. Es menos preciso pero mucho mejor que devolver cero.
    const fuente = confiable ? seccion.join("\n") : ctx.texto;

    const tecnicas: HabilidadCatalogo[] = habilidadesMencionadas(fuente);
    // Las blandas y los idiomas son el único contenido de habilidades en los
    // perfiles no técnicos, que son la mayoría del mercado.
    const blandas = blandasMencionadas(fuente);
    const idiomas = idiomasMencionados(fuente);

    const nombres = Array.from(
      new Set([...tecnicas.map((h) => h.nombre), ...blandas, ...idiomas])
    ).sort();

    const partes: string[] = [];
    if (tecnicas.length) partes.push(`${tecnicas.length} técnica(s)`);
    if (blandas.length) partes.push(`${blandas.length} blanda(s)`);
    if (idiomas.length) partes.push(`${idiomas.length} idioma(s)`);

    borrador.habilidades = {
      valor: nombres,
      confianza: confiable ? "alta" : "media",
      evidencia: nombres.length
        ? `${partes.join(", ")} · ${confiable ? "sección de habilidades" : "todo el documento"}`
        : "No se reconocieron habilidades del catálogo",
    };
    borrador.habilidadesBlandas = new Set([...blandas, ...idiomas]);
  }
}

/** "2023 - 2026", "2023 – actual", "mar 2024 - dic 2025". Declarado arriba para que
 * el detector de titular pueda excluir lineas con fechas. */
const RE_PERIODO =
  /\b(\d{4})\s*[-–—a]{1,3}\s*(\d{4}|actual|presente|hoy|actualidad|present)\b/i;
const RE_ANIO_SUELTO = /\b(19|20)\d{2}\b/;

/**
 * Palabras que indican que una línea con fechas habla de un cargo y no de un
 * estudio. Sirven para separar experiencia de educación cuando el layout está
 * mezclado y no se puede confiar en la sección.
 */
const RE_CARGO = /\b(trabajad|emplead|asesor|analista|desarrollad|ingenier|tecnic|técnic|auxiliar|asistente|coordinad|jefe|gerente|director|supervisor|operari|vended|cajer|practicante|pasante|freelance|consultor|lider|líder|administrad|contad|secretari|mesero|domicili|almacen|almacén|tienda|servicio|atencion|atención|soporte|monitor)/i;

/** Palabras que indican que la línea habla de formación. */
const RE_EDUCATIVO = /\b(colegio|universidad|instituto|institucion|institución|escuela|sena|politecnic|politécnic|bachiller|bachillerato|grado|graduad|pregrado|posgrado|maestria|maestría|doctorad|especializacion|especialización|diplomad|carrera|licenciatura|tecnologo|tecnólogo|curso|certificad|certificacion|certificación|estudiante|egresad|titulo|título)/i;

export class DetectorExperiencia implements DetectorCampo {
  readonly campo = "experiencia";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    const mezclado = ctx.layoutMezclado;
    const lineas = ctx.fuente("experiencia");
    const encontradas: ExperienciaDetectada[] = [];

    for (const linea of lineas) {
      const periodo = linea.match(RE_PERIODO);
      if (!periodo) continue;

      // Con layout mezclado toda línea con fechas es candidata, así que hay
      // que distinguir cargo de estudio por el vocabulario. Sin este filtro,
      // "2023 Graduado de Bachillerato" entraría como experiencia laboral.
      if (mezclado) {
        if (!RE_CARGO.test(linea)) continue;
        if (RE_EDUCATIVO.test(linea) && !RE_CARGO.test(linea)) continue;
      }

      // Una entrada de experiencia suele ser "Cargo - Empresa (2023 - 2026)".
      // Se quita el periodo y se parte por el separador.
      const sinPeriodo = linea.replace(periodo[0], "").replace(/[()]/g, "").trim();
      const partes = sinPeriodo
        .split(/\s[-–—|·]\s|\sen\s|\sat\s/i)
        .map((p) => p.trim())
        .filter(Boolean);

      const cargo = partes[0];
      if (!cargo) continue;

      const fin = periodo[2].toLowerCase();
      const actual = !/^\d{4}$/.test(fin);
      encontradas.push({
        cargo: cargo.slice(0, 120),
        empresa: partes[1]?.slice(0, 120),
        periodo: periodo[0],
        anioInicio: Number.parseInt(periodo[1], 10),
        anioFin: actual ? undefined : Number.parseInt(fin, 10),
        actual,
      });
    }

    borrador.experiencias = {
      valor: encontradas,
      // Media incluso con sección: el formato de las entradas varía mucho de
      // un CV a otro y los cargos pueden quedar mal recortados.
      confianza: encontradas.length ? "media" : "baja",
      evidencia: encontradas.length
        ? `${encontradas.length} cargo(s) con fechas` +
          (mezclado ? " (buscado en todo el documento)" : " en la sección de experiencia")
        : "No se encontraron cargos con fechas",
    };
  }
}

export class DetectorEducacion implements DetectorCampo {
  readonly campo = "educacion";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    const mezclado = ctx.layoutMezclado;
    const lineas = ctx.fuente("educacion");
    const encontradas: EducacionDetectada[] = [];

    for (const linea of lineas) {
      // Con layout mezclado la sección se traga medio documento. Exigir
      // vocabulario educativo evita que entren frases del "sobre mí" como
      // estudios, que era justo lo que estaba pasando.
      if (mezclado && !RE_EDUCATIVO.test(linea)) continue;
      // Una línea que habla de un cargo ya la tomó el detector de experiencia.
      if (mezclado && RE_CARGO.test(linea) && !RE_EDUCATIVO.test(linea)) continue;

      const anio = linea.match(RE_PERIODO)?.[2] ?? linea.match(RE_ANIO_SUELTO)?.[0];
      const sinAnio = linea
        .replace(RE_PERIODO, "")
        .replace(RE_ANIO_SUELTO, "")
        .replace(/[()]/g, "")
        .trim();
      const partes = sinAnio
        .split(/\s[-–—|·]\s|\sen\s|,\s/i)
        .map((p) => p.trim())
        .filter(Boolean);
      if (!partes[0] || partes[0].length < 4) continue;

      encontradas.push({
        titulo: partes[0].slice(0, 160),
        institucion: partes[1]?.slice(0, 160),
        anio: anio && /^\d{4}$/.test(anio) ? Number.parseInt(anio, 10) : undefined,
      });
    }

    borrador.educacion = {
      valor: encontradas,
      confianza: encontradas.length ? "media" : "baja",
      evidencia: encontradas.length
        ? `${encontradas.length} entrada(s) de formación` +
          (mezclado ? " (buscado en todo el documento)" : " en la sección de educación")
        : "No se encontró formación académica",
    };
  }
}

// ---------------------------------------------------------------------------
// El parser: el composite que corre todos los detectores
// ---------------------------------------------------------------------------

/** Orden intencional: nombre antes de titular, porque el titular lo excluye. */
export const DETECTORES_POR_DEFECTO: DetectorCampo[] = [
  new DetectorContacto(),
  new DetectorNombre(),
  new DetectorTitular(),
  new DetectorHabilidades(),
  new DetectorExperiencia(),
  new DetectorEducacion(),
];

export class ParserCV {
  constructor(private readonly detectores: DetectorCampo[] = DETECTORES_POR_DEFECTO) {}

  parse(texto: string): PerfilExtraido {
    const ctx = new ContextoCV(texto);
    const borrador: PerfilExtraido = {
      habilidades: { valor: [], confianza: "baja", evidencia: "" },
      experiencias: { valor: [], confianza: "baja", evidencia: "" },
      educacion: { valor: [], confianza: "baja", evidencia: "" },
      layoutMezclado: ctx.layoutMezclado,
      textoOriginal: texto,
    };

    for (const detector of this.detectores) {
      // Un detector que falle no debe tumbar todo el parseo: el resto del
      // borrador sigue siendo útil para que el candidato lo complete.
      try {
        detector.detectar(ctx, borrador);
      } catch {
        // Silencioso a propósito: el campo simplemente queda sin detectar y
        // el candidato lo llena a mano en la pantalla de revisión (HU-23).
      }
    }

    return borrador;
  }
}

/** Cuántos campos se lograron detectar, para mostrar el resultado al candidato. */
export function resumenExtraccion(p: PerfilExtraido): {
  detectados: number;
  total: number;
  habilidades: number;
  experiencias: number;
  educacion: number;
} {
  const simples = [p.nombre, p.email, p.telefono, p.linkedin, p.titular];
  return {
    detectados:
      simples.filter(Boolean).length +
      (p.habilidades.valor.length ? 1 : 0) +
      (p.experiencias.valor.length ? 1 : 0) +
      (p.educacion.valor.length ? 1 : 0),
    total: 8,
    habilidades: p.habilidades.valor.length,
    experiencias: p.experiencias.valor.length,
    educacion: p.educacion.valor.length,
  };
}
