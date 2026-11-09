// Motor del Match Score (HU-24): combina las seis dimensiones en un puntaje.
//
// Patrón COMPOSITE: `MotorScoring` tiene una colección de evaluadores y se
// comporta como si fuera uno solo — recibe un perfil y una vacante, devuelve un
// puntaje. Quien lo usa no sabe cuántas dimensiones hay ni cómo se calculan.
//
// Patrón FACADE: `matchScore` es la única función que el resto de la aplicación
// necesita. Detrás hay taxonomía, trayectoria, seis evaluadores y una tabla de
// pesos, y nada de eso se filtra hacia afuera.
import {
  EVALUADORES_POR_DEFECTO,
  type ClaveDimension,
  type EvaluadorDimension,
  type ResultadoDimension,
} from "./evaluadores";
import {
  PESOS_DEFAULT,
  construirContexto,
  type Desglose,
  type EvaluacionRequisito,
  type PerfilScoring,
  type ResultadoScoring,
  type VacanteScoring,
} from "./nucleo";

/**
 * Pesos de las dimensiones.
 *
 * Se declara como `Record` y no como `typeof PESOS_DEFAULT`: ese tipo fija los
 * valores literales (`skills` solo puede ser 0.4) y haría imposible que el
 * administrador los cambie, que es justo lo que pide HU-27.
 */
export type Pesos = Record<ClaveDimension, number>;

export class MotorScoring {
  constructor(
    private readonly evaluadores: EvaluadorDimension[] = EVALUADORES_POR_DEFECTO,
    private readonly pesos: Pesos = PESOS_DEFAULT
  ) {}

  /**
   * Corre cada evaluador y combina los valores con sus pesos.
   *
   * El evaluador devuelve un valor de 0 a 1 y el motor lo pondera: así una
   * dimensión nunca necesita saber cuánto vale respecto a las demás, y cambiar
   * los pesos (HU-27) no obliga a tocar ningún evaluador.
   */
  calcular(
    perfil: PerfilScoring,
    vacante: VacanteScoring,
    ahora = new Date()
  ): ResultadoScoring {
    const ctx = construirContexto(perfil, ahora);

    const resultados = new Map<string, ResultadoDimension>();
    for (const ev of this.evaluadores) {
      resultados.set(ev.clave, ev.evaluar(perfil, vacante, ctx));
    }

    const valorDe = (clave: keyof Desglose) => resultados.get(clave)?.valor ?? 0;

    const desglose: Desglose = {
      skills: valorDe("skills"),
      rol: valorDe("rol"),
      experiencia: valorDe("experiencia"),
      salario: valorDe("salario"),
      modalidad: valorDe("modalidad"),
      ubicacion: valorDe("ubicacion"),
    };

    let total = 0;
    for (const ev of this.evaluadores) {
      total += (resultados.get(ev.clave)?.valor ?? 0) * this.pesos[ev.clave];
    }

    const requisitos: EvaluacionRequisito[] = resultados.get("skills")?.requisitos ?? [];

    return {
      // score 0-100, redondeado para estabilidad.
      score: Math.round(total * 100),
      desglose,
      requisitos,
      motivoRol: resultados.get("rol")?.motivo ?? "",
      motivoExperiencia: resultados.get("experiencia")?.motivo ?? "",
    };
  }

  /** Etiquetas y pesos vigentes, para la interfaz y el panel de administración. */
  dimensiones(): { clave: string; etiqueta: string; peso: number }[] {
    return this.evaluadores.map((ev) => ({
      clave: ev.clave,
      etiqueta: ev.etiqueta,
      peso: this.pesos[ev.clave],
    }));
  }
}

/** Fachada estable: el resto de la aplicación solo llama a esto. */
export function matchScore(
  perfil: PerfilScoring,
  vacante: VacanteScoring,
  pesos: Pesos = PESOS_DEFAULT,
  ahora = new Date()
): ResultadoScoring {
  return new MotorScoring(EVALUADORES_POR_DEFECTO, pesos).calcular(perfil, vacante, ahora);
}
