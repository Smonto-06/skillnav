import { describe, it, expect } from "vitest";
import { vacanteSchema } from "./validation";

// HU-26 · contrato de datos del formulario de vacantes del panel admin.
describe("vacanteSchema", () => {
  const minimo = { titulo: "Backend Developer", empresa: "Bancolombia" };

  it("acepta una vacante con solo título y empresa", () => {
    const r = vacanteSchema.safeParse(minimo);
    expect(r.success).toBe(true);
  });

  it("exige título y empresa", () => {
    expect(vacanteSchema.safeParse({ titulo: "ab", empresa: "Bancolombia" }).success).toBe(false);
    expect(vacanteSchema.safeParse({ titulo: "Backend Developer", empresa: "B" }).success).toBe(
      false
    );
  });

  it("convierte los números que llegan como texto del formulario", () => {
    const r = vacanteSchema.safeParse({ ...minimo, salario: "4500", experienciaMin: "3" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.salario).toBe(4500);
      expect(r.data.experienciaMin).toBe(3);
    }
  });

  it("rechaza salario y experiencia negativos", () => {
    expect(vacanteSchema.safeParse({ ...minimo, salario: "-100" }).success).toBe(false);
    expect(vacanteSchema.safeParse({ ...minimo, experienciaMin: "-1" }).success).toBe(false);
  });

  it("trata la modalidad vacía como ausente, no como error", () => {
    const r = vacanteSchema.safeParse({ ...minimo, modalidad: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.modalidad).toBeUndefined();
  });

  it("rechaza una modalidad que no existe", () => {
    expect(vacanteSchema.safeParse({ ...minimo, modalidad: "TELETRABAJO" }).success).toBe(false);
  });

  it("recorta los espacios del título y la empresa", () => {
    const r = vacanteSchema.safeParse({ titulo: "  Data Analyst  ", empresa: "  Rappi  " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.titulo).toBe("Data Analyst");
      expect(r.data.empresa).toBe("Rappi");
    }
  });
});
