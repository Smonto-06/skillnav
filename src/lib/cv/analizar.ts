// HU-22 · Punto de entrada del análisis de hoja de vida.
//
// Elige el motor y garantiza que siempre haya resultado. Es lo que permite que
// el motor con IA sea una mejora y no un riesgo: si no hay clave, si la API
// responde con error, si se demora más de lo aceptable o si devuelve un JSON
// que no cumple la forma esperada, se usa el motor por reglas y el candidato
// igual recibe su borrador.
//
// El respaldo no se oculta: `motivoRespaldo` viaja en el resultado y HU-23 se
// lo dice al candidato. Si el sistema promete análisis con IA, el candidato
// tiene derecho a saber cuándo no fue la IA la que leyó su CV.
import type { MotorAnalisisCV, NombreMotor, ResultadoAnalisis } from "./motor";
import { MotorLLM } from "./llm";
import { ParserCV } from "./parser";
import type { PerfilExtraido } from "./parser";

/** Adaptador del parser por reglas al contrato de motor. */
export class MotorReglas implements MotorAnalisisCV {
  readonly nombre = "reglas" as const;

  constructor(private readonly parser = new ParserCV()) {}

  // Siempre disponible: no depende de red ni de claves. Esa es su razón de ser.
  disponible(): boolean {
    return true;
  }

  async analizar(texto: string): Promise<PerfilExtraido> {
    return this.parser.parse(texto);
  }
}

function motivoLegible(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") return "el modelo tardó demasiado en responder";
    if (e.name === "ZodError") return "el modelo devolvió datos con un formato inesperado";
    return e.message;
  }
  return "error desconocido";
}

/**
 * Analiza el texto del CV con el mejor motor disponible.
 *
 * @param preferido motor a intentar primero; por defecto el de IA si hay clave
 * @param respaldo motor que se usa si el preferido no está o falla
 */
export async function analizarCV(
  texto: string,
  preferido: MotorAnalisisCV = new MotorLLM(),
  respaldo: MotorAnalisisCV = new MotorReglas()
): Promise<ResultadoAnalisis> {
  if (preferido.disponible()) {
    try {
      return { perfil: await preferido.analizar(texto), motor: preferido.nombre };
    } catch (e) {
      // Un fallo del motor preferido no puede dejar al candidato sin nada.
      return {
        perfil: await respaldo.analizar(texto),
        motor: respaldo.nombre,
        motivoRespaldo: motivoLegible(e),
      };
    }
  }

  return {
    perfil: await respaldo.analizar(texto),
    motor: respaldo.nombre,
    motivoRespaldo: "no hay una clave de API configurada",
  };
}

/** Etiqueta para mostrarle al candidato qué leyó su hoja de vida. */
export function etiquetaMotor(motor: NombreMotor): string {
  return motor === "llm"
    ? "Análisis con inteligencia artificial"
    : "Análisis por reglas (sin IA)";
}
