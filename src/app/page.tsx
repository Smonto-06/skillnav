export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">SkillNav</h1>
      <p className="mt-4 text-lg text-slate-600">
        Plataforma inteligente de perfilamiento y recomendación de oportunidades
        laborales.
      </p>

      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Estado del proyecto</h2>
        <p className="mt-2 text-slate-600">
          Scaffold inicial (Next.js + TypeScript + Prisma + Tailwind). El núcleo
          del 60% (perfil, preferencias, motor de recomendación y postulación)
          se implementa sobre esta base.
        </p>
        <ul className="mt-4 list-inside list-disc text-slate-600">
          <li>Onboarding y perfil de candidato</li>
          <li>Preferencias laborales</li>
          <li>Recomendaciones con Match Score</li>
          <li>Postulación simulada y seguimiento</li>
        </ul>
      </section>
    </main>
  );
}
