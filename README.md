# SkillNav

Plataforma web de perfilamiento y recomendacion de oportunidades laborales.
Reto Magneto - Ingenieria de Software, Universidad EAFIT (2026-2).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Vitest

## Instalacion

```bash
git clone https://github.com/Smonto-06/skillnav
cd skillnav
npm install
cp .env.example .env
# Editar .env con DATABASE_URL y SESSION_SECRET
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Abrir http://localhost:3000

## Rutas

| Ruta | Descripcion |
|---|---|
| `/registro` | Crear cuenta |
| `/login` | Iniciar sesion |
| `/perfil` | Perfil del candidato (datos, educacion, experiencia, habilidades) |
| `/preferencias` | Preferencias laborales (salario, modalidad, ubicacion) |
| `/recomendaciones` | Vacantes recomendadas ordenadas por compatibilidad |
| `/postulaciones` | Historial de postulaciones |
| `/admin/login` | Acceso al panel de administracion |
| `/admin/vacantes` | Catalogo de vacantes: crear, editar y eliminar |

## Panel de administracion

Las rutas `/admin/*` exigen una cuenta con rol `ADMIN`. No hay registro publico
de administradores: la primera cuenta se crea desde la terminal.

```bash
# Crear una cuenta de administrador
npm run admin -- admin@ejemplo.com MiContrasena123

# O promover una cuenta de candidato que ya existe
npm run admin -- correo@existente.com
```

Desde el panel se gestiona el catalogo de vacantes. Una vacante que ya tiene
postulaciones no se puede eliminar, para no borrar el historial del candidato.

## Motor de compatibilidad (Match Score)

El puntaje de cada vacante (`src/lib/scoring.ts`) combina seis dimensiones:

| Dimension | Peso | Que mide |
|---|---|---|
| Habilidades | 40% | Requisitos cubiertos, ponderados por el nivel y los anos declarados |
| Afinidad de rol | 20% | Titular y cargos del candidato frente al rol de la vacante |
| Experiencia | 15% | Anos de experiencia relevante frente al minimo de la vacante |
| Salario | 10% | Salario de la vacante dentro del rango esperado |
| Modalidad | 10% | Presencial / remoto / hibrido |
| Ubicacion | 5% | Ciudad (no aplica en remoto) |

La taxonomia (`src/lib/taxonomia.ts`) resuelve la ambiguedad del texto libre:
sinonimos (Node = Node.js = NodeJS), equivalencias (PostgreSQL cubre SQL, Next.js
cubre React), habilidades afines con credito parcial (MySQL ~ PostgreSQL) y areas
profesionales (un perfil Full Stack cubre una vacante Backend). Las tecnologias
mencionadas en el resumen o en las funciones de un cargo reciben credito parcial.

## Base de datos en despliegue

`npm run build` ejecuta `prisma db push` antes de compilar, asi que los cambios
del esquema llegan solos a la base de datos al desplegar en Vercel. Los cambios
deben ser aditivos (campos opcionales o con valor por defecto): si un cambio
implica perdida de datos, `db push` falla y el despliegue se detiene sin tocar
produccion.

## Pruebas

```bash
npm test       # pruebas unitarias
npm run build  # verificacion de compilacion
```

## Estructura

```
skillnav/
├── prisma/
│   ├── schema.prisma  # Modelo de datos
│   └── seed.ts        # Datos de prueba
└── src/
    ├── app/           # Paginas y Server Actions (Next.js App Router)
    └── lib/           # Logica de dominio (scoring, sesion, validacion)
```

## Equipo

| Rol | Integrante |
|---|---|
| Scrum Master | Elizabeth Suescun |
| Product Owner | Luis Miguel Marin |
| Lider Tecnico | Santiago Manco Maya |
| Desarrollo | Jaime Cotes, Andres Mazo, Samuel Montoya, Juan Diego Munoz |
