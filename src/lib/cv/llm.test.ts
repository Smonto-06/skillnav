import { describe, it, expect } from "vitest";
import { MotorLLM, aPerfilExtraido, configDesdeEntorno, extraerJSON, telefonoConsolidado } from "./llm";

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

// Los dos motores se suman: el catalogo aporta cobertura sobre el texto crudo
// aunque el modelo no haya listado esas habilidades.
describe("aPerfilExtraido · union con el catalogo", () => {
  const minima = {
    habilidades: [],
    habilidadesBlandas: [],
    experiencias: [],
    educacion: [],
  };

  it("agrega habilidades del catalogo que el modelo no listo", () => {
    const texto = "Realizo labores de atencion al cliente y manejo de caja registradora.";
    const p = aPerfilExtraido({ ...minima, habilidades: ["Liderazgo"] }, texto);
    expect(p.habilidades.valor).toContain("Liderazgo");
    // El modelo no las menciono, pero estan en el texto del CV.
    expect(p.habilidades.valor).toContain("Atención al cliente");
    expect(p.habilidades.valor).toContain("Manejo de caja");
  });

  it("no duplica lo que el modelo y el catalogo encuentran por igual", () => {
    const p = aPerfilExtraido({ ...minima, habilidades: ["Liderazgo"] }, "Liderazgo de equipos");
    expect(p.habilidades.valor.filter((h) => h === "Liderazgo")).toHaveLength(1);
  });

  it("clasifica como tecnica una habilidad del catalogo tecnico", () => {
    const p = aPerfilExtraido({ ...minima, habilidades: [] }, "Manejo de React y PostgreSQL");
    const blandas = p.habilidadesBlandas instanceof Set ? p.habilidadesBlandas : new Set<string>();
    expect(p.habilidades.valor).toContain("React");
    expect(blandas.has("React")).toBe(false);
  });

  it("reporta en la evidencia cuanto aporto cada fuente", () => {
    const p = aPerfilExtraido({ ...minima, habilidades: ["Liderazgo"] }, "atencion al cliente");
    expect(p.habilidades.evidencia).toMatch(/modelo/);
    expect(p.habilidades.evidencia).toMatch(/catálogo/);
  });
});

describe("telefonoConsolidado", () => {
  // Caso real: el modelo devolvio el telefono de la referencia. El prompt ya
  // le pedia no hacerlo; igual lo hizo. Las reglas no son mas listas, pero
  // saben donde empieza la seccion REFERENCIAS.
  const CV = `
CARLOS ANDRES RUIZ
Auxiliar Administrativo

CONTACTO
Telefono: 315 601 11 65
Correo: carlos.ruiz@ejemplo.com

EXPERIENCIA LABORAL
Auxiliar Administrativo - Comercial XYZ (2022 - actual)

REFERENCIAS
Martha Lucia Perez - Jefe inmediata
Telefono: 300 123 45 67
`;

  const digitos = (s?: string) => (s ?? "").replace(/\D/g, "");

  it("descarta el numero que el modelo tomo de las referencias", () => {
    const r = telefonoConsolidado("300 123 45 67", CV);
    expect(digitos(r?.valor)).toBe("3156011165");
  });

  it("respeta al modelo cuando acerto", () => {
    const r = telefonoConsolidado("315 601 11 65", CV);
    expect(digitos(r?.valor)).toBe("3156011165");
  });

  it("usa el de las reglas si el modelo no devolvio ninguno", () => {
    const r = telefonoConsolidado(undefined, CV);
    expect(digitos(r?.valor)).toBe("3156011165");
    expect(r?.confianza).toBe("alta");
  });

  it("no inventa un telefono si el CV no trae ninguno", () => {
    expect(telefonoConsolidado(undefined, "CONTACTO" + "\n" + "Sin numero aqui")).toBeUndefined();
  });

  it("respeta al modelo si el CV no declara secciones", () => {
    const suelto = "Juan Perez" + "\n" + "Llamar al 320 555 11 22";
    expect(digitos(telefonoConsolidado("320 555 11 22", suelto)?.valor)).toBe("3205551122");
  });
});

describe("aPerfilExtraido · el telefono pasa por el cruce", () => {
  // Prueba el cableado real, no solo el helper: aPerfilExtraido es lo que
  // corre en produccion cuando responde el modelo.
  const CV = `
CARLOS ANDRES RUIZ

CONTACTO
Telefono: 315 601 11 65

REFERENCIAS
Martha Lucia Perez - Jefe inmediata
Telefono: 300 123 45 67
`;

  const base = { habilidades: [], habilidadesBlandas: [], experiencias: [], educacion: [] };

  it("corrige al modelo cuando devolvio el telefono de la referencia", () => {
    const p = aPerfilExtraido({ ...base, telefono: "300 123 45 67" } as never, CV);
    expect(p.telefono?.valor.replace(/\D/g, "")).toBe("3156011165");
    expect(p.telefono?.evidencia).toMatch(/referencias/i);
  });

  it("deja el del modelo cuando es el correcto", () => {
    const p = aPerfilExtraido({ ...base, telefono: "315 601 11 65" } as never, CV);
    expect(p.telefono?.valor.replace(/\D/g, "")).toBe("3156011165");
  });
});
