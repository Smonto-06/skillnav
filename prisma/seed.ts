import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Borra las vacantes del seed anterior para evitar duplicados al re-ejecutar.
  await prisma.vacante.deleteMany({
    where: {
      empresa: { in: ["Magneto", "Bancolombia", "Rappi", "Grupo Exito", "EPM", "Accenture"] },
    },
  });

  const vacantes = [
    {
      titulo: "Frontend Developer",
      empresa: "Magneto",
      descripcion: "Desarrollo de interfaces con React y Next.js para plataforma de empleo.",
      requisitos: "React, TypeScript, Tailwind",
      salario: 4500,
      modalidad: "REMOTO" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Backend Developer",
      empresa: "Bancolombia",
      descripcion: "APIs REST y microservicios con Node.js y PostgreSQL.",
      requisitos: "Node, PostgreSQL, SQL",
      salario: 5000,
      modalidad: "HIBRIDO" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Full Stack Engineer",
      empresa: "Rappi",
      descripcion: "Desarrollo de producto end-to-end para plataforma de delivery.",
      requisitos: "React, Node, TypeScript",
      salario: 6000,
      modalidad: "PRESENCIAL" as const,
      ciudad: "Bogota",
    },
    {
      titulo: "Data Analyst",
      empresa: "Grupo Exito",
      descripcion: "Analisis de datos de ventas y comportamiento de clientes.",
      requisitos: "Python, SQL",
      salario: 3800,
      modalidad: "HIBRIDO" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Software Engineer",
      empresa: "EPM",
      descripcion: "Desarrollo de sistemas internos para empresa de servicios publicos.",
      requisitos: "Python, React, PostgreSQL",
      salario: 5500,
      modalidad: "PRESENCIAL" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Cloud Developer",
      empresa: "Accenture",
      descripcion: "Migracion y desarrollo de aplicaciones en la nube.",
      requisitos: "Node, TypeScript, SQL",
      salario: 7000,
      modalidad: "REMOTO" as const,
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
