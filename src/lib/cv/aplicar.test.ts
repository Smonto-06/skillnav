import { describe, it, expect } from "vitest";
import {
  construirDatosAplicables,
  fechaDeAnio,
  resumenAplicacion,
  seleccionDesdeFormulario,
} from "./aplicar";
import { ParserCV } from "./parser";

const CV = `Laura Gomez Restrepo
Desarrolladora Full Stack
laura@ejemplo.com

EXPERIENCIA LABORAL
Backend Developer - Bancolombia (2023 - actual)
Frontend Developer - Magneto (2021 - 2023)

EDUCACION
Ingenieria de Sistemas - Universidad EAFIT (2021)

HABILIDADES
React, TypeScript, PostgreSQL`;

const borrador = new ParserCV().parse(CV);

const seleccionVacia = {
  habilidades: [] as string[],
  experiencias: [] as number[],
  educacion: [] as number[],
};

describe("fechaDeAnio", () => {
  it("convierte un anio a 1 de enero en UTC, sin inventar mes ni dia", () => {
    const f = fechaDeAnio(2023)!;
    expect(f.toISOString()).toBe("2023-01-01T00:00:00.000Z");
  });

  it("devuelve undefined si no hay anio", () => {
    expect(fechaDeAnio(undefined)).toBeUndefined();
  });

  it("rechaza anios imposibles en vez de guardar basura", () => {
    expect(fechaDeAnio(12)).toBeUndefined();
    expect(fechaDeAnio(3500)).toBeUndefined();
    expect(fechaDeAnio(2023.5)).toBeUndefined();
  });
});

describe("construirDatosAplicables · solo guarda lo confirmado", () => {
  it("no guarda nada si el candidato no confirmo nada", () => {
    const d = construirDatosAplicables(borrador, seleccionVacia);
    expect(d.candidato).toEqual({});
    expect(d.habilidades).toHaveLength(0);
    expect(d.experiencias).toHaveLength(0);
    expect(d.educacion).toHaveLength(0);
  });

  it("guarda solo las experiencias cuyos indices fueron marcados", () => {
    const d = construirDatosAplicables(borrador, { ...seleccionVacia, experiencias: [1] });
    expect(d.experiencias).toHaveLength(1);
    expect(d.experiencias[0].cargo).toBe("Frontend Developer");
  });

  it("ignora un indice que no existe en vez de fallar", () => {
    const d = construirDatosAplicables(borrador, { ...seleccionVacia, experiencias: [0, 99] });
    expect(d.experiencias).toHaveLength(1);
  });

  it("descarta habilidades que el parser nunca detecto en el CV", () => {
    // Defensa contra un formulario manipulado: aunque llegue "Cobol",
    // no estaba en el CV y no se guarda.
    const d = construirDatosAplicables(borrador, {
      ...seleccionVacia,
      habilidades: ["React", "Cobol"],
    });
    expect(d.habilidades.map((h) => h.nombre)).toEqual(["React"]);
  });

  it("no duplica una habilidad enviada dos veces", () => {
    const d = construirDatosAplicables(borrador, {
      ...seleccionVacia,
      habilidades: ["React", "React"],
    });
    expect(d.habilidades).toHaveLength(1);
  });

  it("ignora los campos simples que quedaron en blanco", () => {
    const d = construirDatosAplicables(borrador, {
      ...seleccionVacia,
      nombre: "   ",
      titular: "Desarrolladora Full Stack",
    });
    expect(d.candidato.nombre).toBeUndefined();
    expect(d.candidato.titular).toBe("Desarrolladora Full Stack");
  });

  it("respeta el texto que el candidato corrigio a mano", () => {
    const d = construirDatosAplicables(borrador, {
      ...seleccionVacia,
      nombre: "Laura Gómez Restrepo",
    });
    // Con tilde: el parser no la trajo asi, el candidato la corrigio.
    expect(d.candidato.nombre).toBe("Laura Gómez Restrepo");
  });
});

