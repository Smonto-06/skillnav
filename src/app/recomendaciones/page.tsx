// E5 · Recomendaciones ordenadas por matchScore (HU-24).
// Lista de vacantes desde BD + puntaje + acción "Postularse" por registro.
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { recorrerCatalogo } from "@/lib/catalogo";
import {
  condicionDePreseleccion,
  condicionesDeCatalogo,
  convienePreseleccionar,
} from "@/lib/preseleccion";
import { cargarPerfilScoring } from "@/lib/perfil-scoring";
import { detalleVacante, filtrarVacantes, resumenRequisitos } from "@/lib/presentacion";
import { Alert, Card } from "@/components/ui";
import { BotonPostular, BuscadorVacantes, MatchRing, RequisitosVacante } from "@/components/vacantes";
import { pesosDesdeConfiguracion } from "@/lib/scoring/configuracion";

export const dynamic = "force-dynamic";

const DIMENSIONES = [
  { clave: "skills", etiqueta: "Habilidades" },
  { clave: "rol", etiqueta: "Afinidad de rol" },
  { clave: "experiencia", etiqueta: "Experiencia" },
  { clave: "salario", etiqueta: "Salario" },
  { clave: "modalidad", etiqueta: "Modalidad" },
  { clave: "ubicacion", etiqueta: "Ubicación" },
] as const;

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function RecomendacionesPage({
  searchParams,
}: {
  searchParams: {
    ok?: string;
    error?: string;
    q?: string;
    ciudad?: string;
    modalidad?: string;
    salarioMin?: string;
  };
}) {
  const candidato = await requireCandidato();

  const [{ perfil }, totalCatalogo, postulaciones, config] = await Promise.all([
    cargarPerfilScoring(candidato),
    // Un conteo en vez del catálogo entero: decide si hace falta preseleccionar
    // y alimenta el "N de M" del encabezado.
    prisma.vacante.count(),
    prisma.postulacion.findMany({ where: { candidatoId: candidato.id }, select: { vacanteId: true } }),
    // HU-27: los pesos que configuró el administrador. Sin esta lectura, el
    // panel de pesos no afectaría ningún puntaje.
    prisma.configuracionScoring.findUnique({ where: { id: 1 } }),
  ]);

  const pesos = pesosDesdeConfiguracion(config);

  const yaPostulado = new Set(postulaciones.map((p) => p.vacanteId));

  // El salario del filtro llega como texto: solo cuenta si es un número válido.
  const salarioMinFiltro = Number.parseInt(searchParams.salarioMin ?? "", 10);
  const filtros = {
    modalidad: searchParams.modalidad,
    salarioMin: Number.isFinite(salarioMinFiltro) ? salarioMinFiltro : null,
  };

  const filtrando = !!(
    searchParams.q?.trim() ||
    searchParams.ciudad?.trim() ||
    filtros.modalidad?.trim() ||
    filtros.salarioMin != null
  );

  // Con un catálogo grande se preselecciona por habilidades y rol antes de
  // puntuar; con el catálogo actual la condición es `null` y se recorre todo,
  // que es lo que se venía haciendo.
  const preseleccion = convienePreseleccionar(totalCatalogo)
    ? condicionDePreseleccion(perfil)
    : null;

  const { recomendaciones, evaluadas, truncado } = await recorrerCatalogo({
    perfil,
    pesos,
    ahora: new Date(),
    cargarLote: (desde, tamano) =>
      prisma.vacante.findMany({
        // Los filtros estructurales se resuelven en la base de datos. El de
        // texto y el de ciudad ignoran tildes, y traducir eso a SQL exigiría
        // una extensión del motor, así que se aplican sobre el lote.
        //
        // Van dentro de `AND` y no sueltos en el objeto: los tres usan la clave
        // `OR`, y puestos al mismo nivel el último sobrescribiría a los
        // anteriores, dejando filtros sin aplicar sin que nada falle.
        // El cast es necesario porque `condicionesDeCatalogo` vive en la capa de
        // dominio y no importa tipos de Prisma: mantenerla libre del ORM es lo
        // que permite probarla sin base de datos. Su forma la fijan sus pruebas.
        where: { AND: condicionesDeCatalogo(preseleccion, filtros) as Prisma.VacanteWhereInput[] },
        // El desempate por id es necesario para paginar con cursor: si dos
        // vacantes comparten createdAt, sin un orden total la paginación puede
        // saltarse filas o repetirlas.
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: tamano,
        ...(desde ? { cursor: { id: desde }, skip: 1 } : {}),
      }),
    filtrarLote: (lote) => filtrarVacantes(lote, searchParams.q, searchParams.ciudad, filtros),
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Vacantes recomendadas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ordenadas por compatibilidad con tu perfil y preferencias.
      </p>
      <div className="mt-6 rounded-xl border border-acento/30 bg-acento-suave px-5 py-4 text-sm leading-relaxed text-slate-700">
        {/* Los porcentajes salen de los pesos vigentes y no escritos a mano:
            si el administrador los cambia (HU-27), este texto los sigue. */}
        <strong className="text-slate-900">¿Qué significa el porcentaje (Match Score)?</strong> Es
        la compatibilidad entre tu hoja de vida y cada vacante, calculada en tiempo real. Evalúa
        tus habilidades frente a los requisitos ({pct(pesos.skills)}) reconociendo sinónimos y
        equivalencias (por ejemplo, PostgreSQL cubre SQL), la afinidad de tu rol con el cargo (
        {pct(pesos.rol)}; un perfil Full Stack cubre una vacante Backend), tus años de experiencia
        relevante ({pct(pesos.experiencia)}), el salario ({pct(pesos.salario)}), la modalidad (
        {pct(pesos.modalidad)}; si prefieres híbrido también eres compatible con vacantes
        presenciales y remotas) y la ciudad ({pct(pesos.ubicacion)}). Mientras más completo esté
        tu perfil, con nivel y años en cada habilidad y fechas en cada cargo, más preciso es el
        resultado.
      </div>

      <div className="mt-6">
        <BuscadorVacantes
          q={searchParams.q}
          ciudad={searchParams.ciudad}
          modalidad={searchParams.modalidad}
          salarioMin={searchParams.salarioMin}
        />
      </div>
      {filtrando && (
        <p className="mt-3 text-sm text-slate-500">
          {recomendaciones.length} de {totalCatalogo} vacantes coinciden con tu búsqueda ·{" "}
          <a href="/recomendaciones" className="font-medium text-acento-texto hover:underline">
            Quitar filtros
          </a>
        </p>
      )}
      {/* Si el catálogo dio más coincidencias de las que se muestran, se dice.
          Callarlo haría parecer que no hay más vacantes que estas. */}
      {truncado && (
        <p className="mt-3 text-sm text-slate-500">
          Mostrando las {recomendaciones.length} vacantes con mayor compatibilidad, de{" "}
          {evaluadas} evaluadas. Usa los filtros para acotar la búsqueda.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      {recomendaciones.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-slate-500">
            {filtrando
              ? "Ninguna vacante coincide con tu búsqueda. Prueba con otros términos."
              : "No hay vacantes en el catálogo todavía."}
          </p>
        </Card>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {recomendaciones.map(({ vacante, score, desglose, requisitos, motivoRol, motivoExperiencia }) => (
            <li key={vacante.id} id={vacante.id} className="scroll-mt-6">
              <Card className="h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{vacante.titulo}</h2>
                    <p className="text-slate-600">{vacante.empresa}</p>
                    <p className="mt-1 text-sm text-slate-500">{detalleVacante(vacante)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-3">
                    <MatchRing score={score} />
                    <BotonPostular
                      vacanteId={vacante.id}
                      postulado={yaPostulado.has(vacante.id)}
                      volverA="/recomendaciones?ok=Postulado+exitosamente"
                    />
                  </div>
                </div>

                {vacante.descripcion && (
                  <p className="mt-3 text-sm text-slate-600">{vacante.descripcion}</p>
                )}
                {vacante.experienciaMin ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Experiencia mínima: {vacante.experienciaMin}{" "}
                    {vacante.experienciaMin === 1 ? "año" : "años"}
                  </p>
                ) : null}
                <div className="mt-3">
                  <RequisitosVacante requisitos={requisitos} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{resumenRequisitos(requisitos)}</p>

                <details className="group mt-4 text-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-acento-texto [&::-webkit-details-marker]:hidden">
                    <span className="text-xs transition-transform group-open:rotate-90">▶</span>
                    Cómo se calcula tu compatibilidad
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {DIMENSIONES.map((d) => {
                      const valor = Math.round(desglose[d.clave] * 100);
                      return (
                        <li key={d.clave}>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>
                              {d.etiqueta}{" "}
                              {/* El peso vigente, no el de fábrica: si el
                                  administrador lo cambió, acá se ve el real. */}
                              <span className="text-slate-400">(peso {pct(pesos[d.clave])})</span>
                            </span>
                            <span className="font-medium text-slate-700">{valor}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-acento"
                              style={{ width: `${valor}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    {requisitos.map((r) => (
                      <div key={r.requisito} className="flex gap-2">
                        <dt className="w-28 shrink-0 font-medium text-slate-700">{r.requisito}</dt>
                        <dd className="text-slate-500">{r.motivo}</dd>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 font-medium text-slate-700">Rol</dt>
                      <dd className="text-slate-500">{motivoRol}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 font-medium text-slate-700">Experiencia</dt>
                      <dd className="text-slate-500">{motivoExperiencia}</dd>
                    </div>
                  </dl>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
