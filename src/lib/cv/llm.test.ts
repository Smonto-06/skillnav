import { describe, it, expect } from "vitest";
import { MotorLLM, aPerfilExtraido, configDesdeEntorno, extraerJSON } from "./llm";

describe("configDesdeEntorno", () => {
  it("devuelve null sin clave: eso apaga el motor y dispara el respaldo", () => {
    expect(configDesdeEntorno({})).toBeNull();
    expect(configDesdeEntorno({ LLM_API_KEY: "   " })).toBeNull();
  });

  it("usa groq por defecto cuando solo se da la clave", () => {
    const c = configDesdeEntorno({ LLM_API_KEY: "k" });
    expect(c?.proveedor).toBe("groq");
    expect(c?.modelo).toBeTruthy();
  });

  it("acepta gemini y un modelo propio", () => {
    const c = configDesdeEntorno({
      LLM_API_KEY: "k",
      LLM_PROVIDER: "gemini",
      LLM_MODEL: "gemini-2.0-flash",
    });
    expect(c?.proveedor).toBe("gemini");
    expect(c?.modelo).toBe("gemini-2.0-flash");
  });

  it("rechaza un proveedor que no soportamos en vez de fallar al llamar", () => {
    expect(
      configDesdeEntorno({ LLM_API_KEY: "k", LLM_PROVIDER: "openai" })
    ).toBeNull();
  });

  it("el motor se reporta no disponible sin configuracion", () => {
    expect(new MotorLLM(null).disponible()).toBe(false);
  });
});

describe("extraerJSON", () => {
  it("lee un JSON limpio", () => {
    expect(extraerJSON('{"nombre":"Laura"}')).toEqual({ nombre: "Laura" });
  });

  // Los modelos envuelven el JSON aunque se les pida que no lo hagan.
  it("tolera el JSON envuelto en un bloque de codigo", () => {
    expect(extraerJSON('```json\n{"nombre":"Laura"}\n```')).toEqual({ nombre: "Laura" });
  });

  it("tolera texto antes y despues", () => {
    expect(extraerJSON('Claro, aqui tienes: {"nombre":"Laura"} Espero sirva.')).toEqual({
      nombre: "Laura",
    });
  });

  it("falla claro si no hay ningun objeto", () => {
    expect(() => extraerJSON("No puedo procesar esa solicitud")).toThrow(/no contiene/i);
  });
});

// La respuesta del modelo es entrada no confiable: se valida como un formulario.
describe("aPerfilExtraido · validacion de la respuesta", () => {
  const minima = {
    habilidades: [],
    habilidadesBlandas: [],
    experiencias: [],
    educacion: [],
  };

  it("mapea una respuesta completa al borrador del dominio", () => {
    const p = aPerfilExtraido(
      {
        ...minima,
        nombre: "Samuel Montoya Espinosa",
        email: "s@ejemplo.com",
        telefono: "3156011165",
        titular: "Auxiliar administrativo",
        habilidades: ["Liderazgo", "Excel"],
        habilidadesBlandas: ["Liderazgo"],
        experiencias: [
          { cargo: "Trabajador de Tienda", empresa: "Tienda de barrio", periodo: "2023-2025", anioInicio: 2023, anioFin: 2025, actual: false },
        ],
        educacion: [{ titulo: "Bachillerato", institucion: "Colegio Luis Amigó", anio: 2023 }],
        confianzaGeneral: "alta",
      },
      "texto"
    );
    expect(p.nombre?.valor).toBe("Samuel Montoya Espinosa");
    expect(p.experiencias.valor[0].cargo).toBe("Trabajador de Tienda");
    expect(p.educacion.valor[0].anio).toBe(2023);
    // Con LLM el desorden de columnas deja de ser un problema que advertir.
    expect(p.layoutMezclado).toBe(false);
  });

  it("omite los campos que el modelo devolvio vacios en vez de guardar cadenas vacias", () => {
    const p = aPerfilExtraido({ ...minima, nombre: "  ", email: null }, "texto");
    expect(p.nombre).toBeUndefined();
    expect(p.email).toBeUndefined();
  });

  it("no deja fecha de fin en un cargo marcado como actual", () => {
    const p = aPerfilExtraido(
      {
        ...minima,
        experiencias: [{ cargo: "Dev", empresa: null, periodo: null, anioInicio: 2023, anioFin: 2025, actual: true }],
      },
      "texto"
    );
    expect(p.experiencias.valor[0].actual).toBe(true);
    expect(p.experiencias.valor[0].anioFin).toBeUndefined();
  });

  it("el catalogo corrige al modelo si clasifica mal una habilidad", () => {
    // El modelo dice que React es blanda; el catalogo manda.
    const p = aPerfilExtraido(
      { ...minima, habilidades: ["React", "Liderazgo"], habilidadesBlandas: ["React"] },
      "texto"
    );
    const blandas = p.habilidadesBlandas instanceof Set ? p.habilidadesBlandas : new Set();
    expect(blandas.has("Liderazgo")).toBe(true);
  });

  it("el telefono queda en confianza media aun con IA", () => {
    // Un CV con referencias trae varios numeros: es el error mas facil.
    const p = aPerfilExtraido({ ...minima, telefono: "3156011165" }, "texto");
    expect(p.telefono?.confianza).toBe("media");
  });

  it("no duplica habilidades repetidas por el modelo", () => {
    const p = aPerfilExtraido(
      { ...minima, habilidades: ["Excel", "Excel", "excel"] },
      "texto"
    );
    expect(p.habilidades.valor.filter((h) => h === "Excel")).toHaveLength(1);
  });
});
