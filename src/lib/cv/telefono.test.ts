import { describe, expect, it } from "vitest";
import { ContextoCV } from "./parser";
import { clasificarTelefonos, digitos, telefonoDelCandidato } from "./telefono";
import { verificarTelefono } from "./llm";
import { CV_DOS_COLUMNAS } from "./cv-dos-columnas.fixture";

const ctx = (texto: string) => new ContextoCV(texto);

describe("digitos", () => {
  it("compara números escritos distinto", () => {
    expect(digitos("+57 315 645 8363")).toBe(digitos("315-645-83-63"));
  });
});

describe("telefonoDelCandidato · CV real a dos columnas", () => {
  it("toma el celular del candidato aunque su cédula y su correo queden junto a los de las referencias", () => {
    expect(telefonoDelCandidato(ctx(CV_DOS_COLUMNAS))?.valor).toBe("315 601 11 65");
  });

  it("reconoce el bloque de dos números seguidos como los teléfonos de las dos referencias", () => {
    const t = clasificarTelefonos(ctx(CV_DOS_COLUMNAS));
    const dueno = (valor: string) => t.find((x) => x.valor === valor)?.dueno;
    expect(dueno("315 645 8363")).toBe("referencia");
    expect(dueno("316 747 43 39")).toBe("referencia");
    expect(dueno("315 601 11 65")).toBe("candidato");
  });
});

describe("telefonoDelCandidato · CV de una columna", () => {
  it("con secciones fiables manda la sección, aunque REFERENCIAS vaya antes", () => {
    const cv = `Ana María Ruiz
Analista de datos

REFERENCIAS
Carlos Gómez Pérez
Jefe de operaciones · 300 111 2233

PERFIL
Analista con experiencia en Power BI.

CONTACTO
ana.ruiz@correo.com
311 555 6677`;
    const tel = telefonoDelCandidato(ctx(cv), "Ana María Ruiz");
    expect(tel?.valor).toBe("311 555 6677");
    expect(tel?.confianza).toBe("alta");
  });

  it("una línea que se anuncia como referencia nunca es del candidato", () => {
    const cv = `Pedro Ruiz
pedro@correo.com
Ref. laboral: Marta Díaz 320 444 5566`;
    const tel = telefonoDelCandidato(ctx(cv), "Pedro Ruiz");
    expect(tel).toBeNull();
  });

  it("si solo hay números de referencias, deja el campo vacío", () => {
    const cv = `Pedro Ruiz
pedro@correo.com

EXPERIENCIA
Vendedor en Almacén Éxito (2022 - 2024)

REFERENCIAS
Marta Díaz López
320 444 5566`;
    expect(telefonoDelCandidato(ctx(cv), "Pedro Ruiz")).toBeNull();
  });

  it("un cargo en la misma línea no convierte el número del candidato en referencia", () => {
    const tel = telefonoDelCandidato(ctx("Administradora de empresas | 310 222 3344\nlaura@correo.com"));
    expect(tel?.valor).toBe("310 222 3344");
  });

  it("un número en la misma línea que el nombre de otra persona es de una referencia", () => {
    const cv = `CONTACTO
REFERENCIAS
301 222 3344
Paula Espinosa Osorio 315 645 8363
ana@correo.com`;
    expect(telefonoDelCandidato(ctx(cv))?.valor).toBe("301 222 3344");
  });

  it("si todos los números forman el bloque, no descarta ninguno a ciegas", () => {
    const cv = `CONTACTO
REFERENCIAS
Paula Espinosa Osorio
Sergio Betancur Penagos
315 645 8363
316 747 43 39`;
    // Dos nombres y dos números: no hay número sobrante que sea el del candidato.
    expect(telefonoDelCandidato(ctx(cv))?.valor).toBe("315 645 8363");
    expect(telefonoDelCandidato(ctx(cv))?.confianza).toBe("media");
  });

  it("no toma la cédula como teléfono", () => {
    expect(telefonoDelCandidato(ctx("C.C. 3101234567\npedro@correo.com"))).toBeNull();
  });
});

describe("verificarTelefono · respuesta del motor con IA", () => {
  it("corrige al modelo cuando devuelve el número de una referencia (el error reportado)", () => {
    const t = verificarTelefono("315 645 8363", CV_DOS_COLUMNAS, "Samuel Montoya Espinosa");
    expect(t?.valor).toBe("315 601 11 65");
    expect(t?.evidencia).toContain("referencia");
  });

  it("también corrige el otro número de referencia", () => {
    expect(verificarTelefono("3167474339", CV_DOS_COLUMNAS)?.valor).toBe("315 601 11 65");
  });

  it("si el modelo y el clasificador coinciden, la confianza es alta", () => {
    const t = verificarTelefono("3156011165", CV_DOS_COLUMNAS, "Samuel Montoya Espinosa");
    expect(t?.valor).toBe("3156011165");
    expect(t?.confianza).toBe("alta");
  });

  it("si el modelo no encontró teléfono, usa el del clasificador", () => {
    expect(verificarTelefono(undefined, CV_DOS_COLUMNAS)?.valor).toBe("315 601 11 65");
  });

  it("descarta un número que no aparece en el CV", () => {
    expect(verificarTelefono("300 000 0000", "Pedro Ruiz\npedro@correo.com")).toBeUndefined();
  });
});
