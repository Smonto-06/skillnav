# Product Backlog v2 — SkillNav (reestructurado para Entrega 2)

> Reorganización solicitada por el board (2026-09-10). Jerarquía **Épica → Historia**, con los campos que exige el **Cono de la Incertidumbre** (Prioridad, T-shirt, Story Points, Incertidumbre de Negocio, Complejidad Técnica, Fase) y dependencias. Se añaden los dos módulos ausentes: **E3 CV Parser (IA)** y **E7 Administrador**, y se hace explícito el **motor de scoring (HU-24)**.
>
> **Estimaciones = borrador** (punto de partida). Se confirman en **Poker Planning**. Convención T-shirt→SP: XS=1, S=2, M=3–5, L=8, XL=13, XXL=20. Prioridad = MoSCoW (Must/Should/Could). Fase = Next (meta 60%) · Last · Later.

## Mapa de épicas
| Épica | Descripción | HU | Nuevo |
|---|---|---|---|
| E1 | Autenticación & Onboarding | HU-01, HU-02, HU-03 | |
| E2 | Gestión de Perfil | HU-04…HU-09 | |
| E3 | Carga y Parsing de CV (IA) | HU-21, HU-22, HU-23 | ⭐ |
| E4 | Preferencias Laborales | HU-10…HU-13 | |
| E5 | Motor de Recomendación & Vacantes | HU-24, HU-14…HU-17 | HU-24 ⭐ |
| E6 | Postulación & Seguimiento | HU-18…HU-20 | |
| E7 | Módulo Administrador | HU-25…HU-29 | ⭐ |
| E8 | Calidad & No Funcionales | HU-NF-01…HU-NF-05 | |

---

## E1 — Autenticación & Onboarding
| ID | Historia | Prioridad | Tshirt | SP | Inc.Negocio | Compl.Técnica | Fase | Depende de |
|---|---|---|---|---|---|---|---|---|
| HU-01 | Registro con email+contraseña | Must | S | 2 | Low | Low | Next | — |
| HU-02 | Login con credenciales | Must | S | 2 | Low | Low | Next | HU-01 |
| HU-03 | Wizard de onboarding guiado | Should | M | 5 | Low | Medium | Next | HU-01 |

## E2 — Gestión de Perfil
| ID | Historia | Prioridad | Tshirt | SP | Inc.Negocio | Compl.Técnica | Fase | Depende de |
|---|---|---|---|---|---|---|---|---|
| HU-04 | Datos personales | Must | S | 2 | Low | Low | Next | HU-01 |
| HU-05 | Educación (múltiples entradas) | Must | S | 3 | Low | Low | Next | HU-04 |
| HU-06 | Experiencia laboral (CRUD) | Must | M | 3 | Low | Low | Next | HU-04 |
| HU-07 | Habilidades (técnicas/blandas) | Must | S | 3 | Medium | Low | Next | HU-04 |
| HU-08 | Barra de completitud | Should | S | 2 | Low | Low | Next | HU-04 |
| HU-09 | Edición de cualquier sección | Should | S | 2 | Low | Low | Next | HU-04 |

## E3 — Carga y Parsing de CV (IA) ⭐ NUEVA
| ID | Historia | Prioridad | Tshirt | SP | Inc.Negocio | Compl.Técnica | Fase | Depende de |
|---|---|---|---|---|---|---|---|---|
| HU-21 | Subir CV en PDF/DOCX | Must | M | 5 | Low | Medium | Next | HU-01 |
| HU-22 | Parsing IA: extraer skills/educación/experiencia | Must | XL | 13 | High | High | Next | HU-21 |
| HU-23 | Revisar/confirmar datos pre-diligenciados | Must | M | 5 | Medium | Medium | Next | HU-22 |

**Criterios de aceptación (nuevas):**
- **HU-21** — *Como candidato, quiero subir mi CV en PDF o DOCX para que el sistema lo procese.* AC: acepta PDF y DOCX con límite de tamaño; valida el formato y rechaza otros; muestra estado de carga; el archivo queda asociado al candidato.
- **HU-22** — *Como candidato, quiero que el sistema extraiga automáticamente mis habilidades, educación y experiencia del CV para no ingresarlas a mano.* AC: devuelve datos estructurados (skills, educación, experiencia); maneja el caso de CV ilegible con mensaje claro; informa el estado de procesamiento.
- **HU-23** — *Como candidato, quiero revisar y corregir los datos extraídos antes de guardarlos.* AC: muestra los datos pre-diligenciados editables; el candidato confirma o corrige; al confirmar se persisten en el perfil.

## E4 — Preferencias Laborales
| ID | Historia | Prioridad | Tshirt | SP | Inc.Negocio | Compl.Técnica | Fase | Depende de |
|---|---|---|---|---|---|---|---|---|
| HU-10 | Aspiración salarial (min/max) | Must | S | 2 | Low | Low | Next | HU-04 |
| HU-11 | Modalidad (presencial/remoto/híbrido) | Must | S | 2 | Low | Low | Next | HU-04 |
| HU-12 | Ubicación deseada | Must | S | 2 | Low | Low | Next | HU-04 |
| HU-13 | Disponibilidad laboral | Should | S | 2 | Low | Low | Next | HU-04 |

