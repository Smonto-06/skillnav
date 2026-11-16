
# Diagramas de Arquitectura y Diseño — Entrega 3

## 1. Diagrama de Clases General

```mermaid
classDiagram
    direction TB

    %% ---------- Analisis de hoja de vida (HU-21 a HU-23) ----------
    class ExtractorTexto {
        <<interface>>
        +formato: string
        +extraer(archivo: ArchivoCV) Promise~string~
    }
    class ExtractorPdf {
        +formato = "PDF"
        +extraer(archivo) Promise~string~
    }
    class ExtractorDocx {
        +formato = "DOCX"
        +extraer(archivo) Promise~string~
    }
    class ExtractorTextoPlano {
        +formato = "TXT"
        +extraer(archivo) Promise~string~
    }
    class ExtractorFactory {
        -POR_MIME: Record
        -POR_EXTENSION: Record
        +crear(archivo) ExtractorTexto
        +extensionDe(nombre) string
        +formatosSoportados() string[]
    }
    ExtractorTexto <|.. ExtractorPdf
    ExtractorTexto <|.. ExtractorDocx
    ExtractorTexto <|.. ExtractorTextoPlano
    ExtractorFactory ..> ExtractorTexto : crea

    class MotorAnalisisCV {
        <<interface>>
        +nombre: NombreMotor
        +disponible() boolean
        +analizar(texto: string) Promise~PerfilExtraido~
    }
    class MotorLLM {
        -cfg: ConfigLLM
        +nombre = "llm"
        +disponible() boolean
        +analizar(texto) Promise~PerfilExtraido~
    }
    class MotorReglas {
        -parser: ParserCV
        +nombre = "reglas"
        +disponible() boolean
        +analizar(texto) Promise~PerfilExtraido~
    }
    MotorAnalisisCV <|.. MotorLLM
    MotorAnalisisCV <|.. MotorReglas

    class DetectorCampo {
        <<interface>>
        +campo: string
        +detectar(ctx: ContextoCV, borrador: PerfilExtraido) void
    }
    class DetectorContacto
    class DetectorNombre
    class DetectorTitular
    class DetectorHabilidades
    class DetectorExperiencia
    class DetectorEducacion
    DetectorCampo <|.. DetectorContacto
    DetectorCampo <|.. DetectorNombre
    DetectorCampo <|.. DetectorTitular
    DetectorCampo <|.. DetectorHabilidades
    DetectorCampo <|.. DetectorExperiencia
    DetectorCampo <|.. DetectorEducacion

    class ParserCV {
        -detectores: DetectorCampo[]
        +parse(texto: string) PerfilExtraido
    }
    class ContextoCV {
        +texto: string
        +lineas: string[]
        +secciones: Map
        +layoutMezclado: boolean
        +encabezadoDe(linea) string
        +layoutEsConfiable(lineas, secciones) boolean
        +fuente(nombre) string[]
    }
    ParserCV o-- "1..*" DetectorCampo : compone
    ParserCV ..> ContextoCV : usa
    MotorReglas --> ParserCV

    %% ---------- Motor de compatibilidad (HU-24, HU-27) ----------
    class EvaluadorDimension {
        <<interface>>
        +clave: ClaveDimension
        +etiqueta: string
        +evaluar(perfil, vacante, ctx) ResultadoDimension
    }
    class EvaluadorHabilidades {
        +clave = "skills"
    }
    class EvaluadorRol {
        +clave = "rol"
        +areasDe(vacante) Area[]
    }
    class EvaluadorExperiencia {
        +clave = "experiencia"
    }
    class EvaluadorSalario {
        +clave = "salario"
    }
    class EvaluadorModalidad {
        +clave = "modalidad"
    }
    class EvaluadorUbicacion {
        +clave = "ubicacion"
    }
    EvaluadorDimension <|.. EvaluadorHabilidades
    EvaluadorDimension <|.. EvaluadorRol
    EvaluadorDimension <|.. EvaluadorExperiencia
    EvaluadorDimension <|.. EvaluadorSalario
    EvaluadorDimension <|.. EvaluadorModalidad
    EvaluadorDimension <|.. EvaluadorUbicacion

    class MotorScoring {
        -evaluadores: EvaluadorDimension[]
        -pesos: Pesos
        +calcular(perfil, vacante, ahora) ResultadoScoring
        +dimensiones() Array
    }
    MotorScoring o-- "6" EvaluadorDimension : compone

    class PerfilExtraido {
        +nombre: CampoDetectado
        +email: CampoDetectado
        +telefono: CampoDetectado
        +habilidades: CampoDetectado
        +experiencias: CampoDetectado
        +educacion: CampoDetectado
        +layoutMezclado: boolean
        +textoOriginal: string
    }
    class ResultadoScoring {
        +score: number
        +desglose: Desglose
        +requisitos: EvaluacionRequisito[]
        +motivoRol: string
        +motivoExperiencia: string
    }
    MotorAnalisisCV ..> PerfilExtraido : produce
    MotorScoring ..> ResultadoScoring : produce
```

