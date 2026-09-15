"use server";
// E4 · Preferencias laborales.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCandidato } from "@/lib/auth";
import { preferenciaSchema } from "@/lib/validation";

export async function guardarPreferenciasAction(formData: FormData) {
  const candidato = await requireCandidato();

  const raw = {
    salarioMin: formData.get("salarioMin") || undefined,
    salarioMax: formData.get("salarioMax") || undefined,
    modalidad: formData.get("modalidad") || undefined,
    ubicacion: formData.get("ubicacion") || undefined,
    disponibilidad: formData.get("disponibilidad") || undefined,
  };

  const parsed = preferenciaSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(
      `/preferencias?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }

  const data = {
    salarioMin: parsed.data.salarioMin ?? null,
    salarioMax: parsed.data.salarioMax ?? null,
    modalidad: (parsed.data.modalidad as "PRESENCIAL" | "REMOTO" | "HIBRIDO" | undefined) ?? null,
    ubicacion: (parsed.data.ubicacion as string | null | undefined) ?? null,
    disponibilidad: parsed.data.disponibilidad ?? null,
  };

  await prisma.preferencia.upsert({
    where: { candidatoId: candidato.id },
    create: { candidatoId: candidato.id, ...data },
    update: data,
  });

  revalidatePath("/preferencias");
  revalidatePath("/perfil");
  redirect("/preferencias?ok=Preferencias%20guardadas");
}
