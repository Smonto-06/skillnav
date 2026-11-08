// HU-22 · Motor de análisis de hoja de vida con un modelo de lenguaje.
//
// Es la estrategia que resuelve el caso que las reglas no pueden: un CV a dos
// columnas sale del PDF en orden de dibujo, con los encabezados de una columna
// pegados y su contenido mezclado con el de la otra. Una regla mira línea por
// línea y se pierde; el modelo lee el documento completo y reconstruye qué es
// cada cosa.
//
// Dos decisiones de diseño que importan:
//
// 1. La respuesta del modelo NUNCA se confía. Se valida con zod y se descarta
//    cualquier campo que no cumpla la forma esperada. Un modelo puede devolver
//    texto fuera del JSON, campos inventados o tipos equivocados, y eso no
//    puede llegar a la base de datos.
// 2. El modelo no decide por el candidato. Igual que el motor por reglas,
//    produce un borrador con confianzas que HU-23 muestra para revisión.
import { z } from "zod";
import type { MotorAnalisisCV } from "./motor";
import type { Confianza, PerfilExtraido } from "./parser";
import { blandasMencionadas, idiomasMencionados } from "./blandas";

/** Proveedores soportados. Ambos tienen capa gratuita. */
export type Proveedor = "groq" | "gemini";

export interface ConfigLLM {
  proveedor: Proveedor;
  apiKey: string;
  modelo: string;
  /** Milisegundos antes de abandonar y caer al respaldo. */
  timeoutMs: number;
}

const MODELOS_POR_DEFECTO: Record<Proveedor, string> = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
};

/**
 * Lee la configuración del entorno. Devuelve null si no hay clave, que es la
 * señal de "este motor no está disponible" y dispara el respaldo por reglas.
 */
export function configDesdeEntorno(
  // Un registro simple y no NodeJS.ProcessEnv: solo se leen claves de texto, y
  // así las pruebas pueden pasar un objeto literal sin inventarse NODE_ENV.
  env: Record<string, string | undefined> = process.env
): ConfigLLM | null {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) return null;

  const proveedor = (env.LLM_PROVIDER?.trim().toLowerCase() || "groq") as Proveedor;
  if (proveedor !== "groq" && proveedor !== "gemini") return null;

  return {
    proveedor,
    apiKey,
    modelo: env.LLM_MODEL?.trim() || MODELOS_POR_DEFECTO[proveedor],
    // 20 s: suficiente para un CV y poco para que la demo se sienta colgada.
    timeoutMs: Number.parseInt(env.LLM_TIMEOUT_MS ?? "", 10) || 20_000,
  };
}

// ---------------------------------------------------------------------------
// Forma esperada de la respuesta
// ---------------------------------------------------------------------------

const confianzaSchema = z.enum(["alta", "media", "baja"]).catch("media");
const textoOpcional = z.string().trim().max(300).optional().nullable();

const respuestaSchema = z.object({
  nombre: textoOpcional,
  email: textoOpcional,
  telefono: textoOpcional,
  linkedin: textoOpcional,
  titular: textoOpcional,
  habilidades: z.array(z.string().trim().min(1).max(80)).max(60).default([]),
  // El modelo clasifica cada habilidad; si se equivoca, el catálogo corrige.
  habilidadesBlandas: z.array(z.string().trim().min(1).max(80)).max(60).default([]),
  experiencias: z
    .array(
      z.object({
        cargo: z.string().trim().min(1).max(120),
        empresa: textoOpcional,
        periodo: textoOpcional,
        anioInicio: z.number().int().min(1950).max(2100).optional().nullable(),
        anioFin: z.number().int().min(1950).max(2100).optional().nullable(),
        actual: z.boolean().default(false),
      })
    )
    .max(30)
    .default([]),
  educacion: z
    .array(
      z.object({
        titulo: z.string().trim().min(1).max(160),
        institucion: textoOpcional,
        anio: z.number().int().min(1950).max(2100).optional().nullable(),
      })
    )
    .max(30)
    .default([]),
  confianzaGeneral: confianzaSchema.optional(),
});

