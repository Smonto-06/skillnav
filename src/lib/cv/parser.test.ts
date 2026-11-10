import { describe, it, expect } from "vitest";
import {
  ContextoCV,
  DetectorCampo,
  ParserCV,
  PerfilExtraido,
  resumenExtraccion,
} from "./parser";

const CV_COMPLETO = `Laura Gomez Restrepo
Desarrolladora Full Stack con React y Node.js
laura.gomez@ejemplo.com | +57 301 234 5678
linkedin.com/in/lauragomez
Medellin, Colombia

PERFIL PROFESIONAL
Desarrolladora con 4 anios construyendo aplicaciones web.

EXPERIENCIA LABORAL
Backend Developer - Bancolombia (2023 - actual)
Desarrollo de APIs internas.
Frontend Developer - Magneto (2021 - 2023)
Mantenimiento del portal de vacantes.

EDUCACION
Ingenieria de Sistemas - Universidad EAFIT (2021)

HABILIDADES
React, TypeScript, Node.js, PostgreSQL, Docker`;

const parser = new ParserCV();

describe("ContextoCV", () => {
  it("reconoce los encabezados sin importar tildes ni mayusculas", () => {
    expect(ContextoCV.encabezadoDe("EXPERIENCIA LABORAL")).toBe("experiencia");
    expect(ContextoCV.encabezadoDe("Educación")).toBe("educacion");
    expect(ContextoCV.encabezadoDe("Habilidades:")).toBe("habilidades");
    expect(ContextoCV.encabezadoDe("Perfil Profesional")).toBe("perfil");
  });

  it("no confunde una frase larga con un encabezado", () => {
    expect(
      ContextoCV.encabezadoDe("Tengo experiencia liderando equipos de desarrollo agiles")
    ).toBeNull();
  });

  it("reparte las lineas en la seccion a la que pertenecen", () => {
    const ctx = new ContextoCV(CV_COMPLETO);
    expect(ctx.seccion("habilidades").join(" ")).toContain("PostgreSQL");
    expect(ctx.seccion("experiencia").length).toBe(4);
    expect(ctx.seccion("educacion")[0]).toContain("EAFIT");
  });
});

describe("ParserCV · contacto", () => {
  const p = parser.parse(CV_COMPLETO);

  it("detecta el email con confianza alta", () => {
    expect(p.email?.valor).toBe("laura.gomez@ejemplo.com");
    expect(p.email?.confianza).toBe("alta");
  });

  it("detecta el telefono pero no se confia: puede ser una cedula", () => {
    expect(p.telefono?.valor).toBeTruthy();
    expect(p.telefono?.confianza).toBe("media");
  });

  it("detecta el linkedin y lo normaliza", () => {
    expect(p.linkedin?.valor).toBe("linkedin.com/in/lauragomez");
  });

  it("no inventa contacto cuando el CV no lo trae", () => {
    const sin = parser.parse("HABILIDADES\nReact, Node.js, SQL y mas tecnologias del stack");
    expect(sin.email).toBeUndefined();
    expect(sin.linkedin).toBeUndefined();
  });
});

describe("ParserCV · nombre y titular", () => {
  const p = parser.parse(CV_COMPLETO);

  it("toma la primera linea corta como nombre, con confianza baja", () => {
    expect(p.nombre?.valor).toBe("Laura Gomez Restrepo");
    // Baja a proposito: es la heuristica mas fragil y debe revisarse siempre.
    expect(p.nombre?.confianza).toBe("baja");
  });

  it("usa la seccion de perfil para el titular cuando existe", () => {
    expect(p.titular?.valor).toContain("Desarrolladora");
    expect(p.titular?.confianza).toBe("media");
  });

  it("no toma un encabezado como nombre", () => {
    const p2 = parser.parse("HABILIDADES\nReact y Node.js con PostgreSQL en produccion");
    expect(p2.nombre?.valor).not.toBe("HABILIDADES");
  });

  // Regresion: un CV sin seccion de perfil cuyo titular es un rol puro
  // ("Desarrolladora Full Stack") no menciona ninguna tecnologia del catalogo.
  // Antes se perdia el titular, y con el la afinidad de rol del match score.
  it("detecta un titular que es solo un rol, sin tecnologias", () => {
    const p = parser.parse(
      `Laura Gomez Restrepo
Desarrolladora Full Stack
laura@ejemplo.com

HABILIDADES
React, TypeScript`
    );
    expect(p.titular?.valor).toBe("Desarrolladora Full Stack");
  });

  it("tambien detecta el titular por la tecnologia que menciona", () => {
    const p = parser.parse(
      `Juan Perez
Especialista en PostgreSQL y Docker
juan@ejemplo.com`
    );
    expect(p.titular?.valor).toContain("PostgreSQL");
  });
});

describe("ParserCV · habilidades", () => {
  it("detecta las habilidades de la seccion con confianza alta", () => {
    const p = parser.parse(CV_COMPLETO);
    expect(p.habilidades.confianza).toBe("alta");
    expect(p.habilidades.valor).toContain("React");
    expect(p.habilidades.valor).toContain("PostgreSQL");
    expect(p.habilidades.valor).toContain("Docker");
  });

  it("baja la confianza si no hay seccion de habilidades", () => {
    const p = parser.parse(
      "Juan Perez\nTrabaje en un equipo que usaba React y Node.js durante dos anios."
    );
    expect(p.habilidades.confianza).toBe("media");
    expect(p.habilidades.valor.length).toBeGreaterThan(0);
  });

  it("no repite una habilidad mencionada varias veces", () => {
    const p = parser.parse("HABILIDADES\nReact, React, react, REACT");
    expect(p.habilidades.valor.filter((h) => h === "React")).toHaveLength(1);
  });
});

