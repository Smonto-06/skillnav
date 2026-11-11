import { describe, it, expect } from "vitest";
import { ContextoCV, ParserCV, resumenExtraccion } from "./parser";
import { nombrePorMayusculas, telefonoDe } from "./parser";
import { CV_DOS_COLUMNAS } from "./cv-dos-columnas.fixture";

/**
 * Caso real reportado por el board: hoja de vida a dos columnas exportada a
 * PDF. pdf.js devuelve el texto en orden de dibujo, no de lectura, asi que
 * encabezados y contenido quedan entremezclados.
 *
 * Este es el texto literal que devolvio el extractor con ese PDF. Antes de los
 * arreglos el parser tomaba el nombre de una referencia, la cedula como
 * telefono, cero habilidades, cero experiencias y 15 "estudios" que en realidad
 * eran frases del "sobre mi".
 */


const p = new ParserCV().parse(CV_DOS_COLUMNAS);

describe("deteccion de layout a varias columnas", () => {
  it("reconoce que el reparto por secciones no es fiable", () => {
    const ctx = new ContextoCV(CV_DOS_COLUMNAS);
    expect(ctx.layoutMezclado).toBe(true);
  });

  it("lo reporta en el borrador para poder avisarle al candidato", () => {
    expect(p.layoutMezclado).toBe(true);
  });

  it("un CV de una columna sigue considerandose fiable", () => {
    const ctx = new ContextoCV(
      `Laura Gomez
laura@ejemplo.com

EXPERIENCIA LABORAL
Backend Developer - Bancolombia (2023 - actual)

EDUCACION
Ingenieria de Sistemas - Universidad EAFIT (2021)

HABILIDADES
React, TypeScript`
    );
    expect(ctx.layoutMezclado).toBe(false);
  });
});

describe("nombrePorMayusculas", () => {
  it("une el nombre partido en lineas de una palabra en mayusculas", () => {
    expect(nombrePorMayusculas(["SAMUEL", "MONTOYA", "ESPINOSA"])).toBe(
      "SAMUEL MONTOYA ESPINOSA"
    );
  });

  it("no toma una sola palabra en mayusculas, que suele ser un encabezado", () => {
    expect(nombrePorMayusculas(["LOGROS", "texto normal"])).toBeNull();
  });

  it("no toma encabezados conocidos aunque esten seguidos", () => {
    expect(nombrePorMayusculas(["EXPERIENCIA", "HABILIDADES", "EDUCACIÓN"])).toBeNull();
  });
});

describe("telefonoDe", () => {
  it("descarta la cedula y toma el celular", () => {
    const r = telefonoDe(["CC. 1017928708", "315 645 8363"]);
    expect(r?.valor).toBe("315 645 8363");
  });

  it("ignora un numero anunciado como NIT o documento", () => {
    expect(telefonoDe(["NIT 900123456", "Documento: 1017928708"])).toBeNull();
  });

  it("acepta un celular con indicativo +57", () => {
    expect(telefonoDe(["+57 301 234 5678"])?.valor).toContain("301");
  });
});

// Regresion del caso completo: estos cuatro fallos son los que reporto el board.
describe("CV a dos columnas · lo que fallaba antes", () => {
  it("toma el nombre del candidato y no el de una referencia", () => {
    expect(p.nombre?.valor).toBe("Samuel Montoya Espinosa");
    expect(p.nombre?.valor).not.toContain("Paula");
  });

  it("no toma la cedula como telefono", () => {
    expect(p.telefono?.valor).not.toContain("1017928708");
  });

  it("toma el celular del candidato y no el de una referencia", () => {
    // Los de las referencias (315 645 8363, 316 747 43 39) salen pegados a la
    // cédula y el correo del candidato: la cercanía engañaría.
    expect(p.telefono?.valor).toBe("315 601 11 65");
  });

  it("detecta las habilidades blandas y los idiomas, no solo tecnologias", () => {
    expect(p.habilidades.valor).toContain("Liderazgo");
    expect(p.habilidades.valor).toContain("Trabajo en equipo");
    expect(p.habilidades.valor).toContain("Toma de decisiones");
    expect(p.habilidades.valor).toContain("Inglés");
    expect(p.habilidades.valor.length).toBeGreaterThanOrEqual(10);
  });

  it("encuentra los dos cargos aunque esten fuera de su seccion", () => {
    const cargos = p.experiencias.valor.map((e) => e.cargo);
    expect(p.experiencias.valor).toHaveLength(2);
    expect(cargos.join(" ")).toContain("Trabajador");
    expect(p.experiencias.valor[0].anioInicio).toBe(2023);
    expect(p.experiencias.valor[1].anioFin).toBe(2026);
  });

  it("ya no mete frases del sobre-mi como estudios", () => {
    const titulos = p.educacion.valor.map((e) => e.titulo).join(" | ");
    expect(titulos).not.toContain("Soy una persona");
    expect(titulos).not.toContain("me gusta trabajar");
    expect(titulos).not.toContain("divido mi vida personal");
  });

  it("si conserva la formacion real", () => {
    const titulos = p.educacion.valor.map((e) => e.titulo).join(" | ");
    expect(titulos).toContain("Bachillerato");
    expect(titulos).toContain("Colegio Luis Amigó");
    expect(titulos).toContain("Universidad EAFIT");
  });

  it("no clasifica un cargo como estudio", () => {
    const titulos = p.educacion.valor.map((e) => e.titulo).join(" | ");
    expect(titulos).not.toContain("Almacén de Ropa");
  });

  it("pasa de 2 a 6 campos detectados sobre 8", () => {
    const r = resumenExtraccion(p);
    expect(r.detectados).toBeGreaterThanOrEqual(6);
    expect(r.experiencias).toBe(2);
    expect(r.educacion).toBeLessThanOrEqual(6);
  });
});
