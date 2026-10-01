import Link from "next/link";
import { getCandidatoActual } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const candidato = await getCandidatoActual();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">SkillNav</h1>
      <p className="mt-4 text-lg text-slate-600">
        Encuentra oportunidades laborales alineadas con tu perfil y preferencias.
      </p>

      <div className="mt-8 flex gap-4">
        {candidato ? (
          <>
            <Link
              href="/recomendaciones"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ver recomendaciones
            </Link>
            <Link
              href="/perfil"
              className="rounded-md border border-slate-300 px-5 py-2.5 text-sm hover:bg-slate-50"
            >
              Mi perfil
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/registro"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-300 px-5 py-2.5 text-sm hover:bg-slate-50"
            >
              Iniciar sesión
            </Link>
          </>
        )}
      </div>

      <section className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { title: "Perfil completo", desc: "Datos personales, educación, experiencia y habilidades." },
          { title: "Preferencias laborales", desc: "Salario, modalidad, ubicación y disponibilidad." },
          { title: "Recomendaciones inteligentes", desc: "Vacantes ordenadas por Match Score (HU-24)." },
          { title: "Postulación & seguimiento", desc: "Postúlate con un clic y sigue el estado de cada aplicación." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
