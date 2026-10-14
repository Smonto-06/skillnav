// Cálculo de tiempo de experiencia a partir de las fechas de cada cargo.
// Funciones puras: reciben "ahora" como parámetro para ser deterministas en pruebas.

export interface Periodo {
  inicio?: Date | null;
  fin?: Date | null;
  actual?: boolean;
}

const MS_ANIO = 365.25 * 24 * 60 * 60 * 1000;

// Años de un periodo (0 si no tiene fecha de inicio o las fechas son inválidas).
export function aniosDe(p: Periodo, ahora = new Date()): number {
  if (!p.inicio) return 0;
  const fin = p.actual || !p.fin ? ahora : p.fin;
  return Math.max(0, (fin.getTime() - p.inicio.getTime()) / MS_ANIO);
}

// Años totales sin contar dos veces los periodos que se solapan
// (dos trabajos simultáneos no suman el doble de experiencia).
export function aniosTotales(periodos: Periodo[], ahora = new Date()): number {
  const tramos = periodos
    .filter((p) => p.inicio)
    .map((p) => [p.inicio!.getTime(), (p.actual || !p.fin ? ahora : p.fin).getTime()] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let [ini, fin] = [0, -Infinity];
  for (const [a, b] of tramos) {
    if (a > fin) {
      if (fin > ini) total += fin - ini;
      [ini, fin] = [a, b];
    } else fin = Math.max(fin, b);
  }
  if (fin > ini) total += fin - ini;
  return total / MS_ANIO;
}

// "2 años y 3 meses", "8 meses", "Menos de un mes".
export function formatoDuracion(anios: number): string {
  const meses = Math.round(anios * 12);
  if (meses < 1) return "Menos de un mes";
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  const partes = [];
  if (a) partes.push(`${a} ${a === 1 ? "año" : "años"}`);
  if (m) partes.push(`${m} ${m === 1 ? "mes" : "meses"}`);
  return partes.join(" y ");
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "ene 2022 – actualidad"
export function formatoPeriodo(p: Periodo): string | null {
  if (!p.inicio) return null;
  const f = (d: Date) => `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return `${f(p.inicio)} – ${p.actual || !p.fin ? "actualidad" : f(p.fin)}`;
}

// "2024-03" (valor de <input type="month">) -> Date UTC del día 1, o null.
export function desdeMes(valor: FormDataEntryValue | null): Date | null {
  const s = (valor ?? "").toString();
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  const [anio, mes] = s.split("-").map(Number);
  if (mes < 1 || mes > 12) return null;
  return new Date(Date.UTC(anio, mes - 1, 1));
}

// Date -> "2024-03" para precargar <input type="month">.
export function aMes(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
