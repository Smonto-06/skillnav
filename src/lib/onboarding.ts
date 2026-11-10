// HU-03 · Pasos del wizard de onboarding.
//
// Lógica pura: qué pasos existen, cuál sigue y cuánto se avanzó. Se prueba sin
// servidor ni base de datos, y la página solo la consulta.
//
// Decisión central: el wizard **no** guarda nada nuevo. Cada paso reutiliza la
// pantalla del perfil que ya existe, así que no hay dos formas de guardar la
// misma información que luego se desincronicen. El wizard solo guía el orden y
// muestra el avance.
export interface PasoOnboarding {
  clave: string;
  titulo: string;
  /** Qué gana el candidato al completarlo, no qué tiene que hacer. */
  porQue: string;
  /** Pantalla donde se completa. */
  ruta: string;
  completo: boolean;
}

export interface EstadoOnboarding {
  pasos: PasoOnboarding[];
  completados: number;
  total: number;
  porcentaje: number;
  /** Primer paso sin completar, o null si ya está todo. */
  siguiente: PasoOnboarding | null;
  terminado: boolean;
}

export interface DatosOnboarding {
  nombre?: string | null;
  titular?: string | null;
  habilidadesCount: number;
  experienciaCount: number;
  tienePreferencia: boolean;
}

/**
 * Los pasos van en orden de impacto en el Match Score, no en orden alfabético
 * ni por comodidad: las habilidades pesan 40% y el titular define la afinidad
 * de rol (20%), así que son lo primero. Las preferencias cubren el 25%
 * restante y la experiencia el 15%.
 */
export function estadoOnboarding(d: DatosOnboarding): EstadoOnboarding {
  const pasos: PasoOnboarding[] = [
    {
      clave: "datos",
      titulo: "Tu nombre y titular profesional",
      porQue: "El titular define tu afinidad de rol, que vale el 20% del puntaje.",
      ruta: "/perfil#datos",
      completo: !!d.nombre?.trim() && !!d.titular?.trim(),
    },
    {
      clave: "habilidades",
      titulo: "Tus habilidades",
      porQue: "Es lo que más pesa: el 40% del puntaje de cada vacante.",
      ruta: "/perfil#habilidades",
      completo: d.habilidadesCount > 0,
    },
    {
      clave: "preferencias",
      titulo: "Salario, modalidad y ciudad",
      porQue: "Define qué vacantes te sirven: suman el 25% del puntaje.",
      ruta: "/preferencias",
      completo: d.tienePreferencia,
    },
    {
      clave: "experiencia",
      titulo: "Tu experiencia laboral",
      porQue: "Con las fechas de cada cargo se pueden contar tus años (15%).",
      ruta: "/perfil#experiencia",
      completo: d.experienciaCount > 0,
    },
  ];

  const completados = pasos.filter((p) => p.completo).length;
  return {
    pasos,
    completados,
    total: pasos.length,
    porcentaje: Math.round((completados / pasos.length) * 100),
    // El primero sin completar, no el siguiente en el índice: si el candidato
    // llenó las preferencias antes que las habilidades, se lo lleva a lo que
    // de verdad falta.
    siguiente: pasos.find((p) => !p.completo) ?? null,
    terminado: completados === pasos.length,
  };
}
