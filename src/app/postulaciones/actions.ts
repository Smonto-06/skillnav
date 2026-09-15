"use server";
// E6 · Postulación simulada.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCandidato } from "@/lib/auth";
import { z } from "zod";

const postularSchema = z.object({
  vacanteId: z.string().cuid("ID de vacante inválido"),
  redirect: z.string().optional(),
});

export async function postularseAction(formData: FormData) {
  const candidato = await requireCandidato();

  const parsed = postularSchema.safeParse({
    vacanteId: formData.get("vacanteId"),
    redirect: formData.get("redirect"),
  });
  if (!parsed.success) {
    redirect("/recomendaciones?error=Datos+inv%C3%A1lidos");
  }

  const { vacanteId } = parsed.data;

  // Idempotente: no duplicar postulación
  const existente = await prisma.postulacion.findFirst({
    where: { candidatoId: candidato.id, vacanteId },
  });
  if (!existente) {
    await prisma.postulacion.create({
      data: { candidatoId: candidato.id, vacanteId },
    });
  }

  revalidatePath("/postulaciones");
  revalidatePath("/recomendaciones");
  redirect(parsed.data.redirect || "/postulaciones?ok=Postulado+exitosamente");
}
