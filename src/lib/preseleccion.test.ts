import { describe, expect, it } from "vitest";

import {
  CANDIDATAS_OBJETIVO,
  UMBRAL_PRESELECCION,
  condicionDePreseleccion,
  condicionesDeCatalogo,
  convienePreseleccionar,
  terminosDeBusqueda,
} from "./preseleccion";

const perfil = {
  titular: "Desarrollador Full Stack Senior",
  habilidades: [{ nombre: "React" }, { nombre: "TypeScript" }, { nombre: "PostgreSQL" }],
  experiencias: [{ cargo: "Analista de datos" }],
};

describe("terminosDeBusqueda", () => {
  it("incluye las habilidades del candidato", () => {
    const t = terminosDeBusqueda(perfil);
    expect(t).toContain("react");
    expect(t).toContain("typescript");
    expect(t).toContain("postgresql");
  });

  it("incluye las palabras del cargo y de la experiencia", () => {
    const t = terminosDeBusqueda(perfil);
    expect(t).toContain("desarrollador");
    expect(t).toContain("full");
    expect(t).toContain("stack");
    expect(t).toContain("analista");
    expect(t).toContain("datos");
  });

  it("descarta palabras de relleno que traerían el catálogo entero", () => {
    const t = terminosDeBusqueda(perfil);
    // "de" viene de "Analista de datos" y "senior" de "Full Stack Senior".
    // Buscar cualquiera de las dos haría que la preselección no filtre nada.
    expect(t).not.toContain("de");
    expect(t).not.toContain("senior");
  });

  it("no repite un término que aparece en la habilidad y en el cargo", () => {
    const t = terminosDeBusqueda({
      titular: "Desarrollador React",
      habilidades: [{ nombre: "React" }],
      experiencias: [],
    });
    expect(t.filter((x) => x === "react")).toHaveLength(1);
  });

  it("conserva habilidades con símbolos, que son nombres reales de tecnologías", () => {
    const t = terminosDeBusqueda({
      titular: null,
      habilidades: [{ nombre: "C++" }, { nombre: "C#" }, { nombre: "Node.js" }],
      experiencias: [],
    });
    expect(t).toContain("c++");
    expect(t).toContain("c#");
    expect(t).toContain("node.js");
  });

  it("con un perfil vacío devuelve lista vacía en vez de fallar", () => {
    expect(terminosDeBusqueda({})).toEqual([]);
    expect(terminosDeBusqueda({ titular: null, habilidades: [], experiencias: [] })).toEqual([]);
  });
});

describe("condicionDePreseleccion", () => {
  it("busca cada término en requisitos y en título", () => {
    const c = condicionDePreseleccion({
      titular: null,
      habilidades: [{ nombre: "React" }],
      experiencias: [],
    });
    expect(c).toEqual({
      OR: [
        { requisitos: { contains: "react", mode: "insensitive" } },
        { titulo: { contains: "react", mode: "insensitive" } },
      ],
    });
  });

  it("acota la cantidad de términos: una condición enorme sería más cara que no filtrar", () => {
    const muchas = Array.from({ length: 80 }, (_, i) => ({ nombre: `habilidad${i}` }));
    const c = condicionDePreseleccion({ habilidades: muchas }, 25);
    expect(c!.OR).toHaveLength(50); // 25 términos x 2 campos
  });

  it("devuelve null cuando no hay con qué preseleccionar", () => {
    // Un perfil recién creado. Quien llama debe recorrer sin filtrar: dejarlo
    // sin vacantes sería peor que puntuar de más.
    expect(condicionDePreseleccion({})).toBeNull();
  });
});

describe("condicionesDeCatalogo", () => {
  const preseleccion = { OR: [{ titulo: { contains: "react" } }] };

  it("sin preselección ni filtros no impone ninguna condición", () => {
    expect(condicionesDeCatalogo(null, {})).toEqual([]);
  });

  it("mantiene separadas las tres condiciones que usan la clave OR", () => {
    // Es la razón de ser de esta función: puestas como claves de un mismo
    // objeto, la última dejaría sin efecto a las dos anteriores.
    const c = condicionesDeCatalogo(preseleccion, { modalidad: "REMOTO", salarioMin: 5_000_000 });

    expect(c).toHaveLength(3);
    expect(c).toContainEqual(preseleccion);
    expect(c).toContainEqual({ OR: [{ modalidad: null }, { modalidad: "REMOTO" }] });
    expect(c).toContainEqual({
      OR: [{ salario: null }, { salario: { gte: 5_000_000 } }],
    });
  });

  it("normaliza la modalidad a mayúsculas, como el enum de la base", () => {
    const c = condicionesDeCatalogo(null, { modalidad: " hibrido " });
    expect(c).toEqual([{ OR: [{ modalidad: null }, { modalidad: "HIBRIDO" }] }]);
  });

  it("una vacante sin modalidad declarada no se descarta", () => {
    const [cond] = condicionesDeCatalogo(null, { modalidad: "REMOTO" }) as {
      OR: { modalidad: string | null }[];
    }[];
    expect(cond.OR).toContainEqual({ modalidad: null });
  });

  it("una vacante sin salario no se descarta: no se puede afirmar que pague menos", () => {
    const [cond] = condicionesDeCatalogo(null, { salarioMin: 9_000_000 }) as {
      OR: unknown[];
    }[];
    expect(cond.OR).toContainEqual({ salario: null });
  });

  it("una modalidad en blanco no cuenta como filtro", () => {
    expect(condicionesDeCatalogo(null, { modalidad: "   " })).toEqual([]);
  });

  it("un salario mínimo de cero sí cuenta: es distinto de no filtrar", () => {
    expect(condicionesDeCatalogo(null, { salarioMin: 0 })).toHaveLength(1);
  });
});

describe("convienePreseleccionar", () => {
  it("con el catálogo actual no se activa: el comportamiento de hoy no cambia", () => {
    expect(convienePreseleccionar(10)).toBe(false);
    expect(convienePreseleccionar(500)).toBe(false);
    expect(convienePreseleccionar(UMBRAL_PRESELECCION)).toBe(false);
  });

  it("se activa cuando el catálogo crece", () => {
    expect(convienePreseleccionar(UMBRAL_PRESELECCION + 1)).toBe(true);
    expect(convienePreseleccionar(50_000)).toBe(true);
  });

  it("el objetivo de candidatas deja margen sobre las que se muestran", () => {
    // Se proponen muchas más de las que se devuelven, para que el orden final
    // lo decida el motor y no la etapa barata.
    expect(CANDIDATAS_OBJETIVO).toBeGreaterThan(100);
  });
});
