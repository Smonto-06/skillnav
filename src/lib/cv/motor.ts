// HU-22 · Contrato común de los motores de análisis de hoja de vida.
//
// Patrón STRATEGY (el segundo del módulo, después del de extracción de texto):
// hay dos formas de convertir el texto de un CV en datos estructurados —por
// reglas y con un modelo de lenguaje— y quien las usa no necesita saber cuál
// está activa.
//
// Por qué existen las dos y no solo la mejor: el motor con LLM entiende el
// documento completo y resuelve los CV a varias columnas, que es donde las
// reglas fallan. Pero depende de la red y de una clave; si falla en medio de
// una sustentación, el sistema se queda sin función. El motor por reglas no
// depende de nada externo y es determinista, así que sirve de respaldo.
import type { PerfilExtraido } from "./parser";

export type NombreMotor = "reglas" | "llm";

export interface MotorAnalisisCV {
  readonly nombre: NombreMotor;
  /** true si el motor tiene lo que necesita para funcionar (claves, red). */
  disponible(): boolean;
  analizar(texto: string): Promise<PerfilExtraido>;
}

export interface ResultadoAnalisis {
  perfil: PerfilExtraido;
  /** Motor que produjo el resultado, para mostrárselo al candidato. */
  motor: NombreMotor;
  /**
   * Si el motor preferido falló y se usó el respaldo, acá queda el motivo.
   * Se le muestra al candidato: es más honesto que fingir que no pasó nada.
   */
  motivoRespaldo?: string;
}