---

## 2. Diagrama Entidad-Relación (ER)

```mermaid
erDiagram
    CANDIDATO ||--o{ EDUCACION : tiene
    CANDIDATO ||--o{ EXPERIENCIA : tiene
    CANDIDATO ||--o{ HABILIDAD : tiene
    CANDIDATO ||--o| PREFERENCIA : define
    CANDIDATO ||--o| BORRADOR_CV : "tiene pendiente"
    CANDIDATO ||--o{ POSTULACION : realiza
    VACANTE ||--o{ POSTULACION : recibe

    CANDIDATO {
        string id PK
        string email UK
        string passwordHash
        Rol rol "CANDIDATO | ADMIN"
        string nombre
        string ciudad
        string contacto
        string titular "define afinidad de rol"
        string resumen
        string linkedin
        NivelIdioma nivelIngles
        datetime createdAt
        datetime updatedAt
    }
    EDUCACION {
        string id PK
        string candidatoId FK
        string institucion
        string titulo
        int anio
        NivelEducativo nivel
        boolean enCurso
    }
    EXPERIENCIA {
        string id PK
        string candidatoId FK
        string empresa
        string cargo
        datetime fechaInicio
        datetime fechaFin
        boolean actual
        string descripcion
    }
    HABILIDAD {
        string id PK
        string candidatoId FK
        string nombre
        TipoHabilidad tipo "TECNICA | BLANDA"
        NivelHabilidad nivel
        int anios
    }
    PREFERENCIA {
        string id PK
        string candidatoId FK, UK
        int salarioMin
        int salarioMax
        Modalidad modalidad
        string ubicacion
        string disponibilidad
    }
    BORRADOR_CV {
        string id PK
        string candidatoId FK, UK
        string archivo
        json datos "PerfilExtraido sin confirmar"
        datetime createdAt
    }
    VACANTE {
        string id PK
        string titulo
        string empresa
        string descripcion
        string requisitos "lista separada por comas"
        int experienciaMin
        int salario
        Modalidad modalidad
        string ciudad
        datetime createdAt
    }
    POSTULACION {
        string id PK
        string candidatoId FK
        string vacanteId FK
        EstadoPostulacion estado
        datetime fecha
    }
    CONFIGURACION_SCORING {
        int id PK "fijo en 1"
        float skills
        float rol
        float experiencia
        float salario
        float modalidad
        float ubicacion
        string editadoPor
        datetime updatedAt
    }
    EJECUCION_RECALCULO {
        string id PK
        string ejecutadoPor
        int perfiles
        int vacantes
        int paresEvaluados
        int errores
        int duracionMs
        json detalleErrores
        datetime createdAt
    }
```

---

## 3. Diagrama de Componentes / Arquitectura

