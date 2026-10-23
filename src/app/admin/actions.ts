"use server";
// E7 · Acciones del panel de administración.
// HU-25 login de admin · HU-26 CRUD de vacantes.
// Cada acción valida con zod y vuelve a exigir rol ADMIN: una Server Action es
// un endpoint público, así que no alcanza con proteger la página que la invoca.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { establecerSesion, requireAdmin } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { vacanteDesdeFormulario } from "@/lib/vacante";

function conError(ruta: string, mensaje: string): never {
  redirect(`${ruta}?error=${encodeURIComponent(mensaje)}`);
}

export async function loginAdminAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    conError("/admin/login", parsed.error.issues[0].message);
  }

  const { email, password } = parsed.data;
  const cuenta = await prisma.candidato.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  // Mismo mensaje para email inexistente, contraseña incorrecta y cuenta sin
  // permisos: no le confirmamos a nadie qué correos son administradores.
  if (!cuenta || !verifyPassword(password, cuenta.passwordHash) || cuenta.rol !== "ADMIN") {
    conError("/admin/login", "Credenciales inválidas o cuenta sin permisos de administración");
  }

  establecerSesion(cuenta.id);
  redirect("/admin/vacantes");
}

// Lee y valida el formulario de vacante; devuelve los datos listos para Prisma.
// La traducción vive en lib/vacante.ts para poder probarla sin servidor.
function leerVacante(formData: FormData, rutaError: string) {
  const r = vacanteDesdeFormulario({
    titulo: formData.get("titulo"),
    empresa: formData.get("empresa"),
    descripcion: formData.get("descripcion"),
    requisitos: formData.get("requisitos"),
    experienciaMin: formData.get("experienciaMin"),
    salario: formData.get("salario"),
    modalidad: formData.get("modalidad"),
    ciudad: formData.get("ciudad"),
  });
  if (!r.ok) conError(rutaError, r.error);
  return r.data;
}

export async function crearVacanteAction(formData: FormData) {
  await requireAdmin();
  const data = leerVacante(formData, "/admin/vacantes/nueva");

  await prisma.vacante.create({ data });

  revalidatePath("/admin/vacantes");
  revalidatePath("/recomendaciones");
  redirect("/admin/vacantes?ok=Vacante%20creada");
}

export async function actualizarVacanteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) conError("/admin/vacantes", "Falta el identificador de la vacante");

  const data = leerVacante(formData, `/admin/vacantes/${id}`);

  const existente = await prisma.vacante.findUnique({ where: { id } });
  if (!existente) conError("/admin/vacantes", "Esa vacante ya no existe");

  await prisma.vacante.update({ where: { id }, data });

  revalidatePath("/admin/vacantes");
  revalidatePath("/recomendaciones");
  redirect("/admin/vacantes?ok=Vacante%20actualizada");
}

export async function eliminarVacanteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) conError("/admin/vacantes", "Falta el identificador de la vacante");

  const vacante = await prisma.vacante.findUnique({
    where: { id },
    include: { _count: { select: { postulaciones: true } } },
  });
  if (!vacante) conError("/admin/vacantes", "Esa vacante ya no existe");

  // Borrar una vacante con postulaciones destruiría el historial del candidato
  // (Postulacion tiene onDelete: Cascade). Preferimos bloquear y avisar.
  if (vacante._count.postulaciones > 0) {
    conError(
      "/admin/vacantes",
      `No se puede eliminar: ${vacante._count.postulaciones} candidato(s) ya se postularon a esta vacante`
    );
  }

  await prisma.vacante.delete({ where: { id } });

  revalidatePath("/admin/vacantes");
  revalidatePath("/recomendaciones");
  redirect("/admin/vacantes?ok=Vacante%20eliminada");
}
