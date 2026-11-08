import { describe, it, expect } from "vitest";
import { aplanar, blandasMencionadas, idiomasMencionados } from "./blandas";

describe("aplanar", () => {
  it("quita tildes y baja a minusculas", () => {
    expect(aplanar("Comunicación Efectiva")).toBe("comunicacion efectiva");
  });

  // Esta es la razon de existir de aplanar: clave() de taxonomia borra los
  // espacios ("trabajo en equipo" -> "trabajoenequipo") y destruye los limites
  // de palabra, asi que ninguna frase podia volver a encontrarse.
  it("conserva la separacion entre palabras", () => {
    expect(aplanar("Trabajo en Equipo")).toBe("trabajo en equipo");
  });

  it("convierte cualquier separador en un solo espacio", () => {
    expect(aplanar("Liderazgo,  Comunicación · Ventas")).toBe("liderazgo comunicacion ventas");
  });
});

describe("blandasMencionadas", () => {
  it("encuentra habilidades de varias palabras", () => {
    const r = blandasMencionadas("Trabajo en equipo, Toma de decisiones y Gestión del tiempo");
    expect(r).toContain("Trabajo en equipo");
    expect(r).toContain("Toma de decisiones");
    expect(r).toContain("Gestión del tiempo");
  });

  it("encuentra por alias", () => {
    expect(blandasMencionadas("Soy muy proactivo")).toContain("Proactividad");
    expect(blandasMencionadas("manejo de caja registradora")).toContain("Manejo de caja");
    expect(blandasMencionadas("servicio al cliente")).toContain("Atención al cliente");
  });

  it("funciona con o sin tildes", () => {
    expect(blandasMencionadas("comunicacion")).toContain("Comunicación");
    expect(blandasMencionadas("Comunicación")).toContain("Comunicación");
  });

  it("respeta los limites de palabra", () => {
    // "ventas" no debe dispararse dentro de "inventario".
    expect(blandasMencionadas("manejo de inventario")).not.toContain("Ventas");
  });

  it("no repite una habilidad nombrada dos veces", () => {
    const r = blandasMencionadas("Liderazgo. Liderazgo de equipos. liderazgo");
    expect(r.filter((h) => h === "Liderazgo")).toHaveLength(1);
  });

  it("devuelve vacio en un texto sin habilidades blandas", () => {
    expect(blandasMencionadas("React PostgreSQL Docker")).toEqual([]);
  });
});

describe("idiomasMencionados", () => {
  it("detecta idiomas escritos seguidos, como en los CV", () => {
    const r = idiomasMencionados("Español Inglés");
    expect(r).toEqual(["Español", "Inglés"]);
  });

  it("detecta por alias en ingles", () => {
    expect(idiomasMencionados("English and Spanish")).toEqual(["Español", "Inglés"]);
  });
});
