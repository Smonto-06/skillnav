// Texto literal que devolvió el extractor con una hoja de vida real a dos
// columnas (caso reportado por el board). Se comparte entre pruebas: el
// parser por reglas, el clasificador de teléfonos y la verificación del motor
// con IA tienen que dar el mismo resultado sobre el mismo documento.
//
// Datos del candidato (bloque CONTACTO): celular 315 601 11 65, cédula y
// correo. Referencias: Paula Espinosa Osorio y Sergio Betancur Penagos, con
// los números 315 645 8363 y 316 747 43 39, que el PDF entrega uno detrás del
// otro. Ojo: la cédula y el correo quedan pegados a los números de las
// referencias, así que la cercanía a los datos propios NO sirve para decidir.
export const CV_DOS_COLUMNAS = `CONTACTO
REFERENCIAS
315 601 11 65
Paula Espinosa Osorio
Sergio Betancur Penagos
CC. 1017928708
samulmontoya64@gmail.com
315 645 8363
316 747 43 39
SAMUEL
MONTOYA
ESPINOSA
SOBRE MÍ
2023-2025 Trabajador de Tienda
Liderazgo
Comunicación
Toma de decisiones
Español Inglés
Gestión del tiempo
Trabajo en equipo
Pensamiento estratégico
Trabajo bajo presión
Durante 3 años trabajé en una tienda de barrio
realizando labores de atención al cliente, caja
registradora, abastecimiento, entrega de domicilios y
aseo general.
EXPERIENCIA
HABILIDADES
IDIOMAS
EDUCACIÓN
Soy una persona que le gusta socializar, me gusta ayudar a las personas
cuando puedo, me gusta trabajar y cumplir mis metas con esfuerzo, me
gusta trabajar individual y en grupo, soy respetuoso, atento, responsable,
puntual, aprendo de manera rápida, tengo un buen dominio del ingles, y
también divido mi vida personal de la laboral.
2023 Graduado de Bachillerato con
media técnica en administración de
empresas.
Colegio Luis Amigó
2026(Actualmente) Estudiante de
la carrera Ingeniería de Sistemas
Universidad EAFIT
2025-2026 Trabajador en Almacén de Ropa
Realizo labores de atención al cliente, caja registradora,
reabastecimiento y aseo general.`;
