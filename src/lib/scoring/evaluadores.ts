// Evaluadores de las seis dimensiones del Match Score (HU-24).
//
// Antes esto era un bloque de código dentro de `matchScore`: seis cálculos
// distintos entrelazados en una sola función. Cada dimensión es ahora una clase
// con el mismo contrato, y eso cambia tres cosas concretas:
//
// - Se puede probar una dimensión sin calcular las otras cinco.
// - Agregar una dimensión (idiomas, disponibilidad) es agregar una clase, sin
//   tocar las existentes ni la función que las combina.
// - HU-27 pide que el administrador configure los pesos; con los evaluadores
//   separados, el peso es un dato del evaluador y no una constante enterrada.
//
// Patrones que aparecen acá, y por qué no son decorativos:
//
// STRATEGY  — `EvaluadorDimension` es el contrato común. `MotorScoring` combina
//             evaluadores sin saber cómo calcula ninguno.
// COMPOSITE — `MotorScoring` trata una colección de evaluadores como si fuera
//             uno solo: recibe el mismo perfil y vacante y devuelve un único
//             puntaje.
import {
  Area,
  areasDeCargo,
  clave,
} from "../taxonomia";
import {
  COMPAT_MODALIDAD,
  type ContextoPerfil,
  type Desglose,
  type EvaluacionRequisito,
  type PerfilScoring,
  type VacanteScoring,
  evaluarExperiencia,
  evaluarRequisito,
  evaluarRol,
} from "./nucleo";

/** Lo que una dimensión devuelve: un valor de 0 a 1 y su explicación. */
export interface ResultadoDimension {
  /** Normalizado de 0 a 1. Lo pondera el motor, no el evaluador. */
  valor: number;
  /** Frase para mostrarle al candidato. Vacía si la dimensión no la necesita. */
  motivo: string;
  /** Detalle por requisito, solo lo produce la dimensión de habilidades. */
  requisitos?: EvaluacionRequisito[];
}

/** Las claves del desglose: cada evaluador aporta exactamente una. */
export type ClaveDimension = keyof Desglose;

/**
 * Contrato común de las dimensiones (STRATEGY).
 *
 * El motor solo necesita saber qué clave llena cada evaluador y cómo pedirle su
 * valor. Nunca necesita saber si por dentro compara textos, fechas o números.
 */
export interface EvaluadorDimension {
  readonly clave: ClaveDimension;
  /** Nombre legible, para la interfaz y el panel del administrador. */
  readonly etiqueta: string;
  evaluar(
    perfil: PerfilScoring,
    vacante: VacanteScoring,
    ctx: ContextoPerfil
  ): ResultadoDimension;
}

// ---------------------------------------------------------------------------

/** Qué tanto cubre el perfil los requisitos declarados por la vacante. */
export class EvaluadorHabilidades implements EvaluadorDimension {
  readonly clave = "skills" as const;
  readonly etiqueta = "Habilidades";

  evaluar(
    _perfil: PerfilScoring,
    vacante: VacanteScoring,
    ctx: ContextoPerfil
  ): ResultadoDimension {
    const requisitos = vacante.requisitos
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => evaluarRequisito(r, ctx.habilidades, ctx.cobertura, ctx.menciones));

    // Una vacante que no declara requisitos está abierta a cualquier perfil:
    // no tener con qué comparar no es culpa del candidato.
    const valor =
      requisitos.length === 0
        ? 1
        : requisitos.reduce((s, r) => s + r.credito, 0) / requisitos.length;

    return { valor, motivo: "", requisitos };
  }
}

/** Afinidad entre el área del cargo ofrecido y la trayectoria del candidato. */
export class EvaluadorRol implements EvaluadorDimension {
  readonly clave = "rol" as const;
  readonly etiqueta = "Afinidad de rol";

  evaluar(
    _perfil: PerfilScoring,
    vacante: VacanteScoring,
    ctx: ContextoPerfil
  ): ResultadoDimension {
    const r = evaluarRol(this.areasDe(vacante), ctx.cobertura);
    return { valor: r.valor, motivo: r.motivo };
  }

  areasDe(vacante: VacanteScoring): Area[] {
    return areasDeCargo(vacante.titulo);
  }
}

/** Años de experiencia relevante frente a los que pide la vacante. */
export class EvaluadorExperiencia implements EvaluadorDimension {
  readonly clave = "experiencia" as const;
  readonly etiqueta = "Experiencia";

