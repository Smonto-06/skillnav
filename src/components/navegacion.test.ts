import { describe, expect, it } from "vitest";
import { LINKS_ADMIN, LINKS_CANDIDATO, esActivo, linksPara } from "./navegacion";

describe("linksPara", () => {
  it("muestra los enlaces del candidato en las rutas de la aplicacion", () => {
    for (const ruta of ["/", "/perfil", "/recomendaciones", "/postulaciones"]) {
      expect(linksPara(ruta)).toBe(LINKS_CANDIDATO);
    }
  });

  it("muestra los enlaces del panel dentro de /admin", () => {
    // Era el error visible en las capturas: el panel mostraba Perfil,
    // Preferencias y Recomendaciones, que no existen para el administrador.
    for (const ruta of ["/admin/vacantes", "/admin/scoring", "/admin/metricas"]) {
      expect(linksPara(ruta)).toBe(LINKS_ADMIN);
    }
  });

  it("deja al administrador navegar la aplicacion como candidato", () => {
    expect(linksPara("/recomendaciones")).toBe(LINKS_CANDIDATO);
  });
});

describe("esActivo", () => {
  it("resalta la seccion actual", () => {
    expect(esActivo("/perfil", "/perfil")).toBe(true);
    expect(esActivo("/perfil", "/preferencias")).toBe(false);
  });

  it("resalta la seccion tambien en sus rutas anidadas", () => {
    expect(esActivo("/perfil", "/perfil/cv")).toBe(true);
    expect(esActivo("/admin/vacantes", "/admin/vacantes/nueva")).toBe(true);
  });

  it("no confunde rutas que solo comparten el prefijo del texto", () => {
    expect(esActivo("/perfil", "/perfiles")).toBe(false);
    expect(esActivo("/admin/vacantes", "/admin/vacantes-archivadas")).toBe(false);
  });

  it("solo resalta la raiz en la raiz", () => {
    expect(esActivo("/", "/")).toBe(true);
    expect(esActivo("/", "/perfil")).toBe(false);
    // "Ver el sitio" apunta a "/" y aparece dentro del panel: no debe quedar
    // resaltado ahi.
    expect(esActivo("/", "/admin/metricas")).toBe(false);
  });
});