describe("ParserCV · experiencia", () => {
  const p = parser.parse(CV_COMPLETO);

  it("detecta las dos entradas con cargo, empresa y periodo", () => {
    expect(p.experiencias.valor).toHaveLength(2);
    const [primera, segunda] = p.experiencias.valor;
    expect(primera.cargo).toBe("Backend Developer");
    expect(primera.empresa).toBe("Bancolombia");
    expect(primera.anioInicio).toBe(2023);
    expect(segunda.cargo).toBe("Frontend Developer");
    expect(segunda.anioFin).toBe(2023);
  });

  it("marca como actual el cargo que no tiene anio de fin", () => {
    expect(p.experiencias.valor[0].actual).toBe(true);
    expect(p.experiencias.valor[0].anioFin).toBeUndefined();
    expect(p.experiencias.valor[1].actual).toBe(false);
  });

  it("ignora las lineas de la seccion que no tienen fechas", () => {
    // "Desarrollo de APIs internas." no es una entrada de experiencia.
    expect(p.experiencias.valor.map((e) => e.cargo)).not.toContain("Desarrollo de APIs internas.");
  });

  it("deja la lista vacia si no hay seccion de experiencia", () => {
    const sin = parser.parse("Juan Perez\nHABILIDADES\nReact y Node.js en varios proyectos");
    expect(sin.experiencias.valor).toHaveLength(0);
    expect(sin.experiencias.confianza).toBe("baja");
  });
});

describe("ParserCV · educacion", () => {
  it("detecta titulo, institucion y anio", () => {
    const p = parser.parse(CV_COMPLETO);
    expect(p.educacion.valor).toHaveLength(1);
    expect(p.educacion.valor[0].titulo).toBe("Ingenieria de Sistemas");
    expect(p.educacion.valor[0].institucion).toBe("Universidad EAFIT");
    expect(p.educacion.valor[0].anio).toBe(2021);
  });
});

// COMPOSITE: se puede correr el parser con otro conjunto de detectores.
describe("ParserCV · composite de detectores", () => {
  it("permite inyectar detectores propios", () => {
    const detectorFalso: DetectorCampo = {
      campo: "prueba",
      detectar: (_ctx, borrador: PerfilExtraido) => {
        borrador.nombre = { valor: "Inyectado", confianza: "alta", evidencia: "test" };
      },
    };
    const p = new ParserCV([detectorFalso]).parse(CV_COMPLETO);
    expect(p.nombre?.valor).toBe("Inyectado");
    // Los demas campos quedan sin detectar porque no se corrio su detector.
    expect(p.email).toBeUndefined();
  });

  it("un detector que lanza no tumba el resto del parseo", () => {
    const detectorRoto: DetectorCampo = {
      campo: "roto",
      detectar: () => {
        throw new Error("falla a proposito");
      },
    };
    const p = new ParserCV([detectorRoto, ...new ParserCV()["detectores"]]).parse(CV_COMPLETO);
    expect(p.email?.valor).toBe("laura.gomez@ejemplo.com");
  });

  it("siempre conserva el texto original para que el candidato lo revise", () => {
    const p = parser.parse(CV_COMPLETO);
    expect(p.textoOriginal).toBe(CV_COMPLETO);
  });
});

describe("resumenExtraccion", () => {
  it("cuenta los campos detectados para mostrarselos al candidato", () => {
    const r = resumenExtraccion(parser.parse(CV_COMPLETO));
    expect(r.total).toBe(8);
    expect(r.detectados).toBeGreaterThanOrEqual(7);
    expect(r.habilidades).toBe(5);
    expect(r.experiencias).toBe(2);
    expect(r.educacion).toBe(1);
  });

  it("reporta cero en un texto sin datos aprovechables", () => {
    const r = resumenExtraccion(parser.parse("aaa bbb ccc ddd eee fff"));
    expect(r.habilidades).toBe(0);
    expect(r.experiencias).toBe(0);
  });
});

describe("ParserCV · robustez ante texto adversario", () => {
  // La deteccion del correo recorria todo el texto con un cuantificador sin
  // tope. Una corrida larga de caracteres validos que no termina en "@" hacia
  // retroceder al motor desde cada posicion: costo cuadratico y el unico hilo
  // de Node bloqueado para todos los usuarios. Medido antes del arreglo:
  // 20.000 guiones = 255 ms, 60.000 = 2.346 ms.
  const conGuiones = (n: number) => `EXPERIENCIA
${"-".repeat(n)}
Analista de datos
`;

  it("no se dispara con una linea separadora larga", () => {
    const t0 = Date.now();
    new ParserCV().parse(conGuiones(60_000));
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it("el costo crece de forma lineal, no cuadratica", () => {
    const medir = (n: number) => {
      const texto = conGuiones(n);
      const t0 = Date.now();
      new ParserCV().parse(texto);
      return Date.now() - t0;
    };
    medir(20_000); // calentamiento: la primera pasada carga el catalogo
    const corto = medir(20_000);
    const largo = medir(80_000);
    // Con 4x de entrada, un costo cuadratico daria ~16x. Se deja un margen
    // amplio para no volver la prueba fragil en una maquina cargada.
    expect(largo).toBeLessThan(Math.max(corto, 1) * 8 + 100);
  });

  it("sigue encontrando el correo despues de un bloque largo", () => {
    const texto = `CONTACTO
${"-".repeat(20_000)}
laura.gomez@example.com
`;
    const r = new ParserCV().parse(texto);
    expect(r.email?.valor).toBe("laura.gomez@example.com");
  });
});
