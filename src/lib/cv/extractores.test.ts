import { describe, it, expect } from "vitest";
import {
  ErrorExtraccion,
  ExtractorDocx,
  ExtractorFactory,
  ExtractorPdf,
  ExtractorTextoPlano,
  TAMANO_MAXIMO_BYTES,
  extraerTextoCV,
  normalizarTexto,
} from "./extractores";

const bytes = (s: string) => new TextEncoder().encode(s);

const CV_EJEMPLO = `Laura Gomez
Desarrolladora Full Stack
Medellin, Colombia

EXPERIENCIA
Backend Developer - Bancolombia (2023 - 2026)
Desarrollo de APIs con Node.js y PostgreSQL.`;

describe("normalizarTexto", () => {
  it("unifica saltos de linea de Windows y colapsa espacios", () => {
    expect(normalizarTexto("Hola\r\n  mundo   cruel  ")).toBe("Hola\nmundo cruel");
  });

  it("no deja lineas vacias consecutivas", () => {
    expect(normalizarTexto("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("recorta el texto en los extremos", () => {
    expect(normalizarTexto("\n\n  texto  \n\n")).toBe("texto");
  });
});

// FACTORY METHOD: la decision de que estrategia usar vive en un solo lugar.
describe("ExtractorFactory", () => {
  it("elige la estrategia por tipo MIME", () => {
    expect(ExtractorFactory.crear({ nombre: "cv.pdf", tipo: "application/pdf" })).toBeInstanceOf(
      ExtractorPdf
    );
    expect(
      ExtractorFactory.crear({
        nombre: "cv.docx",
        tipo: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).toBeInstanceOf(ExtractorDocx);
    expect(ExtractorFactory.crear({ nombre: "cv.txt", tipo: "text/plain" })).toBeInstanceOf(
      ExtractorTextoPlano
    );
  });

  it("usa la extension cuando el navegador manda un MIME generico", () => {
    // Caso real: algunos navegadores envian DOCX como octet-stream.
    const e = ExtractorFactory.crear({
      nombre: "HojaDeVida.DOCX",
      tipo: "application/octet-stream",
    });
    expect(e).toBeInstanceOf(ExtractorDocx);
  });

  it("rechaza un formato que no soportamos", () => {
    expect(() => ExtractorFactory.crear({ nombre: "foto.png", tipo: "image/png" })).toThrow(
      ErrorExtraccion
    );
  });

  it("expone los formatos soportados para mostrarlos en la interfaz", () => {
    expect(ExtractorFactory.formatosSoportados().sort()).toEqual([".docx", ".pdf", ".txt"]);
  });

  it("saca la extension en minusculas y tolera nombres sin punto", () => {
    expect(ExtractorFactory.extensionDe("Hoja.De.Vida.PDF")).toBe("pdf");
    expect(ExtractorFactory.extensionDe("sinextension")).toBe("");
  });
});

// STRATEGY: todas las estrategias cumplen el mismo contrato.
describe("ExtractorTextoPlano", () => {
  it("devuelve el texto normalizado", async () => {
    const texto = await new ExtractorTextoPlano().extraer({
      nombre: "cv.txt",
      tipo: "text/plain",
      contenido: bytes(CV_EJEMPLO),
    });
    expect(texto).toContain("Laura Gomez");
    expect(texto).toContain("Bancolombia");
  });

  it("declara su formato", () => {
    expect(new ExtractorTextoPlano().formato).toBe("TXT");
    expect(new ExtractorPdf().formato).toBe("PDF");
    expect(new ExtractorDocx().formato).toBe("DOCX");
  });
});

describe("extraerTextoCV", () => {
  const archivo = (contenido: Uint8Array, nombre = "cv.txt", tipo = "text/plain") => ({
    nombre,
    tipo,
    contenido,
  });

  it("extrae el texto de un CV valido", async () => {
    const texto = await extraerTextoCV(archivo(bytes(CV_EJEMPLO)));
    expect(texto).toContain("Desarrolladora Full Stack");
  });

  it("rechaza un archivo vacio", async () => {
    await expect(extraerTextoCV(archivo(new Uint8Array()))).rejects.toThrow(/vacío/i);
  });

  it("rechaza un archivo que supera el limite de tamano", async () => {
    const grande = new Uint8Array(TAMANO_MAXIMO_BYTES + 1);
    await expect(extraerTextoCV(archivo(grande))).rejects.toThrow(/límite/i);
  });

  it("avisa cuando el archivo no tiene texto legible, en vez de devolver vacio", async () => {
    // Simula un PDF escaneado: archivo valido pero sin texto aprovechable.
    await expect(extraerTextoCV(archivo(bytes("hola")))).rejects.toThrow(/texto legible/i);
  });

  it("rechaza un formato no soportado antes de intentar leerlo", async () => {
    await expect(
      extraerTextoCV(archivo(bytes(CV_EJEMPLO), "foto.png", "image/png"))
    ).rejects.toThrow(/no soportado/i);
  });
});

describe("normalizarTexto · caracteres de control", () => {
  it("elimina el byte nulo, que PostgreSQL rechaza", () => {
    // Llegaba intacto hasta el guardado del borrador y reventaba con un
    // error 22P05 que el candidato veia como un fallo de servidor.
    const texto = normalizarTexto("Laura" + "\u0000" + " Gomez");
    expect(texto).toBe("Laura Gomez");
  });

  it("elimina otros controles pero conserva el salto y la tabulacion", () => {
    expect(normalizarTexto("Perfil" + "\u001F" + "\nDatos")).toBe("Perfil\nDatos");
    expect(normalizarTexto("a\tb")).toBe("a b");
  });
});
