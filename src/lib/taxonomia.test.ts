import { describe, expect, it } from "vitest";
import { areasDeRequisito, clave, cubiertas, detectarRoles, resolverHabilidad } from "./taxonomia";

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

  it("reconoce requisitos genéricos de área", () => {
    expect(areasDeRequisito("Experiencia en backend")).toEqual(["backend"]);
  });
});
