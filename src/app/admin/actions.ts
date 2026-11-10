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
import { PESOS_DEFAULT } from "@/lib/scoring";
import { CLAVES_PESO, normalizarPesos, validarPesos } from "@/lib/scoring/configuracion";
import { recalcularScores } from "@/lib/metricas";
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

// HU-27 · Guardar los pesos del motor de scoring.
export async function guardarPesosAction(formData: FormData) {
  const admin = await requireAdmin();

  const crudo: Record<string, unknown> = {};
  for (const clave of CLAVES_PESO) crudo[clave] = formData.get(clave);

  // "Normalizar" reparte proporcionalmente en vez de rechazar el formulario y
  // dejar al administrador haciendo la cuenta a mano.
  const pesos =
    formData.get("accion") === "normalizar"
      ? normalizarPesos(
          Object.fromEntries(
            CLAVES_PESO.map((k) => [k, Number(crudo[k])])
          ) as Partial<Record<(typeof CLAVES_PESO)[number], number>>
        )
      : (() => {
          const r = validarPesos(crudo);
          if (!r.ok) conError("/admin/scoring", r.error);
          return r.pesos;
        })();

  await prisma.configuracionScoring.upsert({
    where: { id: 1 },
    create: { id: 1, ...pesos, editadoPor: admin.email },
    update: { ...pesos, editadoPor: admin.email },
  });

  // Los scores se calculan en vivo, así que el cambio se ve de inmediato en
  // las recomendaciones de todos los candidatos.
  revalidatePath("/admin/scoring");
  revalidatePath("/recomendaciones");
  redirect("/admin/scoring?ok=Pesos%20guardados");
}

export async function restablecerPesosAction() {
  const admin = await requireAdmin();
  await prisma.configuracionScoring.upsert({
    where: { id: 1 },
    create: { id: 1, ...PESOS_DEFAULT, editadoPor: admin.email },
    update: { ...PESOS_DEFAULT, editadoPor: admin.email },
  });
  revalidatePath("/admin/scoring");
  revalidatePath("/recomendaciones");
  redirect("/admin/scoring?ok=Pesos%20restablecidos%20a%20los%20valores%20de%20fabrica");
}

// HU-28 · Recalcular los scores de todos los candidatos contra todas las vacantes.
export async function recalcularAction() {
  const admin = await requireAdmin();

  const r = await recalcularScores();

  // Queda registro de la corrida con sus errores: un proceso masivo que corre
  // en silencio no le sirve a nadie.
  await prisma.ejecucionRecalculo.create({
    data: {
      ejecutadoPor: admin.email,
      perfiles: r.perfiles,
      vacantes: r.vacantes,
      paresEvaluados: r.paresEvaluados,
      errores: r.errores,
      duracionMs: r.duracionMs,
      detalleErrores: r.detalleErrores.length ? r.detalleErrores : undefined,
    },
  });

  revalidatePath("/admin/metricas");
  const resumen = `Recalculo listo: ${r.paresEvaluados} pares evaluados (${r.perfiles} perfiles x ${r.vacantes} vacantes), ${r.errores} error(es)`;
  redirect(`/admin/metricas?ok=${encodeURIComponent(resumen)}`);
}
