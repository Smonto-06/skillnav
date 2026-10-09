# Diagramas de Arquitectura - SkillNav (Entrega 2)

Los 4 diagramas de arquitectura requeridos por la Entrega 2.
Renderizados automaticamente por GitHub (Mermaid).

# Diagramas de Arquitectura - SkillNav (Entrega 2)

Los 4 diagramas reflejan la **arquitectura real** del repositorio
[Smonto-06/skillnav](https://github.com/Smonto-06/skillnav), inspeccionado en el commit
base `3e8a5d8` (`feat(E1-E8): implementar nucleo del 60% de SkillNav`).

Stack real verificado en el código: **Next.js 14.2.5 (App Router) + TypeScript + React 18 +
Tailwind 3 + Prisma 5.20 + PostgreSQL + Zod**. Nota de arquitectura importante: el repo **no
usa Route Handlers/API REST** para el flujo principal; las lecturas se hacen en **Server
Components** (Prisma directo) y las mutaciones en **Server Actions** (`"use server"`). La sesión
es una **cookie firmada con HMAC-SHA256** (`session.ts`) y las contraseñas se guardan con
**scrypt** (`password.ts`). El scoring vive en `src/lib/scoring.ts` (`matchScore`, `PESOS_DEFAULT`)
y el recomendador en `src/lib/recommender.ts` (`buildRecommendations`, `parseRequisitos`).

---

## Diagrama 1 - Diagrama de Clases de Diseño

Visión orientada a objetos del dominio (no es el modelo de BD). Incluye las entidades del perfil,
las vacantes y postulaciones, y la capa de servicio de recomendación/scoring tal como está
implementada. Métodos derivados de funciones reales del código (`matchScore`, `buildRecommendations`,
`parseRequisitos`, `completitud`).

```mermaid
classDiagram
    direction LR

    class Candidato {
      +String id
      +String email
      +String passwordHash
      +String nombre
      +String ciudad
      +String contacto
      +String disponibilidad
      +habilidadesNombres() String[]
      +calcularCompletitud() Completitud
    }

    class Educacion {
      +String id
      +String institucion
      +String titulo
      +int anio
    }

    class Experiencia {
      +String id
      +String empresa
      +String cargo
      +DateTime fechaInicio
      +DateTime fechaFin
      +String descripcion
    }

    class Habilidad {
      +String id
      +String nombre
      +TipoHabilidad tipo
    }

    class Preferencia {
      +String id
      +int salarioMin
      +int salarioMax
      +Modalidad modalidad
      +String ubicacion
      +String disponibilidad
    }

    class Vacante {
      +String id
      +String titulo
      +String empresa
      +String descripcion
      +String requisitos
      +int salario
      +Modalidad modalidad
      +String ciudad
      +requisitosLista() String[]
    }

    class Postulacion {
      +String id
      +EstadoPostulacion estado
      +DateTime fecha
    }

    class Recomendador {
      +buildRecommendations(perfil, vacantes) Recomendacion[]
      +parseRequisitos(texto) String[]
    }

    class MotorScoring {
      +Object PESOS_DEFAULT
      +matchScore(perfil, vacante, pesos) ResultadoScore
    }

    class Recomendacion {
      +Vacante vacante
      +int score
      +Desglose desglose
    }

    class Desglose {
      +float skills
      +float salario
      +float modalidad
      +float ubicacion
    }

    class TipoHabilidad {
      <<enumeration>>
      TECNICA
      BLANDA
    }

    class Modalidad {
      <<enumeration>>
      PRESENCIAL
      REMOTO
      HIBRIDO
    }

    class EstadoPostulacion {
      <<enumeration>>
      POSTULADO
      EN_REVISION
      ENTREVISTA
      DESCARTADO
    }

    Candidato "1" *-- "0..*" Educacion : composicion
    Candidato "1" *-- "0..*" Experiencia : composicion
    Candidato "1" *-- "0..*" Habilidad : composicion
    Candidato "1" *-- "0..1" Preferencia : composicion
    Candidato "1" *-- "0..*" Postulacion : composicion
    Vacante "1" *-- "0..*" Postulacion : composicion
    Postulacion --> "1" Vacante : referencia
    Habilidad --> TipoHabilidad
    Preferencia --> Modalidad
    Vacante --> Modalidad
    Postulacion --> EstadoPostulacion
    Recomendador ..> MotorScoring : usa
    Recomendador ..> Recomendacion : produce
    Recomendacion o-- Desglose : agrega
    Recomendacion --> Vacante
    MotorScoring ..> Desglose : genera
```

---

## Diagrama 2 - Diagrama Entidad-Relación (ER)

Mapeo fiel de `prisma/schema.prisma`: entidades, atributos con tipos, PK/FK/UK y cardinalidades.
`Preferencia` es 1:1 con `Candidato` (`candidatoId` es `@unique`); el resto de relaciones son 1:N.
Todas las FK hacia `Candidato` tienen `onDelete: Cascade`.

```mermaid
erDiagram
    CANDIDATO ||--o{ EDUCACION : tiene
    CANDIDATO ||--o{ EXPERIENCIA : tiene
    CANDIDATO ||--o{ HABILIDAD : tiene
    CANDIDATO ||--o| PREFERENCIA : define
    CANDIDATO ||--o{ POSTULACION : realiza
    VACANTE ||--o{ POSTULACION : recibe

    CANDIDATO {
      string id PK
      string email UK
      string passwordHash
      string nombre
      string ciudad
      string contacto
      string disponibilidad
      datetime createdAt
      datetime updatedAt
    }

    EDUCACION {
      string id PK
      string candidatoId FK
      string institucion
      string titulo
      int anio
    }

    EXPERIENCIA {
      string id PK
      string candidatoId FK
      string empresa
      string cargo
      datetime fechaInicio
      datetime fechaFin
      string descripcion
    }

    HABILIDAD {
      string id PK
      string candidatoId FK
      string nombre
      TipoHabilidad tipo
    }

    PREFERENCIA {
      string id PK
      string candidatoId FK "UNIQUE (1:1)"
      int salarioMin
      int salarioMax
      Modalidad modalidad
      string ubicacion
      string disponibilidad
    }

    VACANTE {
      string id PK
      string titulo
      string empresa
      string descripcion
      string requisitos
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
```

---

## Diagrama 3 - Diagrama de Componentes

Componentes reales y sus interfaces. El cliente (navegador) habla con el servidor Next.js por dos
vías: **render de Server Components** (HTTP GET) y **Server Actions** vía `form action` (POST). La
capa de dominio en `src/lib` concentra validación (zod), sesión/seguridad (HMAC + scrypt), scoring
y recomendación; el acceso a datos es exclusivo de **Prisma Client**, que habla SQL con PostgreSQL.

```mermaid
flowchart TB
    subgraph Cliente["Navegador (Cliente)"]
      UI["React 18 - Server/Client Components<br/>Formularios HTML (form action)"]
    end

    subgraph Servidor["Next.js 14 App Router (Node.js)"]
      RSC["Server Components<br/>/perfil /preferencias /recomendaciones /postulaciones"]
      SA["Server Actions ('use server')<br/>auth - perfil - preferencias - postulaciones"]
      subgraph Dominio["Capa de dominio (src/lib)"]
        VAL["validation.ts (zod)"]
        AUTH["auth.ts - session.ts (HMAC) - password.ts (scrypt)"]
        REC["recommender.ts<br/>buildRecommendations()"]
        SCO["scoring.ts<br/>matchScore() - PESOS_DEFAULT"]
        COMP["completeness.ts<br/>completitud()"]
      end
      PRISMA["Prisma Client<br/>(src/lib/prisma.ts)"]
    end

    DB[("PostgreSQL")]

    UI -->|"HTTP GET (render RSC)"| RSC
    UI -->|"POST form action"| SA
    RSC -->|"consulta datos"| PRISMA
    RSC -->|"usa"| REC
    RSC -->|"usa"| COMP
    RSC -->|"lee sesion"| AUTH
    SA -->|"valida"| VAL
    SA -->|"sesion / credenciales"| AUTH
    SA -->|"muta datos"| PRISMA
    REC -->|"invoca"| SCO
    PRISMA -->|"SQL (TCP/SSL)"| DB
```

---

## Diagrama 4 - Diagrama de Despliegue

Topología de producción **objetivo/recomendada** para la Entrega 2. Nota honesta: el repo en el
commit base **no incluye todavía manifiestos de despliegue** (`vercel.json`, IaC); esta es la
topología propuesta coherente con el stack (server Next.js en Vercel, PostgreSQL gestionado en
Supabase o Railway). El servidor Node.js renderiza RSC y ejecuta Server Actions, y se conecta a la
BD por Prisma sobre TCP/SSL usando `DATABASE_URL`.

```mermaid
flowchart LR
    subgraph ClienteNodo["Nodo Cliente"]
      Browser["Navegador del usuario<br/>HTML + JS (React 18)"]
    end

    subgraph VercelNodo["Nodo Servidor - Vercel (Node.js 20)"]
      NextApp["App Next.js 14<br/>Server Components + Server Actions<br/>Prisma Client"]
    end

    subgraph BDNodo["Nodo Base de Datos - Supabase / Railway"]
      Postgres[("PostgreSQL 15")]
    end

    Browser -->|"HTTPS (443)"| NextApp
    NextApp -->|"Prisma - TCP 5432 (SSL)<br/>DATABASE_URL"| Postgres

    ENV["Variables de entorno<br/>DATABASE_URL - SESSION_SECRET"] -.->|"inyectadas en build/runtime"| NextApp
```

---

### Coherencia cruzada

- Las entidades del ER (Candidato, Educacion, Experiencia, Habilidad, Preferencia, Vacante,
  Postulacion) aparecen como clases en el Diagrama 1, con los mismos enums (`TipoHabilidad`,
  `Modalidad`, `EstadoPostulacion`).
- Los componentes del Diagrama 3 (`scoring.ts`, `recommender.ts`, `auth/session/password`,
  Prisma) coinciden con las clases de servicio del Diagrama 1 (`MotorScoring`, `Recomendador`) y
  con los nodos del Diagrama 4.
- Fuente única de verdad: código real del repo en el commit `3e8a5d8`.
