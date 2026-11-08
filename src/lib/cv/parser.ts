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
  experiencias: CampoDetectado<ExperienciaDetectada[]>;
  educacion: CampoDetectado<EducacionDetectada[]>;
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

const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
// Teléfonos colombianos y formatos internacionales sencillos.
const RE_TELEFONO = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}\b/;
const RE_LINKEDIN = /(?:linkedin\.com\/in\/|linkedin:\s*)([\w%-]+)/i;

export class DetectorContacto implements DetectorCampo {
  readonly campo = "contacto";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    const email = ctx.texto.match(RE_EMAIL)?.[0];
    if (email) {
      // Un email tiene forma inequívoca: si aparece, es un email.
      borrador.email = { valor: email.toLowerCase(), confianza: "alta", evidencia: email };
    }

    const tel = ctx.texto.match(RE_TELEFONO)?.[0]?.trim();
    if (tel) {
      // Media: un número de 10 dígitos también puede ser una cédula o un NIT.
      borrador.telefono = { valor: tel, confianza: "media", evidencia: tel };
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

export class DetectorNombre implements DetectorCampo {
  readonly campo = "nombre";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    // Heurística: el nombre suele ser la primera línea corta, de 2 a 4
    // palabras, sin dígitos ni arroba y sin ser un encabezado de sección.
    const candidata = ctx.cabecera.find((l) => {
      if (ContextoCV.encabezadoDe(l)) return false;
      if (/[@\d]/.test(l)) return false;
      const palabras = l.split(/\s+/);
      return palabras.length >= 2 && palabras.length <= 4 && l.length <= 60;
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
    // Primero la sección de perfil, si el CV la trae.
    const perfil = ctx.seccion("perfil");
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
    // La sección de habilidades es la fuente fiable; si no existe, se recorre
    // el CV completo, con menos confianza porque puede capturar tecnologías
    // mencionadas de paso ("trabajé con un equipo de React").
    const seccion = ctx.seccion("habilidades");
    const fuente = seccion.length ? seccion.join("\n") : ctx.texto;
    const encontradas: HabilidadCatalogo[] = habilidadesMencionadas(fuente);

    const nombres = Array.from(new Set(encontradas.map((h) => h.nombre))).sort();
    borrador.habilidades = {
      valor: nombres,
      confianza: seccion.length ? "alta" : "media",
      evidencia: seccion.length
        ? "Sección de habilidades del CV"
        : "Tecnologías mencionadas en todo el documento",
    };
  }
}

/** "2023 - 2026", "2023 – actual", "mar 2024 - dic 2025" */
const RE_PERIODO =
  /\b(\d{4})\s*[-–—a]{1,3}\s*(\d{4}|actual|presente|hoy|actualidad|present)\b/i;
const RE_ANIO_SUELTO = /\b(19|20)\d{2}\b/;

export class DetectorExperiencia implements DetectorCampo {
  readonly campo = "experiencia";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    const lineas = ctx.seccion("experiencia");
    const encontradas: ExperienciaDetectada[] = [];

    for (const linea of lineas) {
      const periodo = linea.match(RE_PERIODO);
      if (!periodo) continue;

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
      evidencia: lineas.length
        ? `${encontradas.length} entrada(s) con fechas en la sección de experiencia`
        : "No se encontró una sección de experiencia",
    };
  }
}

export class DetectorEducacion implements DetectorCampo {
  readonly campo = "educacion";

  detectar(ctx: ContextoCV, borrador: PerfilExtraido): void {
    const lineas = ctx.seccion("educacion");
    const encontradas: EducacionDetectada[] = [];

    for (const linea of lineas) {
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
      if (!partes[0]) continue;

      encontradas.push({
        titulo: partes[0].slice(0, 160),
        institucion: partes[1]?.slice(0, 160),
        anio: anio && /^\d{4}$/.test(anio) ? Number.parseInt(anio, 10) : undefined,
      });
    }

    borrador.educacion = {
      valor: encontradas,
      confianza: encontradas.length ? "media" : "baja",
      evidencia: lineas.length
        ? `${encontradas.length} entrada(s) en la sección de educación`
        : "No se encontró una sección de educación",
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
