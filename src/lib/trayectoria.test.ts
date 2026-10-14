import { describe, expect, it } from "vitest";
import { aMes, aniosTotales, desdeMes, formatoDuracion, formatoPeriodo } from "./trayectoria";

const d = (s: string) => new Date(`${s}-01T00:00:00Z`);

describe("trayectoria", () => {
  it("no cuenta dos veces los periodos que se solapan", () => {
    const total = aniosTotales([
      { inicio: d("2020-01"), fin: d("2022-01") },
      { inicio: d("2021-01"), fin: d("2023-01") },
    ]);
    expect(total).toBeCloseTo(3, 1);
  });

  it("el cargo actual cuenta hasta hoy", () => {
    expect(aniosTotales([{ inicio: d("2024-01"), actual: true }], d("2026-01"))).toBeCloseTo(2, 1);
  });

  it("formatea duración y periodo", () => {
    expect(formatoDuracion(2.25)).toBe("2 años y 3 meses");
    expect(formatoDuracion(0.5)).toBe("6 meses");
    expect(formatoPeriodo({ inicio: d("2022-01"), actual: true })).toBe("ene 2022 – actualidad");
  });

  it("convierte desde y hacia <input type=month>", () => {
    expect(aMes(desdeMes("2024-03"))).toBe("2024-03");
    expect(desdeMes("")).toBeNull();
    expect(desdeMes("2024-13")).toBeNull();
  });
});
