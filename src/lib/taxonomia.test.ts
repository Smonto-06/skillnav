import { describe, expect, it } from "vitest";
import {
  areasDeCargo,
  areasDeRequisito,
  clave,
  cubiertas,
  detectarRoles,
  habilidadesMencionadas,
  resolverHabilidad,
  rolesDeCargo,
} from "./taxonomia";

describe("taxonomia", () => {
  it("clave unifica variantes de escritura", () => {
    expect(clave("Node.js")).toBe(clave("node js"));
    expect(clave("Full-Stack")).toBe("fullstack");
  });

  it("resuelve sinónimos al nombre del catálogo", () => {
    expect(resolverHabilidad("nodejs")?.nombre).toBe("Node.js");
    expect(resolverHabilidad("Postgres")?.nombre).toBe("PostgreSQL");
    expect(resolverHabilidad("C#")?.nombre).toBe("C#");
    expect(resolverHabilidad("Bases de datos")?.nombre).toBe("SQL");
  });

  it("las implicaciones son transitivas (Next.js -> React -> JavaScript)", () => {
    expect(cubiertas("nextjs").has("javascript")).toBe(true);
  });

  it("detecta el rol en un titular y prioriza el específico sobre el genérico", () => {
    expect(detectarRoles("Desarrollador Full Stack Senior").map((r) => r.nombre)).toEqual(["Full Stack"]);
    expect(detectarRoles("Ingeniero de Software")[0].generico).toBe(true);
  });

  it("no confunde palabras que contienen alias cortos", () => {
    expect(detectarRoles("Analista de servicios")).toEqual([]);
    expect(detectarRoles("Desarrollador iOS")[0].nombre).toBe("Móvil");
  });

  it("no confunde palabras que contienen alias largos", () => {
    // Esta era la rama sin cubrir. Los alias de 5 o más caracteres se buscaban
    // como subcadena, así que "automóviles" activaba el rol Móvil y un
    // vendedor sacaba 95% contra una vacante de desarrollo móvil.
    expect(detectarRoles("Vendedor de automóviles")).toEqual([]);
    expect(detectarRoles("Mecánico de automóviles")).toEqual([]);
    expect(detectarRoles("Analista de confrontación de saldos")).toEqual([]);
  });

  it("sigue reconociendo los alias de varias palabras", () => {
    // El alias vive en el catálogo sin espacios ("desarrolladordeapis"), así
    // que tiene que coincidir con una secuencia de palabras contiguas.
    expect(detectarRoles("Desarrollador de APIs")[0].nombre).toBe("Backend");
    expect(detectarRoles("Desarrollador Móvil")[0].nombre).toBe("Móvil");
    expect(detectarRoles("Administrador de Bases de Datos").length).toBeGreaterThan(0);
  });

  it("reconoce requisitos genéricos de área", () => {
    expect(areasDeRequisito("Experiencia en backend")).toEqual(["backend"]);
  });

  it("ubica un cargo por la tecnología que nombra", () => {
    expect(areasDeCargo("Desarrollador Java")).toEqual(["backend"]);
    expect(areasDeCargo("Desarrollador React")).toEqual(["frontend"]);
    expect(rolesDeCargo("Desarrollador Web")[0].generico).toBe(true);
    expect(areasDeCargo("DBA Senior")).toEqual(["datos", "backend"]);
  });

  it("encuentra tecnologías dentro de una frase", () => {
    expect(habilidadesMencionadas("Experiencia con React y Node.js").map((s) => s.nombre)).toEqual([
      "React",
      "Node.js",
    ]);
    expect(habilidadesMencionadas("Soy una persona ágil y excelente")).toEqual([]);
  });
});
