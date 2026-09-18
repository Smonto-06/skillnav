# SkillNav

**Plataforma inteligente de perfilamiento y recomendacion de oportunidades laborales.**  
Proyecto Magneto — Ingenieria de Software, Universidad EAFIT (2026-2).

## Backlog

El Product Backlog completo con epicas, historias de usuario, estimaciones y el Cono de la Incertidumbre esta en:

**[docs/BACKLOG.md](docs/BACKLOG.md)**

### Epicas

| # | Epica | Estado |
|---|---|---|
| E1 | Autenticacion & Onboarding | Implementado (Sprint 1) |
| E2 | Gestion de Perfil (CRUD) | Implementado (Sprint 1) |
| E3 | Carga y Parsing de CV (IA) | Diferido (fase posterior) |
| E4 | Preferencias Laborales | Implementado (Sprint 1) |
| E5 | Motor de Recomendacion & Vacantes | Implementado (Sprint 1) |
| E6 | Postulacion & Seguimiento | Implementado (Sprint 1) |
| E7 | Modulo Administrador | Diferido (fase posterior) |
| E8 | Calidad & No Funcionales | Implementado (Sprint 1) |

**60% entregado (Sprint 1):** E1 + E2 + E4 + E5 + E6 + E8 — 71 SP de 119 SP totales.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- **Vitest** (17 pruebas unitarias)

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Como correr localmente

```bash
# 1. Clonar e instalar
git clone https://github.com/Smonto-06/skillnav
cd skillnav
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env: DATABASE_URL y SESSION_SECRET

# 3. Crear el esquema en la BD
npx prisma migrate dev --name init

# 4. Cargar datos de ejemplo (3 vacantes mock)
npx prisma db seed

# 5. Iniciar el servidor de desarrollo
npm run dev
```

Abrir http://localhost:3000

## Verificacion

```bash
npm test        # 5 test files, 17 tests passed
npm run build   # Debe compilar sin errores (9 rutas)
```

## Rutas de la aplicacion

| Ruta | Descripcion |
|---|---|
| `/` | Landing page |
| `/registro` | Crear cuenta |
| `/login` | Iniciar sesion |
| `/perfil` | Ver y editar perfil (datos, habilidades, educacion) |
| `/perfil/experiencia/[id]` | Formulario de experiencia (crear/editar/eliminar) |
| `/preferencias` | Configurar preferencias laborales |
| `/recomendaciones` | Lista de vacantes ordenadas por Match Score |
| `/postulaciones` | Historial de postulaciones |

## Estructura del proyecto

```
skillnav/
├── docs/
│   └── BACKLOG.md         # Product Backlog v2 (epicas + Cono de la Incertidumbre)
├── prisma/
│   ├── schema.prisma      # Modelo de datos (Candidato, Vacante, Postulacion...)
│   └── seed.ts            # Datos de prueba
└── src/
    ├── app/               # Rutas (Next.js App Router)
    │   ├── registro/      # Pagina de registro
    │   ├── login/         # Pagina de login
    │   ├── perfil/        # Perfil del candidato + CRUD experiencia
    │   ├── preferencias/  # Preferencias laborales
    │   ├── recomendaciones/ # Vacantes recomendadas con Match Score
    │   └── postulaciones/ # Historial de postulaciones
    └── lib/               # Logica de dominio
        ├── scoring.ts     # Motor de Match Score (HU-24, determinista)
        ├── recommender.ts # Agrega vacantes + scoring
        ├── completeness.ts # Completitud del perfil
        ├── session.ts     # Sesion firmada HMAC-SHA256
        └── password.ts    # Hash de passwords con scrypt
```

## Equipo

| Rol | Integrante |
|---|---|
| Scrum Master | Elizabeth Suescun Monsalve |
| Product Owner | Luis Miguel Marin |
| Lider Tecnico | Santiago Manco Maya |
| Diagramas | Jaime Cotes |
| Backlog / HU | Andres Mazo |
| Vision del producto | Samuel Montoya |
| Sketches | Juan Diego Munoz |
