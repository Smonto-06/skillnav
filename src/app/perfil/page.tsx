// E2 · Perfil del candidato como hoja de vida profesional: perfil profesional,
// experiencia con fechas, educación con nivel, habilidades con nivel y años, y completitud.
import Link from "next/link";
import { ReactNode } from "react";
import { requireCandidato } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completitud } from "@/lib/completeness";
import {
  FORMACION_COMPLEMENTARIA,
  NIVEL_EDUCATIVO_LABEL,
  NIVEL_IDIOMA_LABEL,
  rangoEducativo,
} from "@/lib/presentacion";
import { NIVEL_LABEL } from "@/lib/scoring";
import { SUGERENCIAS_HABILIDADES, SUGERENCIAS_TITULAR } from "@/lib/taxonomia";
import { aniosDe, aniosTotales, formatoDuracion, formatoPeriodo } from "@/lib/trayectoria";
import { Alert, Card, Field, inputClass, SubmitButton } from "@/components/ui";
import {
  guardarDatosPersonalesAction,
  agregarEducacionAction,
  eliminarEducacionAction,
  eliminarExperienciaAction,
  agregarHabilidadAction,
  eliminarHabilidadAction,
} from "./actions";
import FormExperiencia from "./FormExperiencia";

export const dynamic = "force-dynamic";

function Encabezado({ titulo, descripcion, extra }: { titulo: string; descripcion: string; extra?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
        <p className="text-sm text-slate-500">{descripcion}</p>
      </div>
      {extra}
    </div>
  );
}

