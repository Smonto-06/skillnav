import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Catalogo mock de vacantes para las recomendaciones (E5).
  const vacantes = [
    {
      titulo: "Frontend Developer",
      empresa: "Magneto",
      descripcion: "Desarrollo de interfaces con React y Next.js.",
      requisitos: "React, TypeScript, Tailwind",
      salario: 4500,
      modalidad: "REMOTO" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Backend Developer",
      empresa: "Bancolombia",
      descripcion: "APIs y servicios con Node y PostgreSQL.",
      requisitos: "Node, PostgreSQL, Prisma",
      salario: 5000,
      modalidad: "HIBRIDO" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Full Stack Engineer",
      empresa: "Rappi",
      descripcion: "Producto end-to-end.",
      requisitos: "React, Node, TypeScript",
      salario: 6000,
      modalidad: "PRESENCIAL" as const,
      ciudad: "Bogota",
    },
  ];

  for (const v of vacantes) {
    await prisma.vacante.create({ data: v });
  }

  console.log(`Seed: ${vacantes.length} vacantes creadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
