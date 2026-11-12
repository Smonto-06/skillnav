import { describe, expect, it } from "vitest";

import { recorrerCatalogo } from "./catalogo";
import { buildRecommendations, type VacanteInput } from "./recommender";
import type { PerfilScoring } from "./scoring";

const perfil: PerfilScoring = {
  titular: "Desarrollador Full Stack",
  resumen: "Cinco años construyendo aplicaciones web.",
  habilidades: [
    { nombre: "React" },
    { nombre: "TypeScript" },
    { nombre: "PostgreSQL" },
    { nombre: "Trabajo en equipo" },
  ],
  experiencias: [
    {
      cargo: "Desarrollador Full Stack",
      empresa: "Acme",
      inicio: new Date("2019-01-01"),
      fin: null,
      actual: true,
      descripcion: "Aplicaciones web",
    },
  ],
  educacion: [],
  modalidad: "HIBRIDO",
  ciudad: "Medellín",
  salarioMin: 5_000_000,
};

const CIUDADES = ["Medellín", "Bogotá", "Cali", "Barranquilla"];
const MODALIDADES = ["PRESENCIAL", "REMOTO", "HIBRIDO"] as const;

/** Catálogo sintético. Repite títulos y requisitos a propósito, para que haya empates. */
function catalogo(n: number): VacanteInput[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `v${String(i).padStart(6, "0")}`,
    titulo: i % 2 === 0 ? "Desarrollador Full Stack" : "Analista de datos",
    empresa: `Empresa ${i % 7}`,
    descripcion: null,
    requisitos: i % 2 === 0 ? "React, TypeScript, PostgreSQL" : "Python, Pandas",
    experienciaMin: i % 4,
    salario: 4_000_000 + (i % 5) * 1_000_000,
    modalidad: MODALIDADES[i % 3],
    ciudad: CIUDADES[i % 4],
  }));
}

/** Cargador por cursor sobre un arreglo en memoria, igual que hace Prisma con `cursor`. */
function cargadorDe(vacantes: VacanteInput[], espia?: { viajes: number; mayorLote: number }) {
  return async (desde: string | null, tamano: number) => {
    const inicio = desde === null ? 0 : vacantes.findIndex((v) => v.id === desde) + 1;
    const lote = vacantes.slice(inicio, inicio + tamano);
    if (espia) {
      espia.viajes += 1;
      espia.mayorLote = Math.max(espia.mayorLote, lote.length);
    }
    return lote;
  };
}

const AHORA = new Date("2026-11-12T00:00:00Z");

