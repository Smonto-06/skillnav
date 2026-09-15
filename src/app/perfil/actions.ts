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

function conError(mensaje: string, ruta = "/perfil"): never {
  redirect(`${ruta}?error=${encodeURIComponent(mensaje)}`);
}

function limpio(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

export async function guardarDatosPersonalesAction(formData: FormData) {
  const candidato = await requireCandidato();
  const parsed = datosPersonalesSchema.safeParse({
    nombre: formData.get("nombre"),
    ciudad: formData.get("ciudad"),
    contacto: formData.get("contacto"),
  });
  if (!parsed.success) conError(parsed.error.issues[0].message);

  await prisma.candidato.update({
    where: { id: candidato.id },
    data: {
      nombre: parsed.data.nombre,
      ciudad: limpio(formData.get("ciudad")),
      contacto: limpio(formData.get("contacto")),
    },
  });
  revalidatePath("/perfil");
  redirect("/perfil?ok=Datos%20guardados");
}

/* ---------------- Educación (HU-05) ---------------- */
export async function agregarEducacionAction(formData: FormData) {
  const candidato = await requireCandidato();
  const parsed = educacionSchema.safeParse({
    institucion: formData.get("institucion"),
    titulo: formData.get("titulo"),
    anio: formData.get("anio"),
  });
  if (!parsed.success) conError(parsed.error.issues[0].message);

  await prisma.educacion.create({
    data: {
      candidatoId: candidato.id,
      institucion: parsed.data.institucion,
      titulo: parsed.data.titulo,
      anio: Number.isFinite(parsed.data.anio as number)
        ? (parsed.data.anio as number)
        : null,
    },
  });
  revalidatePath("/perfil");
  redirect("/perfil?ok=Educaci%C3%B3n%20agregada");
}

export async function eliminarEducacionAction(formData: FormData) {
  const candidato = await requireCandidato();
  const id = (formData.get("id") ?? "").toString();
  await prisma.educacion.deleteMany({ where: { id, candidatoId: candidato.id } });
  revalidatePath("/perfil");
  redirect("/perfil?ok=Educaci%C3%B3n%20eliminada");
}

/* ---------------- Experiencia (HU-06, CRUD completo) ---------------- */
export async function agregarExperienciaAction(formData: FormData) {
  const candidato = await requireCandidato();
  const parsed = experienciaSchema.safeParse({
    empresa: formData.get("empresa"),
    cargo: formData.get("cargo"),
    descripcion: formData.get("descripcion"),
  });
  if (!parsed.success) conError(parsed.error.issues[0].message);

  await prisma.experiencia.create({
    data: {
      candidatoId: candidato.id,
      empresa: parsed.data.empresa,
      cargo: parsed.data.cargo,
      descripcion: limpio(formData.get("descripcion")),
    },
  });
  revalidatePath("/perfil");
  redirect("/perfil?ok=Experiencia%20agregada");
}

export async function actualizarExperienciaAction(formData: FormData) {
  const candidato = await requireCandidato();
  const id = (formData.get("id") ?? "").toString();
  const parsed = experienciaSchema.safeParse({
    empresa: formData.get("empresa"),
    cargo: formData.get("cargo"),
    descripcion: formData.get("descripcion"),
  });
  if (!parsed.success) conError(parsed.error.issues[0].message, `/perfil/experiencia/${id}`);

  await prisma.experiencia.updateMany({
    where: { id, candidatoId: candidato.id },
    data: {
      empresa: parsed.data.empresa,
      cargo: parsed.data.cargo,
      descripcion: limpio(formData.get("descripcion")),
    },
  });
  revalidatePath("/perfil");
  redirect("/perfil?ok=Experiencia%20actualizada");
}

export async function eliminarExperienciaAction(formData: FormData) {
  const candidato = await requireCandidato();
  const id = (formData.get("id") ?? "").toString();
  await prisma.experiencia.deleteMany({ where: { id, candidatoId: candidato.id } });
  revalidatePath("/perfil");
  redirect("/perfil?ok=Experiencia%20eliminada");
}

/* ---------------- Habilidades (HU-07) ---------------- */
export async function agregarHabilidadAction(formData: FormData) {
  const candidato = await requireCandidato();
  const parsed = habilidadSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo") || "TECNICA",
  });
  if (!parsed.success) conError(parsed.error.issues[0].message);

  await prisma.habilidad.create({
    data: {
      candidatoId: candidato.id,
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
    },
  });
  revalidatePath("/perfil");
  redirect("/perfil?ok=Habilidad%20agregada");
}

export async function eliminarHabilidadAction(formData: FormData) {
  const candidato = await requireCandidato();
  const id = (formData.get("id") ?? "").toString();
  await prisma.habilidad.deleteMany({ where: { id, candidatoId: candidato.id } });
  revalidatePath("/perfil");
  redirect("/perfil?ok=Habilidad%20eliminada");
}