```mermaid
flowchart TB
    subgraph NAV["Navegador"]
        UI["Páginas React Server Components<br/>16 rutas"]
    end

    subgraph VERCEL["Vercel · Next.js 14 App Router"]
        subgraph PRES["Capa de presentación"]
            PUB["Públicas<br/>/ · /login · /registro"]
            CAND["Candidato<br/>/onboarding · /perfil · /perfil/cv<br/>/preferencias · /recomendaciones · /postulaciones"]
            ADM["Administración<br/>/admin/login · /admin/vacantes<br/>/admin/scoring · /admin/metricas"]
        end

        subgraph ACC["Capa de acciones · Server Actions"]
            AUTH_A["auth.ts<br/>registro · login · logout"]
            PERF_A["perfil/actions.ts<br/>8 acciones CRUD"]
            CV_A["perfil/cv/actions.ts<br/>subir · aplicar · descartar"]
            ADM_A["admin/actions.ts<br/>vacantes · pesos · recálculo"]
        end

        subgraph DOM["Capa de dominio · lib/"]
            CV["Análisis de CV<br/>extractores · parser · llm<br/>analizar · aplicar · blandas"]
            SCO["Motor de compatibilidad<br/>nucleo · evaluadores<br/>motor · configuracion"]
            TAX["Conocimiento<br/>taxonomia · trayectoria"]
            SEG["Seguridad<br/>auth · session · password"]
            MET["Métricas<br/>metricas · onboarding"]
            VAL["Validación<br/>validation · vacante"]
        end

        PRISMA["Prisma Client · ORM"]
    end

    NEON[("Neon<br/>PostgreSQL")]
    GROQ{{"Groq API<br/>openai/gpt-oss-120b"}}

    UI --> PUB & CAND & ADM
    PUB --> AUTH_A
    CAND --> PERF_A & CV_A
    ADM --> ADM_A
    AUTH_A --> SEG
    PERF_A --> VAL
    CV_A --> CV
    ADM_A --> VAL & SCO & MET
    CAND --> SCO
    CV --> TAX
    SCO --> TAX
    CV -.->|"si hay LLM_API_KEY"| GROQ
    AUTH_A & PERF_A & CV_A & ADM_A & MET --> PRISMA
    PRISMA --> NEON

    classDef ext fill:#fff4e6,stroke:#d9822b
    class NEON,GROQ ext
```

---

## 4. Diagrama de Despliegue

```mermaid
flowchart TB
    subgraph CLI["Nodo cliente · navegador del usuario"]
        BROW["Chrome / Edge / Firefox<br/>HTML + JS servido por Vercel"]
    end

    subgraph VER["Nodo de aplicación · Vercel (serverless)"]
        NEXT["Next.js 14 · Node.js 20<br/>Server Components + Server Actions"]
        PC["Prisma Client 5.22"]
        ENV["Variables de entorno<br/>DATABASE_URL · SESSION_SECRET · LLM_API_KEY"]
    end

    subgraph NE["Nodo de datos · Neon"]
        PG[("PostgreSQL 16<br/>10 tablas")]
    end

    subgraph GR["Nodo de inferencia · Groq"]
        LLM["openai/gpt-oss-120b"]
    end

    subgraph GH["Nodo de integración · GitHub"]
        REPO["Smonto-06/skillnav<br/>rama main"]
    end

    BROW -->|"HTTPS"| NEXT
    NEXT --> PC
    PC -->|"TCP 5432 · SSL"| PG
    NEXT -.->|"HTTPS · opcional"| LLM
    REPO -->|"push a main<br/>dispara el despliegue"| NEXT
    ENV -.-> NEXT

    classDef ext fill:#fff4e6,stroke:#d9822b
    class PG,LLM,REPO ext
```

---

## 5. Patrón Strategy — Análisis de CV

