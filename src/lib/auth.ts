// Puente entre la sesión firmada (session.ts) y las cookies de Next + Prisma.
// Provee helpers para leer el candidato autenticado desde Server Components y acciones.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { SESSION_COOKIE, signSession, verifySession } from "./session";

export function establecerSesion(candidatoId: string): void {
  cookies().set(SESSION_COOKIE, signSession(candidatoId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
}

export function cerrarSesion(): void {
  cookies().delete(SESSION_COOKIE);
}

export function candidatoIdActual(): string | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

// Devuelve el candidato autenticado o null (no lanza).
export async function getCandidatoActual() {
  const id = candidatoIdActual();
  if (!id) return null;
  return prisma.candidato.findUnique({ where: { id } });
}

// Exige sesión: si no hay candidato válido, redirige a /login.
export async function requireCandidato() {
  const candidato = await getCandidatoActual();
  if (!candidato) redirect("/login");
  return candidato;
}