function Agregar({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <details className="group mt-4 rounded-lg border border-dashed border-slate-300 p-4 open:border-solid open:bg-slate-50">
      <summary className="cursor-pointer list-none text-sm font-semibold text-acento-texto [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">+ </span>
        {texto}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

const botonEliminar = "text-sm text-slate-400 hover:text-red-600";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string; t?: string };
}) {
  const candidato = await requireCandidato();

  const [educaciones, experiencias, habilidades, preferencia] = await Promise.all([
    prisma.educacion.findMany({ where: { candidatoId: candidato.id }, orderBy: { anio: "desc" } }),
    prisma.experiencia.findMany({
      where: { candidatoId: candidato.id },
      orderBy: [{ actual: "desc" }, { fechaInicio: "desc" }],
    }),
    prisma.habilidad.findMany({ where: { candidatoId: candidato.id }, orderBy: { nombre: "asc" } }),
    prisma.preferencia.findUnique({ where: { candidatoId: candidato.id } }),
  ]);

  const { porcentaje, secciones } = completitud({
    nombre: candidato.nombre,
    ciudad: candidato.ciudad,
    contacto: candidato.contacto,
    titular: candidato.titular,
    resumen: candidato.resumen,
    educacionCount: educaciones.length,
    experienciaCount: experiencias.length,
    habilidadesCount: habilidades.length,
    tienePreferencia: !!preferencia,
  });

  const totalExperiencia = aniosTotales(
    experiencias.map((e) => ({ inicio: e.fechaInicio, fin: e.fechaFin, actual: e.actual }))
  );
  const sinFechas = experiencias.filter((e) => !e.fechaInicio).length;
  const sinNivel = habilidades.filter((h) => !h.nivel).length;
  const porNivel = [...educaciones].sort(
    (a, b) => rangoEducativo(b.nivel) - rangoEducativo(a.nivel) || (b.anio ?? 0) - (a.anio ?? 0)
  );
  const academica = porNivel.filter((e) => !e.nivel || !FORMACION_COMPLEMENTARIA.has(e.nivel));
  const complementaria = porNivel.filter((e) => e.nivel && FORMACION_COMPLEMENTARIA.has(e.nivel));
  const tecnicas = habilidades.filter((h) => h.tipo === "TECNICA");
  const blandas = habilidades.filter((h) => h.tipo === "BLANDA");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium text-acento-texto">Tu hoja de vida</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Mi perfil profesional</h1>
      <p className="mt-1 text-sm text-slate-500">
        Las empresas y el motor de recomendaciones leen esta información. Mientras más precisa,
        mejores coincidencias.
      </p>

      <div className="mt-4 space-y-2">
        {searchParams.ok && <Alert message={searchParams.ok} tone="ok" />}
        {searchParams.error && <Alert message={searchParams.error} />}
      </div>

      <datalist id="sugerencias-titular">
        {SUGERENCIAS_TITULAR.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div key={searchParams.t ?? ""} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {/* Perfil profesional */}
          <Card>
            <Encabezado
              titulo="Perfil profesional"
              descripcion="Cómo te presentas: tu titular define el tipo de cargos que te recomendamos."
            />
            <form action={guardarDatosPersonalesAction} className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo *">
                <input name="nombre" defaultValue={candidato.nombre ?? ""} required className={inputClass} />
              </Field>
              <Field label="Titular profesional *">
                <input
                  name="titular"
                  list="sugerencias-titular"
                  defaultValue={candidato.titular ?? ""}
                  placeholder="Ej. Desarrollador Full Stack"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Ciudad de residencia">
                <input name="ciudad" defaultValue={candidato.ciudad ?? ""} placeholder="Ej. Medellín" className={inputClass} />
              </Field>
              <Field label="Teléfono de contacto">
                <input name="contacto" type="tel" defaultValue={candidato.contacto ?? ""} placeholder="Ej. 300 123 4567" className={inputClass} />
              </Field>
              <Field label="LinkedIn o portafolio">
                <input
                  name="linkedin"
                  defaultValue={candidato.linkedin ?? ""}
                  placeholder="linkedin.com/in/tu-perfil"
                  className={inputClass}
                />
              </Field>
              <Field label="Nivel de inglés">
                <select name="nivelIngles" defaultValue={candidato.nivelIngles ?? ""} className={inputClass}>
                  <option value="">Sin especificar</option>
                  {Object.entries(NIVEL_IDIOMA_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Resumen profesional">
                  <textarea
                    name="resumen"
                    rows={4}
                    maxLength={1200}
                    defaultValue={candidato.resumen ?? ""}
                    placeholder="Ej. Desarrollador con 3 años creando APIs en Node.js y aplicaciones en React. Me enfoco en código mantenible y pruebas automatizadas."
                    className={inputClass}
                  />
                </Field>
                <p className="mt-1 text-xs text-slate-400">
                  De 2 a 5 líneas: años de experiencia, especialidad y logros principales.
                </p>
              </div>
              <div className="sm:col-span-2">
                <SubmitButton>Guardar perfil profesional</SubmitButton>
              </div>
            </form>
          </Card>

          {/* Experiencia */}
          <Card>
            <Encabezado
              titulo="Experiencia laboral"
              descripcion="Cada cargo con el tiempo que lo ejerciste: un cargo de pocas semanas pesa mucho menos que uno de varios años."
              extra={
                experiencias.length > 0 && (
                  <span className="rounded-full bg-acento-suave px-3 py-1 text-xs font-semibold text-acento-texto">
                    {formatoDuracion(totalExperiencia)} en total
                  </span>
                )
              }
            />
            {sinFechas > 0 && (
              <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {sinFechas === 1 ? "Un cargo no tiene" : `${sinFechas} cargos no tienen`} fechas: edítalos para
                que cuenten como experiencia.
              </p>
            )}
            {experiencias.length > 0 ? (
              <ol className="space-y-4 border-l-2 border-slate-100 pl-5">
                {experiencias.map((e) => {
                  const periodo = formatoPeriodo({ inicio: e.fechaInicio, fin: e.fechaFin, actual: e.actual });
                  return (
                    <li key={e.id} className="relative">
                      <span
                        aria-hidden
                        className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                          e.actual ? "bg-acento" : "bg-slate-300"
                        }`}
                      />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{e.cargo}</p>
                          <p className="text-sm text-slate-600">{e.empresa}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            {periodo ? (
                              <>
                                <span className="rounded-full bg-acento-suave px-2 py-0.5 font-semibold text-acento-texto">
                                  {formatoDuracion(aniosDe({ inicio: e.fechaInicio, fin: e.fechaFin, actual: e.actual }))} en el cargo
                                </span>
                                <span className="text-slate-500">{periodo}</span>
                              </>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                                Sin fechas: edítalo para indicar el tiempo en el cargo
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <Link href={`/perfil/experiencia/${e.id}`} className="text-sm font-medium text-acento-texto hover:underline">
                            Editar
                          </Link>
                          <form action={eliminarExperienciaAction}>
                            <input type="hidden" name="id" value={e.id} />
                            <button className={botonEliminar}>Eliminar</button>
                          </form>
                        </div>
                      </div>
                      {e.descripcion && (
                        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{e.descripcion}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">Aún no registras experiencia laboral.</p>
            )}
            <Agregar texto="Agregar experiencia">
              <FormExperiencia />
            </Agregar>
          </Card>

          {/* Educación */}
          <Card>
            <Encabezado
              titulo="Educación y formación"
              descripcion="Títulos, técnicas, tecnologías, posgrados, cursos, diplomados, bootcamps y certificaciones."
            />
            {educaciones.length === 0 && <p className="text-sm text-slate-500">Aún no registras estudios.</p>}
            {[
              { titulo: "Formación académica", lista: academica },
              { titulo: "Cursos y certificaciones", lista: complementaria },
            ]
              .filter((g) => g.lista.length > 0)
              .map((g) => (
                <div key={g.titulo} className="mb-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.titulo}</p>
                  <ul className="divide-y divide-slate-100">
                    {g.lista.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-4 py-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{e.titulo}</p>
                            {e.nivel && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {NIVEL_EDUCATIVO_LABEL[e.nivel]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{e.institucion}</p>
                          <p className="text-xs text-slate-500">
                            {[
                              e.enCurso ? "En curso" : "Finalizado",
                              e.anio ? (e.enCurso ? `Termina en ${e.anio}` : String(e.anio)) : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <form action={eliminarEducacionAction}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className={botonEliminar}>Eliminar</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            <Agregar texto="Agregar estudio, curso o certificación">
              <form action={agregarEducacionAction} className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de formación *">
                  <select name="nivel" required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Selecciona
                    </option>
                    <optgroup label="Formación académica">
                      {Object.entries(NIVEL_EDUCATIVO_LABEL)
                        .filter(([v]) => !FORMACION_COMPLEMENTARIA.has(v))
                        .map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Formación complementaria">
                      {Object.entries(NIVEL_EDUCATIVO_LABEL)
                        .filter(([v]) => FORMACION_COMPLEMENTARIA.has(v))
                        .map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </Field>
                <Field label="Título o nombre del programa *">
                  <input
                    name="titulo"
                    required
                    placeholder="Ej. Ingeniería de Sistemas, Técnico en Programación, Curso de Docker"
                    className={inputClass}
                  />
                </Field>
                <Field label="Institución *">
                  <input name="institucion" required placeholder="Ej. EAFIT, SENA, Platzi, Coursera, AWS" className={inputClass} />
                </Field>
                <Field label="Año de finalización (o esperado)">
                  <input name="anio" type="number" min="1950" max="2100" className={inputClass} />
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                  <input type="checkbox" name="enCurso" className="h-4 w-4 accent-acento" />
                  Actualmente lo estoy cursando
                </label>
                <p className="text-xs text-slate-400 sm:col-span-2">
                  Las tecnologías que nombres en cursos y certificaciones (ej. &ldquo;Curso de Docker&rdquo;) también
                  cuentan como evidencia en tu compatibilidad.
                </p>
                <div className="sm:col-span-2">
                  <SubmitButton>Agregar a mi formación</SubmitButton>
                </div>
              </form>
            </Agregar>
          </Card>

          {/* Habilidades */}
          <Card>
            <Encabezado
              titulo="Habilidades"
              descripcion="Indica tu nivel y años de uso: pesan en la compatibilidad con cada requisito."
            />
            {sinNivel > 0 && (
              <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {sinNivel === 1 ? "Una habilidad no tiene" : `${sinNivel} habilidades no tienen`} nivel. Vuelve a
                agregarlas con su nivel para actualizarlas.
              </p>
            )}
            {[
              { titulo: "Técnicas", lista: tecnicas },
              { titulo: "Blandas", lista: blandas },
            ]
              .filter((g) => g.lista.length > 0)
              .map((g) => (
                <div key={g.titulo} className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.titulo}</p>
                  <ul className="flex flex-wrap gap-2">
                    {g.lista.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1.5 text-sm"
                      >
                        <span className="font-medium text-slate-800">{h.nombre}</span>
                        <span className="text-xs text-slate-500">
                          {[h.nivel ? NIVEL_LABEL[h.nivel] : null, h.anios ? `${h.anios} a` : null]
                            .filter(Boolean)
                            .join(" · ") || "Sin nivel"}
                        </span>
                        <form action={eliminarHabilidadAction}>
                          <input type="hidden" name="id" value={h.id} />
                          <button
                            aria-label={`Eliminar ${h.nombre}`}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            ×
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            {habilidades.length === 0 && <p className="text-sm text-slate-500">Aún no registras habilidades.</p>}
            <Agregar texto="Agregar habilidad">
              <datalist id="sugerencias-habilidades">
                {SUGERENCIAS_HABILIDADES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <form action={agregarHabilidadAction} className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Field label="Habilidad *">
                    <input
                      name="nombre"
                      list="sugerencias-habilidades"
                      required
                      placeholder="Ej. Node.js, SQL, Liderazgo"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Nivel *">
                  <select name="nivel" required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Selecciona
                    </option>
                    {Object.entries(NIVEL_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Años de uso">
                  <input name="anios" type="number" min="0" max="50" placeholder="Ej. 2" className={inputClass} />
                </Field>
                <Field label="Tipo">
                  <select name="tipo" className={inputClass}>
                    <option value="TECNICA">Técnica</option>
                    <option value="BLANDA">Blanda</option>
                  </select>
                </Field>
                <div className="flex items-end sm:col-span-3">
                  <SubmitButton>Agregar habilidad</SubmitButton>
                </div>
              </form>
              <p className="mt-3 text-xs text-slate-400">
                Reconocemos sinónimos (Node, NodeJS y Node.js son lo mismo) y equivalencias: si dominas
                PostgreSQL, cubres los requisitos de SQL. Si agregas una habilidad que ya tienes, se actualiza.
              </p>
            </Agregar>
          </Card>
        </div>

        {/* Columna lateral */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Completitud</h2>
              <span className="text-sm font-semibold">{porcentaje}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-acento transition-all" style={{ width: `${porcentaje}%` }} />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {secciones.map((s) => (
                <li key={s.clave} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      s.completa ? "bg-acento text-marca" : "border border-slate-300"
                    }`}
                  >
                    {s.completa ? "✓" : ""}
                  </span>
                  <span className={s.completa ? "text-slate-700" : "text-slate-400"}>{s.etiqueta}</span>
                </li>
              ))}
            </ul>
            {!preferencia && (
              <Link href="/preferencias" className="mt-4 block text-sm font-medium text-acento-texto hover:underline">
                Definir preferencias laborales
              </Link>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Así te ven las empresas</h2>
            <p className="mt-3 font-semibold text-slate-900">{candidato.nombre || "Tu nombre"}</p>
            <p className="text-sm text-acento-texto">{candidato.titular || "Agrega tu titular profesional"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {[
                candidato.ciudad,
                experiencias.length ? `${formatoDuracion(totalExperiencia)} de experiencia` : null,
                candidato.nivelIngles ? `Inglés ${candidato.nivelIngles}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {candidato.resumen && <p className="mt-3 line-clamp-4 text-sm text-slate-600">{candidato.resumen}</p>}
          </Card>
        </aside>
      </div>
    </main>
  );
}
