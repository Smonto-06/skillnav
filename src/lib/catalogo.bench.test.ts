// Medición del costo de puntuar, para saber dónde está el límite real.
//
// No prueba una regla de negocio: mide. Está como prueba para que el número se
// pueda volver a sacar en cualquier máquina en lugar de quedar en una
// afirmación de un documento. Las aserciones son holgadas a propósito: lo que
// se quiere detectar es un cambio de orden de magnitud, no una fluctuación.
import { describe, expect, it } from "vitest";

import { buildRecommendations, type VacanteInput } from "./recommender";
import type { PerfilScoring } from "./scoring";

const perfil: PerfilScoring = {
  titular: "Desarrollador Full Stack",
  resumen: "Cinco años construyendo aplicaciones web.",
  habilidades: [{ nombre: "React" }, { nombre: "TypeScript" }, { nombre: "PostgreSQL" }],
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

function catalogo(n: number): VacanteInput[] {
  const ciudades = ["Medellín", "Bogotá", "Cali"];
  const modalidades = ["PRESENCIAL", "REMOTO", "HIBRIDO"] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `v${i}`,
    titulo: i % 2 === 0 ? "Desarrollador Full Stack" : "Analista de datos",
    empresa: `Empresa ${i % 7}`,
    descripcion: null,
    requisitos: "React, TypeScript, PostgreSQL, Node, Docker",
    experienciaMin: i % 4,
    salario: 4_000_000 + (i % 5) * 1_000_000,
    modalidad: modalidades[i % 3],
    ciudad: ciudades[i % 3],
  }));
}

describe("costo de puntuar", () => {
  it("el costo por vacante se mantiene en el orden de magnitud conocido", () => {
    const n = 2_000;
    const vacantes = catalogo(n);
    const ahora = new Date("2026-11-12T00:00:00Z");

    buildRecommendations(perfil, vacantes.slice(0, 100), ahora); // calentar

    const t0 = performance.now();
    buildRecommendations(perfil, vacantes, ahora);
    const msPorVacante = (performance.now() - t0) / n;

    // Medido en el equipo de desarrollo: alrededor de 0,8 ms por vacante. El
    // límite generoso detecta una regresión de orden de magnitud sin volverse
    // inestable en una máquina lenta o en integración continua.
    expect(msPorVacante).toBeGreaterThan(0);
    expect(msPorVacante).toBeLessThan(10);

    // Lo que este número implica, y que motiva el recorrido por lotes con tope:
    // puntuar un catálogo entero de 50.000 vacantes en cada visita costaría
    // decenas de segundos. El tope no es una comodidad, es lo que hace que la
    // página siga respondiendo cuando el catálogo crece.
    const segundosPara50k = (msPorVacante * 50_000) / 1_000;
    expect(segundosPara50k).toBeGreaterThan(1);
  });
});
