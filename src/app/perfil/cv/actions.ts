"use server";
// HU-21 / HU-22 / HU-23 · Subir el CV, parsearlo y aplicar lo que el candidato
// confirme. Cada acción exige sesión: una Server Action es un endpoint público.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCandidato } from "@/lib/auth";
import { ErrorExtraccion, extraerTextoCV } from "@/lib/cv/extractores";
import { type PerfilExtraido } from "@/lib/cv/parser";
import { analizarCV } from "@/lib/cv/analizar";
import type { ResultadoAnalisis } from "@/lib/cv/motor";
import {
  construirDatosAplicables,
  resumenAplicacion,
  seleccionDesdeFormulario,
} from "@/lib/cv/aplicar";

function conError(ruta: string, mensaje: string): never {
  redirect(`${ruta}?error=${encodeURIComponent(mensaje)}`);
}

export async function subirCVAction(formData: FormData) {
  const candidato = await requireCandidato();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    conError("/perfil/cv", "Selecciona un archivo.");
  }

  let analisis: ResultadoAnalisis;
  try {
    const texto = await extraerTextoCV({
      nombre: archivo.name,
      tipo: archivo.type,
      contenido: new Uint8Array(await archivo.arrayBuffer()),
    });
    // analizarCV elige el motor con IA si hay clave y cae al de reglas si no
    // está o si falla, así que esta llamada no puede dejar al candidato sin
    // borrador.
    analisis = await analizarCV(texto);
  } catch (e) {
    // Los errores de extracción traen un mensaje pensado para el candidato
    // (formato no soportado, PDF escaneado, archivo muy grande).
    if (e instanceof ErrorExtraccion) conError("/perfil/cv", e.message);
    conError("/perfil/cv", "No se pudo procesar el archivo. Intenta con otro formato.");
  }

  // El borrador se guarda aparte del perfil: hasta que el candidato lo revise,
  // son datos inferidos y no datos suyos (HU-23). Se guarda también qué motor
  // lo produjo, para poder decírselo en la pantalla de revisión.
  const borrador: PerfilExtraido = analisis.perfil;
  const datos = {
    ...borrador,
    habilidadesBlandas: Array.from(borrador.habilidadesBlandas ?? []),
    motor: analisis.motor,
    motivoRespaldo: analisis.motivoRespaldo,
  };
  await prisma.borradorCV.upsert({
    where: { candidatoId: candidato.id },
    create: {
      candidatoId: candidato.id,
      archivo: archivo.name,
      datos: datos as unknown as object,
    },
    update: { archivo: archivo.name, datos: datos as unknown as object },
  });

  redirect("/perfil/cv/revisar");
}

export async function aplicarCVAction(formData: FormData) {
  const candidato = await requireCandidato();

  const guardado = await prisma.borradorCV.findUnique({ where: { candidatoId: candidato.id } });
  if (!guardado) conError("/perfil/cv", "No hay un CV pendiente de revisión. Súbelo de nuevo.");

  const borrador = guardado.datos as unknown as PerfilExtraido;
  const datos = construirDatosAplicables(borrador, seleccionDesdeFormulario(formData));

  // Una sola transacción: si algo falla, el perfil no queda a medio llenar.
  await prisma.$transaction(async (tx) => {
    if (Object.keys(datos.candidato).length) {
      await tx.candidato.update({ where: { id: candidato.id }, data: datos.candidato });
    }

    // Las habilidades que el candidato ya tenía no se duplican.
    if (datos.habilidades.length) {
      const existentes = await tx.habilidad.findMany({
        where: { candidatoId: candidato.id },
        select: { nombre: true },
      });
      const yaEstan = new Set(existentes.map((h) => h.nombre.toLowerCase()));
      const nuevas = datos.habilidades.filter((h) => !yaEstan.has(h.nombre.toLowerCase()));
      if (nuevas.length) {
        await tx.habilidad.createMany({
          data: nuevas.map((h) => ({ candidatoId: candidato.id, nombre: h.nombre, tipo: h.tipo })),
        });
      }
    }

    for (const e of datos.experiencias) {
      await tx.experiencia.create({ data: { candidatoId: candidato.id, ...e } });
    }
    for (const e of datos.educacion) {
      await tx.educacion.create({ data: { candidatoId: candidato.id, ...e } });
    }

    // El borrador se consume: ya cumplió su función.
    await tx.borradorCV.delete({ where: { candidatoId: candidato.id } });
  });

  revalidatePath("/perfil");
  revalidatePath("/recomendaciones");
  redirect(`/perfil?ok=${encodeURIComponent(resumenAplicacion(datos))}`);
}

export async function descartarBorradorAction() {
  const candidato = await requireCandidato();
  await prisma.borradorCV.deleteMany({ where: { candidatoId: candidato.id } });
  redirect("/perfil/cv?ok=Borrador%20descartado");
}