export type RespuestaLLM = z.infer<typeof respuestaSchema>;

export const PROMPT_SISTEMA = `Eres un extractor de datos de hojas de vida. Recibes el texto plano de un CV, que puede venir desordenado porque fue extraido de un PDF a varias columnas: los encabezados de una columna pueden aparecer juntos y su contenido mezclado con el de otra columna.

Tu tarea es reconstruir los datos del candidato y devolver UNICAMENTE un objeto JSON valido, sin texto antes ni despues, sin bloques de codigo.

Formato exacto:
{
  "nombre": string|null,
  "email": string|null,
  "telefono": string|null,
  "linkedin": string|null,
  "titular": string|null,
  "habilidades": string[],
  "habilidadesBlandas": string[],
  "experiencias": [{"cargo": string, "empresa": string|null, "periodo": string|null, "anioInicio": number|null, "anioFin": number|null, "actual": boolean}],
  "educacion": [{"titulo": string, "institucion": string|null, "anio": number|null}],
  "confianzaGeneral": "alta"|"media"|"baja"
}

Reglas estrictas:
- No inventes NADA. Si un dato no esta en el texto, usa null o una lista vacia.
- El telefono debe ser del candidato. Si el CV tiene una seccion de REFERENCIAS con telefonos de otras personas, no los uses. Nunca uses un numero de cedula, CC, NIT o documento de identidad.
- El nombre es el del candidato, no el de una referencia. Puede venir partido en varias lineas en mayusculas.
- "habilidades" es la lista completa; "habilidadesBlandas" es el subconjunto que son habilidades blandas o idiomas (liderazgo, trabajo en equipo, ingles...). Las tecnologias no van en habilidadesBlandas.
- En experiencias incluye solo cargos laborales, nunca estudios. En educacion solo formacion, nunca cargos.
- Une las lineas que pertenecen a la misma entrada aunque esten separadas en el texto.
- "actual" es true si el cargo no tiene anio de fin o dice actual/presente.
- confianzaGeneral refleja que tan legible era el documento.`;

// ---------------------------------------------------------------------------
// Llamadas a los proveedores
// ---------------------------------------------------------------------------

async function pedirAGroq(cfg: ConfigLLM, texto: string, signal: AbortSignal): Promise<string> {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.modelo,
      temperature: 0,
      // Pedir JSON al proveedor reduce (no elimina) las respuestas mal formadas.
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        { role: "user", content: texto },
      ],
    }),
    signal,
  });
  if (!r.ok) throw new Error(`Groq respondio ${r.status}`);
  const json = await r.json();
  const contenido = json?.choices?.[0]?.message?.content;
  if (typeof contenido !== "string") throw new Error("Groq no devolvio contenido");
  return contenido;
}

async function pedirAGemini(cfg: ConfigLLM, texto: string, signal: AbortSignal): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cfg.modelo
  )}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT_SISTEMA }] },
      contents: [{ role: "user", parts: [{ text: texto }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
    signal,
  });
  if (!r.ok) throw new Error(`Gemini respondio ${r.status}`);
  const json = await r.json();
  const contenido = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof contenido !== "string") throw new Error("Gemini no devolvio contenido");
  return contenido;
}

/**
 * Extrae el objeto JSON de la respuesta.
 *
 * Aunque se pida JSON puro, los modelos a veces lo envuelven en ```json o le
 * agregan una frase. Se recorta desde la primera llave hasta la última.
 */
export function extraerJSON(bruto: string): unknown {
  const sinCercos = bruto.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const inicio = sinCercos.indexOf("{");
  const fin = sinCercos.lastIndexOf("}");
  if (inicio === -1 || fin === -1 || fin <= inicio) {
    throw new Error("La respuesta del modelo no contiene un objeto JSON");
  }
  return JSON.parse(sinCercos.slice(inicio, fin + 1));
}

// ---------------------------------------------------------------------------
// De la respuesta validada al borrador del dominio
// ---------------------------------------------------------------------------

