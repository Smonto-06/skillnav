# SkillNav

Plataforma inteligente de perfilamiento y recomendación de oportunidades laborales.
Proyecto Magneto — Ingeniería de Software, Universidad EAFIT (2026-2).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL**

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Cómo correr localmente

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# edita .env y pon tu DATABASE_URL

# 3. Crear el esquema en la BD
npx prisma migrate dev --name init

# 4. (opcional) Cargar datos de ejemplo
npx prisma db seed

# 5. Levantar el servidor de desarrollo
npm run dev
```

Abre http://localhost:3000

## Estructura

```
skillnav/
├── prisma/
│   └── schema.prisma      # Modelo de datos (Candidato, Vacante, Postulacion, ...)
├── src/
│   ├── app/               # Rutas (App Router) y Route Handlers (/api)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── lib/               # Utilidades (prisma client, scoring, validaciones)
├── docs/
│   └── BACKLOG.md         # Product Backlog v2 (épicas + Cono de la Incertidumbre)
├── .env.example
└── package.json
```

## Alcance Entrega 2 (60%)

Núcleo comprometido: Autenticación & Onboarding (E1), Perfil (E2), Preferencias (E4),
Motor de Recomendación (E5, con el algoritmo de scoring), Postulación & Seguimiento (E6)
y No Funcionales esenciales (E8). Los módulos CV Parser con IA (E3) y Administrador (E7)
quedan como fase posterior. Ver `docs/BACKLOG.md`.

## Equipo

Scrum Master: Elizabeth Suescún · Product Owner: Luis Miguel Marín · Líder Técnico: Santiago Manco
Integrantes: Jaime Cotes · Andrés Mazo · Samuel Montoya · Juan Diego Muñoz
