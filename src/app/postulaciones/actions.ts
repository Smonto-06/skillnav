"use server";
// E6 · Postulación simulada.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCandidato } from "@/lib/auth";
import { z } from "zod";
import { postular, rutaInterna } from "@/lib/postulacion";

const postularSchema = z.object({
  vacanteId: z.string().cuid("ID de vacante inválido"),
  redirect: z.string().nullish(),
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
  const resultado = await postular(candidato.id, vacanteId);
  if (resultado === "vacante-inexistente") {
    redirect("/recomendaciones?error=La+vacante+ya+no+est%C3%A1+disponible");
  }

  revalidatePath("/postulaciones");
  revalidatePath("/recomendaciones");
  revalidatePath("/");
  redirect(rutaInterna(parsed.data.redirect, "/postulaciones?ok=Postulado+exitosamente"));
}
