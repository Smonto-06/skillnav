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
          className="stroke-slate-500"
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
      <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        {texto}
      </button>
    </form>
  );
}
