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
  it("toma el celular junto al correo y la cédula, no el de la referencia que sale primero", () => {
    expect(telefonoDelCandidato(ctx(CV_DOS_COLUMNAS))?.valor).toBe("315 645 8363");
  });

  it("clasifica como referencia el número pegado a los nombres de las referencias", () => {
    const t = clasificarTelefonos(ctx(CV_DOS_COLUMNAS)).find((x) => x.valor === "315 601 11 65");
    expect(t?.dueno).toBe("referencia");
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

  it("no toma la cédula como teléfono", () => {
    expect(telefonoDelCandidato(ctx("C.C. 3101234567\npedro@correo.com"))).toBeNull();
  });
});

describe("verificarTelefono · respuesta del motor con IA", () => {
  it("corrige al modelo cuando devuelve el número de una referencia", () => {
    const t = verificarTelefono("315 601 11 65", CV_DOS_COLUMNAS, "Samuel Montoya Espinosa");
    expect(t?.valor).toBe("315 645 8363");
    expect(t?.evidencia).toContain("referencia");
  });

  it("si el modelo y el clasificador coinciden, la confianza es alta", () => {
    const t = verificarTelefono("3156458363", CV_DOS_COLUMNAS, "Samuel Montoya Espinosa");
    expect(t?.valor).toBe("3156458363");
    expect(t?.confianza).toBe("alta");
  });

  it("si el modelo no encontró teléfono, usa el del clasificador", () => {
    expect(verificarTelefono(undefined, CV_DOS_COLUMNAS)?.valor).toBe("315 645 8363");
  });

  it("descarta un número que no aparece en el CV", () => {
    expect(verificarTelefono("300 000 0000", "Pedro Ruiz\npedro@correo.com")).toBeUndefined();
  });
});
