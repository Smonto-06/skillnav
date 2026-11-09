// Fachada del módulo de scoring (HU-24).
//
// El resto de la aplicación importa desde acá y no necesita saber que por
// dentro hay un núcleo de cálculo, seis evaluadores y un motor que los combina.
// Eso permitió separar las dimensiones en clases sin tocar una sola línea de
// las páginas ni del recomendador.
export * from "./scoring/nucleo";
export * from "./scoring/evaluadores";
export * from "./scoring/motor";