## E5 — Motor de Recomendación & Vacantes
| ID | Historia | Prioridad | Tshirt | SP | Inc.Negocio | Compl.Técnica | Fase | Depende de |
|---|---|---|---|---|---|---|---|---|
| HU-24 | Algoritmo de scoring (motor) | Must | L | 8 | Medium | High | Next | HU-07, E4, dataset |
| HU-14 | Lista de vacantes recomendadas | Must | M | 5 | Medium | Medium | Next | HU-24 |
| HU-15 | Puntaje de compatibilidad por vacante | Must | S | 3 | Medium | Medium | Next | HU-24 |
| HU-16 | Detalle de vacante | Should | S | 2 | Low | Low | Next | HU-14 |
| HU-17 | Filtros (modalidad/ciudad/salario) | Should | M | 3 | Low | Medium | Last | HU-14 |

**Criterio de aceptación (nueva):**
- **HU-24** — *Como sistema, quiero calcular un puntaje de compatibilidad entre perfil y vacante según skills, experiencia, salario y modalidad.* AC: determinista (mismos datos → mismo score); pondera los 4 factores; expone el desglose del puntaje; cubierta por pruebas unitarias (enlaza con HU-NF-04).

## E6 — Postulación & Seguimiento
| ID | Historia | Prioridad | Tshirt | SP | Inc.Negocio | Compl.Técnica | Fase | Depende de |
|---|---|---|---|---|---|---|---|---|
| HU-18 | Simular postulación | Must | S | 3 | Low | Low | Next | HU-14 |
| HU-19 | Historial de postulaciones | Must | S | 2 | Low | Low | Next | HU-18 |
| HU-20 | Estado de postulación | Should | S | 3 | Low | Low | Last | HU-18 |

## E7 — Módulo Administrador ⭐ NUEVA
| ID | Historia | Prioridad | Tshirt | SP | Inc.Negocio | Compl.Técnica | Fase | Depende de |
|---|---|---|---|---|---|---|---|---|
| HU-25 | Login de administrador | Should | S | 2 | Low | Low | Last | — |
| HU-26 | Ingesta de lote de vacantes (JSON/API) | Should | M | 5 | Medium | Medium | Last | HU-25 |
| HU-27 | Configurar pesos del motor | Could | M | 5 | High | Medium | Later | HU-24, HU-25 |
| HU-28 | Sincronizar/recalcular scores | Could | M | 5 | Medium | High | Later | HU-24, HU-26 |
| HU-29 | Panel de métricas | Could | L | 8 | Medium | Medium | Later | HU-18, HU-26 |

**Criterios de aceptación (nuevas):**
- **HU-25** — *Como administrador, quiero iniciar sesión con credenciales privilegiadas.* AC: rol admin diferenciado; rutas de admin restringidas.
- **HU-26** — *Como administrador, quiero cargar un lote de vacantes (JSON o API).* AC: valida esquema; inserta/actualiza vacantes; reporta cuántas cargó y los errores.
- **HU-27** — *Como administrador, quiero ajustar los pesos de coincidencia.* AC: los pesos se persisten y afectan el cálculo del score.
- **HU-28** — *Como administrador, quiero recalcular los puntajes tras cambios.* AC: proceso que recorre perfiles/vacantes y actualiza scores; informa el resultado.
- **HU-29** — *Como administrador, quiero un panel de métricas.* AC: dashboard con ≥3 métricas (tasa de postulación, efectividad de matches, salud) desde datos reales de la BD.

## E8 — Calidad & No Funcionales
| ID | Historia | Prioridad | Tshirt | SP | Inc.Negocio | Compl.Técnica | Fase | Depende de |
|---|---|---|---|---|---|---|---|---|
| HU-NF-01 | Respuesta < 2 s | Should | S | 2 | Low | Medium | Next | — |
| HU-NF-02 | Secretos fuera del repo (.env) | Must | XS | 1 | Low | Low | Next | — |
| HU-NF-03 | Validación/sanitización de inputs | Must | S | 3 | Low | Medium | Next | — |
| HU-NF-04 | Pruebas unitarias (funciones críticas) | Should | M | 3 | Low | Medium | Last | HU-24 |
| HU-NF-05 | README de setup | Must | XS | 1 | Low | Low | Next | — |

---

## Resumen para el Cono / justificación del 60%
- **Total estimado ≈ 119 SP** (borrador).
- **Fase "Next" (meta de Entrega 2) ≈ 85 SP (~71%)** → holgado sobre el 60% exigido.
- **Ítem de mayor riesgo:** HU-22 (parsing IA, 13 SP, alta incertidumbre + alta complejidad). Si hay que recortar, los candidatos a diferir son **E7 Administrador** (ya en Later/Last) y, en el peor caso, degradar HU-22 a un parser básico (regex/heurístico) en vez de LLM.
- **Recomendación de alcance del 60%:** E1 + E2 + E4 + E5 (con HU-24) + E6 básico + NF esenciales. E3 (CV Parser) como diferenciador si el tiempo alcanza; E7 (Admin) fuera del 60%.

## Pendiente del equipo
1. Correr **Poker Planning** para fijar SP/incertidumbre/complejidad reales (reemplaza el borrador).
2. Confirmar el alcance del 60% (¿E3 y E7 dentro o fuera?).
3. Marcar qué HU ya están implementadas para justificar el avance.