describe("recorrerCatalogo", () => {
  it("devuelve lo mismo que puntuar el catálogo entero de una vez", async () => {
    const vacantes = catalogo(1_000);

    const porLotes = await recorrerCatalogo({
      perfil,
      cargarLote: cargadorDe(vacantes),
      ahora: AHORA,
      limite: vacantes.length,
      tamanoLote: 97, // deliberadamente no divide a 1000: fuerza un lote final corto
    });
    const deUnaVez = buildRecommendations(perfil, vacantes, AHORA);

    expect(porLotes.recomendaciones).toHaveLength(deUnaVez.length);
    expect(porLotes.recomendaciones.map((r) => r.vacante.id)).toEqual(
      deUnaVez.map((r) => r.vacante.id)
    );
    expect(porLotes.recomendaciones.map((r) => r.score)).toEqual(deUnaVez.map((r) => r.score));
  });

  it("con un catálogo pequeño se comporta igual que antes: no recorta nada", async () => {
    const vacantes = catalogo(10);
    const r = await recorrerCatalogo({ perfil, cargarLote: cargadorDe(vacantes), ahora: AHORA });

    expect(r.recomendaciones).toHaveLength(10);
    expect(r.evaluadas).toBe(10);
    expect(r.truncado).toBe(false);
    expect(r.recomendaciones.map((x) => x.vacante.id)).toEqual(
      buildRecommendations(perfil, vacantes, AHORA).map((x) => x.vacante.id)
    );
  });

  it("evalúa un catálogo grande pero nunca tiene más de un lote en memoria", async () => {
    const vacantes = catalogo(20_000);
    const espia = { viajes: 0, mayorLote: 0 };

    const r = await recorrerCatalogo({
      perfil,
      cargarLote: cargadorDe(vacantes, espia),
      ahora: AHORA,
      tamanoLote: 500,
      limite: 100,
    });

    // Se evaluaron todas: ninguna vacante quedó sin puntuar.
    expect(r.evaluadas).toBe(20_000);
    // Pero solo se conservan las mejores.
    expect(r.recomendaciones).toHaveLength(100);
    expect(r.truncado).toBe(true);
    // Ningún viaje trajo más de un lote (el +1 es la sonda de "hay más").
    expect(espia.mayorLote).toBe(501);
    // 20.000 / 500 = 40 viajes exactos, sin uno final desperdiciado.
    expect(espia.viajes).toBe(40);
  });

  it("las mejores 100 son realmente las mejores del catálogo entero", async () => {
    const vacantes = catalogo(5_000);
    const r = await recorrerCatalogo({
      perfil,
      cargarLote: cargadorDe(vacantes),
      ahora: AHORA,
      limite: 100,
    });

    const esperadas = buildRecommendations(perfil, vacantes, AHORA).slice(0, 100);
    expect(r.recomendaciones.map((x) => x.vacante.id)).toEqual(
      esperadas.map((x) => x.vacante.id)
    );
  });

  it("el orden es estable entre llamadas: los empates no bailan", async () => {
    const vacantes = catalogo(3_000);
    const a = await recorrerCatalogo({
      perfil,
      cargarLote: cargadorDe(vacantes),
      ahora: AHORA,
      tamanoLote: 500,
    });
    const b = await recorrerCatalogo({
      perfil,
      cargarLote: cargadorDe(vacantes),
      ahora: AHORA,
      tamanoLote: 137,
    });

    expect(a.recomendaciones.map((x) => x.vacante.id)).toEqual(
      b.recomendaciones.map((x) => x.vacante.id)
    );
  });

  it("aplica el filtro del lote y solo puntúa lo que pasa", async () => {
    const vacantes = catalogo(1_000);
    const r = await recorrerCatalogo({
      perfil,
      cargarLote: cargadorDe(vacantes),
      ahora: AHORA,
      limite: 1_000,
      filtrarLote: (lote) => lote.filter((v) => v.ciudad === "Medellín"),
    });

    expect(r.evaluadas).toBe(250);
    expect(r.recomendaciones.every((x) => x.vacante.ciudad === "Medellín")).toBe(true);
  });

  it("con el catálogo vacío no falla ni inventa resultados", async () => {
    const r = await recorrerCatalogo({ perfil, cargarLote: cargadorDe([]), ahora: AHORA });

    expect(r.recomendaciones).toEqual([]);
    expect(r.evaluadas).toBe(0);
    expect(r.lotes).toBe(0);
    expect(r.truncado).toBe(false);
  });

  it("si el filtro descarta todo, devuelve vacío sin romperse", async () => {
    const vacantes = catalogo(600);
    const r = await recorrerCatalogo({
      perfil,
      cargarLote: cargadorDe(vacantes),
      ahora: AHORA,
      filtrarLote: () => [],
    });

    expect(r.recomendaciones).toEqual([]);
    expect(r.evaluadas).toBe(0);
    expect(r.truncado).toBe(false);
  });

  it("un catálogo que es múltiplo exacto del lote no pide un lote de más", async () => {
    const vacantes = catalogo(1_000);
    const espia = { viajes: 0, mayorLote: 0 };
    await recorrerCatalogo({
      perfil,
      cargarLote: cargadorDe(vacantes, espia),
      ahora: AHORA,
      tamanoLote: 500,
    });

    // 1000 / 500 = 2 viajes exactos. Sin la sonda de "hay más" haría un tercer
    // viaje vacío, desperdiciado, en cada visita a la página.
    expect(espia.viajes).toBe(2);
  });

  it("rechaza parámetros que no tienen sentido en lugar de comportarse raro", async () => {
    await expect(
      recorrerCatalogo({ perfil, cargarLote: cargadorDe([]), tamanoLote: 0 })
    ).rejects.toThrow(/tamaño de lote/i);
    await expect(
      recorrerCatalogo({ perfil, cargarLote: cargadorDe([]), limite: -1 })
    ).rejects.toThrow(/límite/i);
  });
});