  evaluar(
    perfil: PerfilScoring,
    vacante: VacanteScoring,
    ctx: ContextoPerfil
  ): ResultadoDimension {
    const r = evaluarExperiencia(perfil, vacante, areasDeCargo(vacante.titulo), ctx.ahora);
    return { valor: r.valor, motivo: r.motivo };
  }
}

/** Compatibilidad entre el salario ofrecido y el rango esperado. */
export class EvaluadorSalario implements EvaluadorDimension {
  readonly clave = "salario" as const;
  readonly etiqueta = "Salario";

  evaluar(perfil: PerfilScoring, vacante: VacanteScoring): ResultadoDimension {
    // Sin dato no se puede afirmar nada: neutro en lugar de penalizar.
    // El cero cuenta como "no publicado", no como una oferta de cero pesos:
    // tratarlo como oferta real le daba el máximo de la dimensión a una
    // vacante que no paga nada.
    if (vacante.salario == null || vacante.salario <= 0) {
      return { valor: 0.5, motivo: "La vacante no publica el salario." };
    }

    const min = perfil.salarioMin ?? 0;
    const max = perfil.salarioMax ?? Number.MAX_SAFE_INTEGER;

    if (vacante.salario >= min && vacante.salario <= max) {
      return { valor: 1, motivo: "El salario está dentro de tu rango esperado." };
    }
    if (vacante.salario > max) {
      // Paga más de lo pedido: está fuera del rango, pero en la dirección
      // favorable, así que se penaliza poco.
      return { valor: 0.8, motivo: "La vacante paga más de lo que esperabas." };
    }
    return {
      valor: Math.max(0, vacante.salario / Math.max(min, 1)),
      motivo: "La vacante paga menos de tu expectativa mínima.",
    };
  }
}

/** Compatibilidad de modalidad, usando la tabla asimétrica de COMPAT_MODALIDAD. */
export class EvaluadorModalidad implements EvaluadorDimension {
  readonly clave = "modalidad" as const;
  readonly etiqueta = "Modalidad";

  evaluar(perfil: PerfilScoring, vacante: VacanteScoring): ResultadoDimension {
    if (!perfil.modalidad || !vacante.modalidad) {
      return { valor: 1, motivo: "Sin restricción de modalidad." };
    }
    // Híbrido cubre presencial y remoto; presencial y remoto no se cubren
    // entre sí. La tabla lo detalla.
    const valor = COMPAT_MODALIDAD[perfil.modalidad][vacante.modalidad];
    return {
      valor,
      motivo:
        valor === 1
          ? "La modalidad coincide con tu preferencia."
          : valor > 0
            ? "La modalidad es compatible en parte con tu preferencia."
            : "La modalidad no coincide con tu preferencia.",
    };
  }
}

/** Coincidencia de ciudad, salvo que el trabajo sea remoto. */
export class EvaluadorUbicacion implements EvaluadorDimension {
  readonly clave = "ubicacion" as const;
  readonly etiqueta = "Ubicación";

  evaluar(perfil: PerfilScoring, vacante: VacanteScoring): ResultadoDimension {
    // Si cualquiera de los dos lados es remoto, la ciudad deja de importar.
    const irrelevante =
      !perfil.ciudad || perfil.modalidad === "REMOTO" || vacante.modalidad === "REMOTO";
    if (irrelevante) return { valor: 1, motivo: "La ciudad no restringe esta vacante." };

    // La ciudad de la vacante es opcional. Sin ese dato no se puede afirmar
    // que esté en otra ciudad: antes se comparaba contra "" y el candidato
    // perdía la dimensión entera con un motivo que no era cierto.
    if (!vacante.ciudad?.trim()) {
      return { valor: 0.5, motivo: "La vacante no indica la ciudad." };
    }

    const coincide = clave(perfil.ciudad!) === clave(vacante.ciudad);
    return {
      valor: coincide ? 1 : 0,
      motivo: coincide ? "La vacante está en tu ciudad." : "La vacante está en otra ciudad.",
    };
  }
}

/** Orden en que se muestran las dimensiones al candidato. */
export const EVALUADORES_POR_DEFECTO: EvaluadorDimension[] = [
  new EvaluadorHabilidades(),
  new EvaluadorRol(),
  new EvaluadorExperiencia(),
  new EvaluadorSalario(),
  new EvaluadorModalidad(),
  new EvaluadorUbicacion(),
];
