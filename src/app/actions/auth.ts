"use server";
// Acciones de autenticación (E1): registro, login y logout.
// La capa de acción valida (zod), delega en Prisma y maneja la sesión.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { establecerSesion, cerrarSesion } from "@/lib/auth";
import { registroSchema, loginSchema } from "@/lib/validation";

// Búsqueda sin distinguir mayúsculas: las cuentas creadas antes de normalizar el
// correo pudieron guardarse con mayúsculas ("Ana@Mail.com").
function buscarPorEmail(email: string) {
  return prisma.candidato.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

function conError(ruta: string, mensaje: string): never {
  redirect(`${ruta}?error=${encodeURIComponent(mensaje)}`);
}

export async function registrarAction(formData: FormData) {
  const parsed = registroSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    conError("/registro", parsed.error.issues[0].message);
  }

  const { email, password } = parsed.data;
  const existente = await buscarPorEmail(email);
  if (existente) {
    conError("/registro", "Ya existe una cuenta con ese email");
  }

  const candidato = await prisma.candidato.create({
    data: { email, passwordHash: hashPassword(password) },
  });

  establecerSesion(candidato.id);
  redirect("/perfil");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    conError("/login", parsed.error.issues[0].message);
  }

  const { email, password } = parsed.data;
  const candidato = await buscarPorEmail(email);
  if (!candidato || !verifyPassword(password, candidato.passwordHash)) {
    conError("/login", "Credenciales inválidas");
  }

  establecerSesion(candidato.id);
  // Un admin que entra por el login general va directo a su panel (HU-25).
  redirect(candidato.rol === "ADMIN" ? "/admin/vacantes" : "/perfil");
}

export async function cerrarSesionAction() {
  cerrarSesion();
  redirect("/");
}
