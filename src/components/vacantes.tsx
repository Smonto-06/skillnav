// Piezas visuales de vacantes compartidas por Inicio y Recomendaciones.
import { postularseAction } from "@/app/postulaciones/actions";

// Anillo con el Match Score (0-100).
export function MatchRing({ score, size = 60 }: { score: number; size?: number }) {
  const grosor = 6;
  const radio = (size - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const valor = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Compatibilidad ${valor}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          fill="none"
          strokeWidth={grosor}
          className="stroke-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          fill="none"
          strokeWidth={grosor}
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - valor / 100)}
          className="stroke-acento"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700">
        {valor}%
      </span>
    </div>
  );
}

export function FlechaDiagonal({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className={className}>
      <path d="M6 14 14 6M7 6h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlechaDerecha({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className={className}>
      <path d="M4 10h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Botón de postulación; si ya se postuló muestra la marca en su lugar.
export function BotonPostular({
  vacanteId,
  postulado,
  volverA,
  texto = "Postularse",
}: {
  vacanteId: string;
  postulado: boolean;
  volverA: string;
  texto?: string;
}) {
  if (postulado) {
    return (
      <span className="inline-flex items-center rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
        Postulado
      </span>
    );
  }
  return (
    <form action={postularseAction}>
      <input type="hidden" name="vacanteId" value={vacanteId} />
      <input type="hidden" name="redirect" value={volverA} />
      <button className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-marca hover:bg-acento-hover">
        {texto}
      </button>
    </form>
  );
}

// Buscador en forma de píldora (cargo + ubicación) que filtra /recomendaciones.
export function BuscadorVacantes({
  q = "",
  ciudad = "",
  total,
}: {
  q?: string;
  ciudad?: string;
  total?: number;
}) {
  return (
    <form
      action="/recomendaciones"
      className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:rounded-full"
    >
      <label className="flex flex-1 items-center gap-2 px-4 py-2">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden className="h-5 w-5 shrink-0 text-slate-400">
          <rect x="3" y="6" width="14" height="10" rx="2" />
          <path d="M7.5 6V4.5h5V6" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">Cargo o profesión</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por cargo o profesión"
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
      </label>
      <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
      <label className="flex flex-1 items-center gap-2 px-4 py-2">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden className="h-5 w-5 shrink-0 text-slate-400">
          <path d="M10 17s5-4.6 5-8.5a5 5 0 0 0-10 0C5 12.4 10 17 10 17Z" strokeLinejoin="round" />
          <circle cx="10" cy="8.5" r="1.8" />
        </svg>
        <span className="sr-only">Ubicación</span>
        <input
          name="ciudad"
          defaultValue={ciudad}
          placeholder="Buscar por ubicación"
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
      </label>
      <button className="flex items-center justify-center gap-2 rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-marca hover:bg-acento-hover">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-4 w-4">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3 3" strokeLinecap="round" />
        </svg>
        {total != null ? `Buscar en ${total} ${total === 1 ? "vacante" : "vacantes"}` : "Buscar empleo"}
      </button>
    </form>
  );
}

const ESTILO_REQUISITO = {
  cumple: "border-acento/40 bg-acento-suave text-acento-texto",
  parcial: "border-amber-200 bg-amber-50 text-amber-800",
  falta: "border-slate-200 bg-white text-slate-500",
} as const;

const MARCA_REQUISITO = { cumple: "Cumple", parcial: "Parcial", falta: "Falta" } as const;

// Requisitos de la vacante evaluados contra el perfil (cumple / parcial / falta).
export function RequisitosVacante({
  requisitos,
}: {
  requisitos: { requisito: string; estado: "cumple" | "parcial" | "falta"; motivo: string }[];
}) {
  if (requisitos.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Requisitos de la vacante">
      {requisitos.map((r) => (
        <li
          key={r.requisito}
          title={r.motivo}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTILO_REQUISITO[r.estado]}`}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${
              r.estado === "cumple" ? "bg-acento" : r.estado === "parcial" ? "bg-amber-500" : "bg-slate-300"
            }`}
          />
          {r.requisito}
          <span className="sr-only">: {MARCA_REQUISITO[r.estado]}. {r.motivo}</span>
        </li>
      ))}
    </ul>
  );
}