describe("construirDatosAplicables · adaptacion a Prisma", () => {
  it("convierte el periodo del CV en fechas y marca el cargo actual", () => {
    const d = construirDatosAplicables(borrador, { ...seleccionVacia, experiencias: [0, 1] });
    const [actual, pasada] = d.experiencias;
    expect(actual.actual).toBe(true);
    expect(actual.fechaInicio?.getUTCFullYear()).toBe(2023);
    // Un cargo actual no lleva fecha de fin.
    expect(actual.fechaFin).toBeUndefined();
    expect(pasada.actual).toBe(false);
    expect(pasada.fechaFin?.getUTCFullYear()).toBe(2023);
  });

  it("marca la empresa ausente de forma explicita, no con cadena vacia", () => {
    const sinEmpresa = {
      ...borrador,
      experiencias: {
        ...borrador.experiencias,
        valor: [{ cargo: "Freelance", actual: false, anioInicio: 2020, anioFin: 2021 }],
      },
    };
    const d = construirDatosAplicables(sinEmpresa, { ...seleccionVacia, experiencias: [0] });
    expect(d.experiencias[0].empresa).toBe("(sin especificar)");
  });

  it("descarta una entrada sin cargo", () => {
    const sinCargo = {
      ...borrador,
      experiencias: { ...borrador.experiencias, valor: [{ cargo: "  ", actual: false }] },
    };
    const d = construirDatosAplicables(sinCargo, { ...seleccionVacia, experiencias: [0] });
    expect(d.experiencias).toHaveLength(0);
  });

  it("adapta la educacion con titulo, institucion y anio", () => {
    const d = construirDatosAplicables(borrador, { ...seleccionVacia, educacion: [0] });
    expect(d.educacion[0]).toEqual({
      titulo: "Ingenieria de Sistemas",
      institucion: "Universidad EAFIT",
      anio: 2021,
    });
  });
});

describe("seleccionDesdeFormulario", () => {
  const form = (datos: Record<string, string[]>) => ({
    get: (n: string) => datos[n]?.[0],
    getAll: (n: string) => datos[n] ?? [],
  });

  it("lee los campos de texto y las listas marcadas", () => {
    const s = seleccionDesdeFormulario(
      form({
        nombre: ["Laura"],
        habilidades: ["React", "TypeScript"],
        experiencias: ["0", "2"],
        educacion: ["1"],
      })
    );
    expect(s.nombre).toBe("Laura");
    expect(s.habilidades).toEqual(["React", "TypeScript"]);
    expect(s.experiencias).toEqual([0, 2]);
    expect(s.educacion).toEqual([1]);
  });

  it("descarta indices que no son numeros", () => {
    const s = seleccionDesdeFormulario(form({ experiencias: ["0", "abc", "-1"] }));
    expect(s.experiencias).toEqual([0]);
  });

  it("devuelve listas vacias cuando no se marco nada", () => {
    const s = seleccionDesdeFormulario(form({}));
    expect(s.habilidades).toEqual([]);
    expect(s.experiencias).toEqual([]);
    expect(s.nombre).toBeUndefined();
  });
});

describe("resumenAplicacion", () => {
  it("describe lo que se guardo", () => {
    const d = construirDatosAplicables(borrador, {
      ...seleccionVacia,
      nombre: "Laura",
      habilidades: ["React"],
      experiencias: [0],
      educacion: [0],
    });
    const r = resumenAplicacion(d);
    expect(r).toContain("1 dato(s) del perfil");
    expect(r).toContain("1 habilidad(es)");
    expect(r).toContain("1 experiencia(s)");
    expect(r).toContain("1 estudio(s)");
  });

  it("lo dice claro cuando no se guardo nada", () => {
    expect(resumenAplicacion(construirDatosAplicables(borrador, seleccionVacia))).toBe(
      "No se guardó nada."
    );
  });
});
