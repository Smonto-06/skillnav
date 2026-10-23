// Esquemas de validación de entradas con zod (HU-NF: validación).
// Centraliza los contratos de datos de formularios/acciones para no repetir reglas.
import { z } from "zod";

export const registroSchema = z
  .object({
    // El correo se guarda en minúsculas: "Ana@Mail.com" y "ana@mail.com" son la misma cuenta.
    email: z.string().trim().toLowerCase().email("Email inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(128, "La contraseña no puede superar 128 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña").max(128, "Credenciales inválidas"),
});

// Campo de texto opcional: "" se trata como ausente.
const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const nivelHabilidadEnum = z.enum(["BASICO", "INTERMEDIO", "AVANZADO", "EXPERTO"]);
export const nivelEducativoEnum = z.enum([
  "BACHILLER",
  "CURSO",
  "CERTIFICACION",
  "DIPLOMADO",
  "BOOTCAMP",
  "TECNICO",
  "TECNOLOGO",
  "PROFESIONAL",
  "ESPECIALIZACION",
  "MAESTRIA",
  "DOCTORADO",
]);
export const nivelIdiomaEnum = z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "NATIVO"]);

export const datosPersonalesSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  titular: z
    .string()
    .trim()
    .min(3, "Indica tu titular profesional (ej. Desarrollador Full Stack)")
    .max(120),
  ciudad: opcional(120),
  contacto: opcional(120),
  linkedin: opcional(200),
  resumen: opcional(1200),
  nivelIngles: nivelIdiomaEnum.optional().or(z.literal("").transform(() => undefined)),
});

export const educacionSchema = z.object({
  nivel: z.enum(nivelEducativoEnum.options, {
    errorMap: () => ({ message: "Selecciona el nivel educativo" }),
  }),
  institucion: z.string().trim().min(1, "La institución es obligatoria").max(160),
  titulo: z.string().trim().min(1, "El título es obligatorio").max(160),
  enCurso: z.boolean(),
  anio: z.coerce
    .number()
    .int()
    .min(1950, "Año inválido")
    .max(2100, "Año inválido")
    .optional()
    .or(z.literal(NaN).transform(() => undefined)),
});

export const experienciaSchema = z
  .object({
    empresa: z.string().trim().min(1, "La empresa es obligatoria").max(160),
    cargo: z.string().trim().min(1, "El cargo es obligatorio").max(160),
    descripcion: opcional(1500),
    fechaInicio: z.date({
      required_error: "Indica el mes de inicio del cargo",
      invalid_type_error: "Indica el mes de inicio del cargo",
    }),
    fechaFin: z.date().nullable(),
    actual: z.boolean(),
  })
  .refine((d) => d.actual || d.fechaFin, {
    message: "Indica el mes de finalización o marca que es tu cargo actual",
    path: ["fechaFin"],
  })
  .refine((d) => d.actual || !d.fechaFin || d.fechaFin >= d.fechaInicio, {
    message: "La fecha de finalización no puede ser anterior a la de inicio",
    path: ["fechaFin"],
  })
  .refine((d) => d.fechaInicio <= new Date(), {
    message: "La fecha de inicio no puede estar en el futuro",
    path: ["fechaInicio"],
  })
  .refine((d) => d.actual || !d.fechaFin || d.fechaFin <= new Date(), {
    message: "La fecha de finalización no puede estar en el futuro; si sigues en el cargo, marca que es tu cargo actual",
    path: ["fechaFin"],
  });

export const habilidadSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre de la habilidad es obligatorio").max(80),
  tipo: z.enum(["TECNICA", "BLANDA"]).default("TECNICA"),
  nivel: z.enum(nivelHabilidadEnum.options, {
    errorMap: () => ({ message: "Selecciona el nivel de la habilidad" }),
  }),
  anios: z.coerce
    .number()
    .int()
    .min(0, "Los años no pueden ser negativos")
    .max(50)
    .optional()
    .or(z.literal(NaN).transform(() => undefined)),
});

export const modalidadEnum = z.enum(["PRESENCIAL", "REMOTO", "HIBRIDO"]);

export const preferenciaSchema = z
  .object({
    salarioMin: z.coerce.number().int().min(0).optional(),
    salarioMax: z.coerce.number().int().min(0).optional(),
    modalidad: modalidadEnum.optional().or(z.literal("").transform(() => undefined)),
    ubicacion: z.string().max(120).optional().or(z.literal("")),
    disponibilidad: z.string().max(120).optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      d.salarioMin == null ||
      d.salarioMax == null ||
      d.salarioMax >= d.salarioMin,
    { message: "El salario máximo no puede ser menor que el mínimo", path: ["salarioMax"] }
  );

// HU-26 · CRUD de vacantes desde el panel de administración.
// Título y empresa son obligatorios: sin ellos la vacante no se puede mostrar.
// El resto es opcional, y el motor de scoring ya trata los datos ausentes como
// neutros en lugar de penalizar al candidato.
export const vacanteSchema = z.object({
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(160),
  empresa: z.string().trim().min(2, "La empresa debe tener al menos 2 caracteres").max(120),
  descripcion: z.string().trim().max(4000).optional().or(z.literal("")),
  // Lista separada por comas: "React, TypeScript, SQL".
  requisitos: z.string().trim().max(1000).optional().or(z.literal("")),
  experienciaMin: z.coerce
    .number()
    .int("Los años de experiencia deben ser un número entero")
    .min(0, "Los años de experiencia no pueden ser negativos")
    .max(50, "Revisa los años de experiencia")
    .optional(),
  salario: z.coerce
    .number()
    .int("El salario debe ser un número entero")
    .min(0, "El salario no puede ser negativo")
    .optional(),
  modalidad: modalidadEnum.optional().or(z.literal("").transform(() => undefined)),
  ciudad: z.string().trim().max(120).optional().or(z.literal("")),
});

export type RegistroInput = z.infer<typeof registroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PreferenciaInput = z.infer<typeof preferenciaSchema>;
export type VacanteInput = z.infer<typeof vacanteSchema>;