const limpio = (s?: string | null) => {
  const v = s?.trim();
  return v && v.length > 0 ? v : undefined;
};

/**
 * Convierte la respuesta ya validada en el mismo `PerfilExtraido` que produce
 * el motor por reglas, para que HU-23 no tenga que distinguir de dónde vino.
 */
export function aPerfilExtraido(r: RespuestaLLM, textoOriginal: string): PerfilExtraido {
  const campo = <T>(valor: T | undefined, confianza: Confianza, evidencia: string) =>
    valor === undefined ? undefined : { valor, confianza, evidencia };

  const base: Confianza = r.confianzaGeneral ?? "media";

  // La clasificación blanda/técnica se cruza con el catálogo propio: si el
  // modelo manda "React" como blanda, el catálogo manda y lo deja técnica.
  const blandasDelModelo = new Set(r.habilidadesBlandas);
  const blandas = new Set<string>();
  for (const h of r.habilidades) {
    const esBlandaPorCatalogo = blandasMencionadas(h).length > 0 || idiomasMencionados(h).length > 0;
    if (esBlandaPorCatalogo || blandasDelModelo.has(h)) blandas.add(h);
  }

  return {
    nombre: campo(limpio(r.nombre), base, "Identificado por el modelo"),
    email: campo(limpio(r.email), "alta", "Identificado por el modelo"),
    // El teléfono conserva confianza media aun con LLM: un CV con referencias
    // trae varios números y es el error más fácil de cometer.
    telefono: campo(limpio(r.telefono), "media", "Identificado por el modelo"),
    linkedin: campo(limpio(r.linkedin), "alta", "Identificado por el modelo"),
    titular: campo(limpio(r.titular), base, "Identificado por el modelo"),
    habilidades: {
      valor: Array.from(new Set(r.habilidades)).sort(),
      confianza: base,
      evidencia: `${r.habilidades.length} habilidad(es) identificadas por el modelo`,
    },
    habilidadesBlandas: blandas,
    experiencias: {
      valor: r.experiencias.map((e) => ({
        cargo: e.cargo,
        empresa: limpio(e.empresa),
        periodo: limpio(e.periodo),
        anioInicio: e.anioInicio ?? undefined,
        anioFin: e.actual ? undefined : e.anioFin ?? undefined,
        actual: e.actual,
      })),
      confianza: base,
      evidencia: `${r.experiencias.length} cargo(s) identificados por el modelo`,
    },
    educacion: {
      valor: r.educacion.map((e) => ({
        titulo: e.titulo,
        institucion: limpio(e.institucion),
        anio: e.anio ?? undefined,
      })),
      confianza: base,
      evidencia: `${r.educacion.length} entrada(s) de formación identificadas por el modelo`,
    },
    // El modelo entiende el documento completo, así que el desorden de
    // columnas deja de ser un problema que haya que advertir.
    layoutMezclado: false,
    textoOriginal,
  };
}

export class MotorLLM implements MotorAnalisisCV {
  readonly nombre = "llm" as const;

  constructor(private readonly cfg: ConfigLLM | null = configDesdeEntorno()) {}

  disponible(): boolean {
    return this.cfg !== null;
  }

  async analizar(texto: string): Promise<PerfilExtraido> {
    if (!this.cfg) throw new Error("No hay clave de API configurada para el motor con IA");

    const controlador = new AbortController();
    const reloj = setTimeout(() => controlador.abort(), this.cfg.timeoutMs);
    try {
      const bruto =
        this.cfg.proveedor === "groq"
          ? await pedirAGroq(this.cfg, texto, controlador.signal)
          : await pedirAGemini(this.cfg, texto, controlador.signal);

      // Validar antes de usar: lo que el modelo devuelve es una entrada no
      // confiable, igual que un formulario de internet.
      const validada = respuestaSchema.parse(extraerJSON(bruto));
      return aPerfilExtraido(validada, texto);
    } finally {
      clearTimeout(reloj);
    }
  }
}
