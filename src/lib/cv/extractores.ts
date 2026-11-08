// HU-21 · Extracción del texto crudo de una hoja de vida.
//
// Patrón STRATEGY: cada formato de archivo (PDF, DOCX, texto plano) sabe
// extraer su propio contenido, pero todos cumplen la misma interfaz
// `ExtractorTexto`. Quien llama no necesita saber de qué formato se trata.
//
// Patrón FACTORY METHOD: `ExtractorFactory` decide qué estrategia construir a
// partir del tipo MIME y del nombre del archivo. Sin la fábrica, la decisión
// quedaría repartida en condicionales por toda la aplicación cada vez que
// aparezca un formato nuevo.

/** Límite de tamaño aceptado (5 MB). Una hoja de vida razonable no pesa más. */
export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

export class ErrorExtraccion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorExtraccion";
  }
}

export interface ArchivoCV {
  nombre: string;
  tipo: string;
  contenido: Uint8Array;
}

/** Contrato común de todas las estrategias de extracción. */
export interface ExtractorTexto {
  /** Nombre del formato, para mensajes y trazabilidad. */
  readonly formato: string;
  /** Devuelve el texto plano del archivo. */
  extraer(archivo: ArchivoCV): Promise<string>;
}

// Normaliza el texto que devuelve cualquier extractor: unifica saltos de
// línea, colapsa espacios repetidos y descarta líneas vacías sobrantes. Así
// las estrategias no tienen que repetir esta limpieza cada una.
export function normalizarTexto(bruto: string): string {
  return bruto
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n")
    .trim();
}

/** Estrategia para archivos .txt (también sirve de respaldo y de caso de prueba). */
export class ExtractorTextoPlano implements ExtractorTexto {
  readonly formato = "TXT";

  async extraer(archivo: ArchivoCV): Promise<string> {
    return normalizarTexto(new TextDecoder("utf-8").decode(archivo.contenido));
  }
}

/** Estrategia para .docx usando mammoth. */
export class ExtractorDocx implements ExtractorTexto {
  readonly formato = "DOCX";

  async extraer(archivo: ArchivoCV): Promise<string> {
    const mammoth = await import("mammoth");
    try {
      const { value } = await mammoth.extractRawText({
        buffer: Buffer.from(archivo.contenido),
      });
      return normalizarTexto(value);
    } catch {
      throw new ErrorExtraccion(
        "No se pudo leer el DOCX. Verifica que el archivo no esté dañado ni protegido con contraseña."
      );
    }
  }
}

/** Estrategia para .pdf usando unpdf (pdf.js empaquetado para servidor). */
export class ExtractorPdf implements ExtractorTexto {
  readonly formato = "PDF";

  async extraer(archivo: ArchivoCV): Promise<string> {
    const { extractText, getDocumentProxy } = await import("unpdf");
    try {
      const pdf = await getDocumentProxy(archivo.contenido);
      const { text } = await extractText(pdf, { mergePages: true });
      return normalizarTexto(Array.isArray(text) ? text.join("\n") : text);
    } catch {
      throw new ErrorExtraccion(
        "No se pudo leer el PDF. Si es un PDF escaneado (una imagen), el texto no se puede extraer automáticamente."
      );
    }
  }
}

/**
 * Fábrica de estrategias (FACTORY METHOD).
 *
 * Decide por tipo MIME y, como respaldo, por la extensión del nombre: algunos
 * navegadores envían DOCX con MIME genérico `application/octet-stream`, así
 * que confiar solo en el MIME dejaría archivos válidos afuera.
 */
export class ExtractorFactory {
  private static readonly POR_MIME: Record<string, () => ExtractorTexto> = {
    "application/pdf": () => new ExtractorPdf(),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": () =>
      new ExtractorDocx(),
    "text/plain": () => new ExtractorTextoPlano(),
  };

  private static readonly POR_EXTENSION: Record<string, () => ExtractorTexto> = {
    pdf: () => new ExtractorPdf(),
    docx: () => new ExtractorDocx(),
    txt: () => new ExtractorTextoPlano(),
  };

  static extensionDe(nombre: string): string {
    const partes = nombre.toLowerCase().split(".");
    return partes.length > 1 ? partes[partes.length - 1] : "";
  }

  /** Devuelve la estrategia adecuada o lanza si el formato no está soportado. */
  static crear(archivo: Pick<ArchivoCV, "nombre" | "tipo">): ExtractorTexto {
    const porMime = ExtractorFactory.POR_MIME[archivo.tipo.toLowerCase()];
    if (porMime) return porMime();

    const porExtension =
      ExtractorFactory.POR_EXTENSION[ExtractorFactory.extensionDe(archivo.nombre)];
    if (porExtension) return porExtension();

    throw new ErrorExtraccion(
      "Formato no soportado. Sube tu hoja de vida en PDF, DOCX o TXT."
    );
  }

  static formatosSoportados(): string[] {
    return Object.keys(ExtractorFactory.POR_EXTENSION).map((e) => `.${e}`);
  }
}

/**
 * Punto de entrada de la extracción: valida el archivo y delega en la
 * estrategia que corresponda. Es la única función que el resto de la
 * aplicación necesita conocer.
 */
export async function extraerTextoCV(archivo: ArchivoCV): Promise<string> {
  if (archivo.contenido.byteLength === 0) {
    throw new ErrorExtraccion("El archivo está vacío.");
  }
  if (archivo.contenido.byteLength > TAMANO_MAXIMO_BYTES) {
    throw new ErrorExtraccion(
      `El archivo supera el límite de ${TAMANO_MAXIMO_BYTES / (1024 * 1024)} MB.`
    );
  }

  const extractor = ExtractorFactory.crear(archivo);
  const texto = await extractor.extraer(archivo);

  // Un archivo válido pero sin texto suele ser un PDF escaneado: avisamos en
  // lugar de devolver un perfil vacío sin explicación.
  if (texto.length < 30) {
    throw new ErrorExtraccion(
      "No se encontró texto legible en el archivo. Si es un documento escaneado, súbelo en PDF con texto o en DOCX."
    );
  }

  return texto;
}