```mermaid
classDiagram
    direction TB
    class ExtractorTexto {
        <<interface>>
        +formato: string
        +extraer(archivo) Promise~string~
    }
    class ExtractorPdf
    class ExtractorDocx
    class ExtractorTextoPlano
    ExtractorTexto <|.. ExtractorPdf
    ExtractorTexto <|.. ExtractorDocx
    ExtractorTexto <|.. ExtractorTextoPlano

    class MotorAnalisisCV {
        <<interface>>
        +nombre: NombreMotor
        +disponible() boolean
        +analizar(texto) Promise~PerfilExtraido~
    }
    class MotorLLM
    class MotorReglas
    MotorAnalisisCV <|.. MotorLLM
    MotorAnalisisCV <|.. MotorReglas

    class extraerTextoCV {
        <<Context>>
    }
    class analizarCV {
        <<Context>>
    }
    extraerTextoCV ..> ExtractorTexto : delega
    analizarCV ..> MotorAnalisisCV : delega

    note for ExtractorTexto "Eje 1: varia el formato del archivo"
    note for MotorAnalisisCV "Eje 2: varia el motor de analisis"
```

---

## 6A. Patrón Composite — Motor de Scoring

```mermaid
classDiagram
    direction TB
    class EvaluadorDimension {
        <<interface>>
        +clave: ClaveDimension
        +etiqueta: string
        +evaluar(perfil, vacante, ctx) ResultadoDimension
    }
    class EvaluadorHabilidades
    class EvaluadorRol
    class EvaluadorExperiencia
    class EvaluadorSalario
    class EvaluadorModalidad
    class EvaluadorUbicacion
    class MotorScoring {
        -evaluadores: EvaluadorDimension[]
        -pesos: Pesos
        +calcular(perfil, vacante) ResultadoScoring
    }
    EvaluadorDimension <|.. EvaluadorHabilidades
    EvaluadorDimension <|.. EvaluadorRol
    EvaluadorDimension <|.. EvaluadorExperiencia
    EvaluadorDimension <|.. EvaluadorSalario
    EvaluadorDimension <|.. EvaluadorModalidad
    EvaluadorDimension <|.. EvaluadorUbicacion
    MotorScoring o-- "6" EvaluadorDimension : agrega
```

---

## 6B. Patrón Composite — Parser de CV

```mermaid
classDiagram
    direction TB
    class DetectorCampo {
        <<interface>>
        +campo: string
        +detectar(ctx, borrador) void
    }
    class DetectorContacto
    class DetectorNombre
    class DetectorTitular
    class DetectorHabilidades
    class DetectorExperiencia
    class DetectorEducacion
    class ParserCV {
        -detectores: DetectorCampo[]
        +parse(texto) PerfilExtraido
    }
    DetectorCampo <|.. DetectorContacto
    DetectorCampo <|.. DetectorNombre
    DetectorCampo <|.. DetectorTitular
    DetectorCampo <|.. DetectorHabilidades
    DetectorCampo <|.. DetectorExperiencia
    DetectorCampo <|.. DetectorEducacion
    ParserCV o-- "6" DetectorCampo : agrega
```

## Qué va en esta carpeta

| Archivo | Qué es |
|---|---|
| `1-clases.png` | Diagrama de clases de implementación |
| `2-entidad-relacion.png` | Modelo entidad-relación (las 10 tablas) |
| `3-componentes.png` | Diagrama de componentes |
| `4-despliegue.png` | Diagrama de despliegue |
| `5-patron-strategy.png` | Recorte del patrón Strategy |
| `6a-composite-scoring.png` | Recorte del patrón Composite — motor de scoring |
| `6b-composite-parser.png` | Recorte del patrón Composite — lector de CV |
| `diagramas-entrega3.md` | Código fuente de los diagramas, en Mermaid |
| `fuentes-recortes.mmd` | Código fuente de los recortes de patrones |
| `para-drawio/` | Los siete diagramas listos para abrir en draw.io |

Los cuatro primeros son los que exige la plantilla de la entrega. Los tres
recortes ilustran las fichas de patrones de la Sección 6 del informe.

El código fuente se versiona junto a las imágenes para poder regenerarlas si
hay que corregir algo, en lugar de depender de un editor externo.

## Cómo subirlos

Entrar a esta carpeta en GitHub, **Add file → Upload files**, arrastrar y
confirmar con **Commit changes**. Al estar ya dentro de la carpeta no hace
falta escribir ninguna ruta.
