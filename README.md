# SkillNav

Plataforma web de perfilamiento y recomendacion de oportunidades laborales.  
Reto Magneto — Ingenieria de Software, Universidad EAFIT (2026-2).

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

## Pruebas

```bash
npm test       # 17 pruebas unitarias
npm run build  # verificacion de compilacion
```

## Estructura

```
skillnav/
├── docs/
│   ├── entrega-2/     # Diagramas de arquitectura y documentacion de la entrega 2
│   └── entrega-3/     # Documentacion de la entrega 3 (pendiente)
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
