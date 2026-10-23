import { describe, it, expect } from "vitest";
import { vacanteDesdeFormulario } from "./vacante";

// HU-26 · lo que el formulario del panel admin realmente le entrega a Prisma.
describe("vacanteDesdeFormulario", () => {
  const minimo = { titulo: "Backend Developer", empresa: "Bancolombia" };

  it("guarda null (no cadena vacía) en los campos que el admin dejó en blanco", () => {
    const r = vacanteDesdeFormulario({
      ...minimo,
      descripcion: "",
      requisitos: "",
      ciudad: "",
      modalidad: "",
      salario: "",
      experienciaMin: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toEqual({
      titulo: "Backend Developer",
      empresa: "Bancolombia",
      descripcion: null,
      requisitos: null,
      experienciaMin: null,
      salario: null,
      modalidad: null,
      ciudad: null,
    });
  });

  it("no convierte un salario vacío en 0", () => {
    const r = vacanteDesdeFormulario({ ...minimo, salario: "", experienciaMin: "" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.salario).toBeNull();
    expect(r.data.experienciaMin).toBeNull();
  });

  it("sí acepta un salario de 0 escrito explícitamente", () => {
    const r = vacanteDesdeFormulario({ ...minimo, experienciaMin: "0" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // "0" es un dato declarado: la vacante no pide experiencia previa.
    expect(r.data.experienciaMin).toBe(0);
  });

  it("convierte los números que llegan como texto", () => {
    const r = vacanteDesdeFormulario({ ...minimo, salario: "4200", experienciaMin: "2" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.salario).toBe(4200);
    expect(r.data.experienciaMin).toBe(2);
  });

  it("conserva la modalidad válida", () => {
    const r = vacanteDesdeFormulario({ ...minimo, modalidad: "HIBRIDO" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.modalidad).toBe("HIBRIDO");
  });

  it("devuelve un mensaje de error legible cuando falta el título", () => {
    const r = vacanteDesdeFormulario({ titulo: "", empresa: "Bancolombia" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/título/i);
  });

  it("rechaza una modalidad inventada", () => {
    const r = vacanteDesdeFormulario({ ...minimo, modalidad: "TELETRABAJO" });
    expect(r.ok).toBe(false);
  });

  it("rechaza un salario negativo", () => {
    const r = vacanteDesdeFormulario({ ...minimo, salario: "-500" });
    expect(r.ok).toBe(false);
  });

  it("recorta espacios sobrantes", () => {
    const r = vacanteDesdeFormulario({ titulo: "  Data Analyst ", empresa: " Rappi " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.titulo).toBe("Data Analyst");
    expect(r.data.empresa).toBe("Rappi");
  });
});
