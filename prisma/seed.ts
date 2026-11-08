import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Borra las vacantes del seed anterior para evitar duplicados al re-ejecutar.
  await prisma.vacante.deleteMany({
    where: {
      empresa: {
        in: [
          "Magneto",
          "Bancolombia",
          "Rappi",
          "Grupo Exito",
          "EPM",
          "Accenture",
          "Almacenes Flamingo",
          "Tiendas D1",
          "Sura",
          "Falabella",
        ],
      },
    },
  });

  const vacantes = [
    {
      titulo: "Frontend Developer",
      empresa: "Magneto",
      descripcion: "Desarrollo de interfaces con React y Next.js para plataforma de empleo.",
      requisitos: "React, TypeScript, Tailwind",
      experienciaMin: 2,
      salario: 4500,
      modalidad: "REMOTO" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Backend Developer",
      empresa: "Bancolombia",
      descripcion: "APIs REST y microservicios con Node.js y PostgreSQL.",
      requisitos: "Backend, Node.js, APIs REST, SQL",
      experienciaMin: 3,
      salario: 5000,
      modalidad: "HIBRIDO" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Full Stack Engineer",
      empresa: "Rappi",
      descripcion: "Desarrollo de producto end-to-end para plataforma de delivery.",
      requisitos: "React, Node, TypeScript",
      experienciaMin: 4,
      salario: 6000,
      modalidad: "PRESENCIAL" as const,
      ciudad: "Bogota",
    },
    {
      titulo: "Data Analyst",
      empresa: "Grupo Exito",
      descripcion: "Analisis de datos de ventas y comportamiento de clientes.",
      requisitos: "Python, SQL, Power BI",
      experienciaMin: 1,
      salario: 3800,
      modalidad: "HIBRIDO" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Software Engineer",
      empresa: "EPM",
      descripcion: "Desarrollo de sistemas internos para empresa de servicios publicos.",
      requisitos: "Python, React, PostgreSQL",
      experienciaMin: 3,
      salario: 5500,
      modalidad: "PRESENCIAL" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Cloud Developer",
      empresa: "Accenture",
      descripcion: "Migracion y desarrollo de aplicaciones en la nube.",
      requisitos: "Node, TypeScript, AWS, Docker",
      experienciaMin: 5,
      salario: 7000,
      modalidad: "REMOTO" as const,
      ciudad: "Bogota",
    },

    // Vacantes no técnicas. El catálogo solo tenía perfiles de tecnología, así
    // que una hoja de vida administrativa o comercial —que es la mayoría del
    // mercado al que apunta Magneto— sacaba un puntaje bajísimo en todas y
    // parecía que el motor no funcionara, cuando el problema era que no había
    // vacantes para ese perfil.
    {
      titulo: "Auxiliar Administrativo",
      empresa: "Almacenes Flamingo",
      descripcion:
        "Apoyo en gestion documental, facturacion y atencion a proveedores en la sede administrativa.",
      requisitos: "Atencion al cliente, Organizacion, Gestion del tiempo, Responsabilidad",
      experienciaMin: 1,
      salario: 1400,
      modalidad: "PRESENCIAL" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Asesor Comercial",
      empresa: "Falabella",
      descripcion:
        "Asesoria y venta en piso, manejo de caja y cumplimiento de metas comerciales.",
      requisitos: "Ventas, Atencion al cliente, Comunicacion, Trabajo en equipo",
      experienciaMin: 1,
      salario: 1600,
      modalidad: "PRESENCIAL" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Cajero",
      empresa: "Tiendas D1",
      descripcion:
        "Manejo de caja registradora, atencion al cliente y apoyo en reabastecimiento de tienda.",
      requisitos: "Manejo de caja, Atencion al cliente, Puntualidad, Trabajo bajo presion",
      experienciaMin: 0,
      salario: 1300,
      modalidad: "PRESENCIAL" as const,
      ciudad: "Medellin",
    },
    {
      titulo: "Asistente de Servicio al Cliente",
      empresa: "Sura",
      descripcion:
        "Atencion telefonica y por chat a usuarios, registro de casos y seguimiento de solicitudes.",
      requisitos: "Atencion al cliente, Comunicacion, Gestion del tiempo, Ingles",
      experienciaMin: 1,
      salario: 1800,
      modalidad: "HIBRIDO" as const,
      ciudad: "Medellin",
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
