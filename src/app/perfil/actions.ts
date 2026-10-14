"use server";
// Acciones del perfil (E2): datos personales, educación, experiencia (CRUD) y habilidades.
// Cada acción exige sesión, valida con zod y revalida la vista del perfil.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCandidato } from "@/lib/auth";
import {
  datosPersonalesSchema,
  educacionSchema,
  experienciaSchema,
  habilidadSchema,
} from "@/lib/validation";
import { desdeMes } from "@/lib/trayectoria";
import { nombreCanonico } from "@/lib/scoring";
import { clave } from "@/lib/taxonomia";

function conError(mensaje: string, ruta = "/perfil"): never {
  redirect(`${ruta}?error=${encodeURIComponent(mensaje)}`);
}

// Redirige con mensaje de éxito y un sello de tiempo: la página lo usa como `key`
// para reiniciar los formularios (si no, Next conserva lo escrito y la sección abierta).
function listo(mensaje: string): never {
  redirect(`/perfil?ok=${encodeURIComponent(mensaje)}&t=${Date.now()}`);
}

function limpio(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

// Valor numérico opcional del formulario: vacío -> undefined (z.coerce convertiría "" en 0).
function numero(v: FormDataEntryValue | null): string | undefined {
  const t = (v ?? "").toString().trim();
  return t === "" ? undefined : t;
}

export async function guardarDatosPersonalesAction(formData: FormData) {
  const candidato = await requireCandidato();
  const parsed = datosPersonalesSchema.safeParse({
    nombre: formData.get("nombre"),
    titular: formData.get("titular"),
    ciudad: formData.get("ciudad"),
    contacto: formData.get("contacto"),
    linkedin: formData.get("linkedin"),
    resumen: formData.get("resumen"),
    nivelIngles: formData.get("nivelIngles") ?? "",
  });
  if (!parsed.success) conError(parsed.error.issues[0].message);

  await prisma.candidato.update({
    where: { id: candidato.id },
    data: {
      nombre: parsed.data.nombre,
      titular: parsed.data.titular,
      ciudad: limpio(formData.get("ciudad")),
      contacto: limpio(formData.get("contacto")),
      linkedin: limpio(formData.get("linkedin")),
      resumen: limpio(formData.get("resumen")),
      nivelIngles: parsed.data.nivelIngles ?? null,
    },
  });
  revalidatePath("/perfil");
  listo("Perfil profesional guardado");
}

/* ---------------- Educación (HU-05) ---------------- */
export async function agregarEducacionAction(formData: FormData) {
  const candidato = await requireCandidato();
  const parsed = educacionSchema.safeParse({
    nivel: formData.get("nivel"),
    institucion: formData.get("institucion"),
    titulo: formData.get("titulo"),
    enCurso: formData.get("enCurso") === "on",
    anio: numero(formData.get("anio")),
  });
  if (!parsed.success) conError(parsed.error.issues[0].message);

  await prisma.educacion.create({
    data: {
      candidatoId: candidato.id,
      nivel: parsed.data.nivel,
      institucion: parsed.data.institucion,
      titulo: parsed.data.titulo,
      enCurso: parsed.data.enCurso,
      anio: parsed.data.anio ?? null,
    },
  });
  revalidatePath("/perfil");
  listo("Educación agregada");
}

export async function eliminarEducacionAction(formData: FormData) {
  const candidato = await requireCandidato();
  const id = (formData.get("id") ?? "").toString();
  await prisma.educacion.deleteMany({ where: { id, candidatoId: candidato.id } });
  revalidatePath("/perfil");
  listo("Educación eliminada");
}

/* ---------------- Experiencia (HU-06, CRUD completo) ---------------- */
function leerExperiencia(formData: FormData) {
  const actual = formData.get("actual") === "on";
  return experienciaSchema.safeParse({
    empresa: formData.get("empresa"),
    cargo: formData.get("cargo"),
    descripcion: formData.get("descripcion"),
    fechaInicio: desdeMes(formData.get("fechaInicio")) ?? undefined,
    fechaFin: actual ? null : desdeMes(formData.get("fechaFin")),
    actual,
  });
}

export async function agregarExperienciaAction(formData: FormData) {
  const candidato = await requireCandidato();
  const parsed = leerExperiencia(formData);
  if (!parsed.success) conError(parsed.error.issues[0].message);

  await prisma.experiencia.create({
    data: {
      candidatoId: candidato.id,
      empresa: parsed.data.empresa,
      cargo: parsed.data.cargo,
      fechaInicio: parsed.data.fechaInicio,
      fechaFin: parsed.data.fechaFin,
      actual: parsed.data.actual,
      descripcion: limpio(formData.get("descripcion")),
    },
  });
  revalidatePath("/perfil");
  listo("Experiencia agregada");
}

export async function actualizarExperienciaAction(formData: FormData) {
  const candidato = await requireCandidato();
  const id = (formData.get("id") ?? "").toString();
  const parsed = leerExperiencia(formData);
  if (!parsed.success) conError(parsed.error.issues[0].message, `/perfil/experiencia/${id}`);

  await prisma.experiencia.updateMany({
    where: { id, candidatoId: candidato.id },
    data: {
      empresa: parsed.data.empresa,
      cargo: parsed.data.cargo,
      fechaInicio: parsed.data.fechaInicio,
      fechaFin: parsed.data.fechaFin,
      actual: parsed.data.actual,
      descripcion: limpio(formData.get("descripcion")),
    },
  });
  revalidatePath("/perfil");
  listo("Experiencia actualizada");
}

export async function eliminarExperienciaAction(formData: FormData) {
  const candidato = await requireCandidato();
  const id = (formData.get("id") ?? "").toString();
  await prisma.experiencia.deleteMany({ where: { id, candidatoId: candidato.id } });
  revalidatePath("/perfil");
  listo("Experiencia eliminada");
}

/* ---------------- Habilidades (HU-07) ---------------- */
export async function agregarHabilidadAction(formData: FormData) {
  const candidato = await requireCandidato();
  const parsed = habilidadSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo") || "TECNICA",
    nivel: formData.get("nivel"),
    anios: numero(formData.get("anios")),
  });
  if (!parsed.success) conError(parsed.error.issues[0].message);

  // Se guarda con el nombre del catálogo ("node js" -> "Node.js") y, si ya
  // existía, se actualiza en vez de duplicarla.
  const nombre = nombreCanonico(parsed.data.nombre);
  const data = { nombre, tipo: parsed.data.tipo, nivel: parsed.data.nivel, anios: parsed.data.anios ?? null };
  const existentes = await prisma.habilidad.findMany({ where: { candidatoId: candidato.id } });
  const repetida = existentes.find((h) => clave(nombreCanonico(h.nombre)) === clave(nombre));
  if (repetida) {
    await prisma.habilidad.update({ where: { id: repetida.id }, data });
  } else {
    await prisma.habilidad.create({ data: { candidatoId: candidato.id, ...data } });
  }
  revalidatePath("/perfil");
  listo(repetida ? "Habilidad actualizada" : "Habilidad agregada");
}

export async function eliminarHabilidadAction(formData: FormData) {
  const candidato = await requireCandidato();
  const id = (formData.get("id") ?? "").toString();
  await prisma.habilidad.deleteMany({ where: { id, candidatoId: candidato.id } });
  revalidatePath("/perfil");
  listo("Habilidad eliminada");
}
