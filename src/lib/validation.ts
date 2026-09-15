// Esquemas de validación de entradas con zod (HU-NF: validación).
// Centraliza los contratos de datos de formularios/acciones para no repetir reglas.
import { z } from "zod";

export const registroSchema = z
  .object({
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const datosPersonalesSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
  ciudad: z.string().max(120).optional().or(z.literal("")),
  contacto: z.string().max(120).optional().or(z.literal("")),
});

export const educacionSchema = z.object({
  institucion: z.string().min(1, "La institución es obligatoria").max(160),
  titulo: z.string().min(1, "El título es obligatorio").max(160),
  anio: z.coerce
    .number()
    .int()
    .min(1950)
    .max(2100)
    .optional()
    .or(z.literal(NaN).transform(() => undefined)),
});

export const experienciaSchema = z.object({
  empresa: z.string().min(1, "La empresa es obligatoria").max(160),
  cargo: z.string().min(1, "El cargo es obligatorio").max(160),
  descripcion: z.string().max(1000).optional().or(z.literal("")),
});

export const habilidadSchema = z.object({
  nombre: z.string().min(1, "El nombre de la habilidad es obligatorio").max(80),
  tipo: z.enum(["TECNICA", "BLANDA"]).default("TECNICA"),
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

export type RegistroInput = z.infer<typeof registroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PreferenciaInput = z.infer<typeof preferenciaSchema>;
