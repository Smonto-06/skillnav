// Crea o promueve una cuenta de administrador (HU-25).
// No hay registro público de admins a propósito: el primer admin se crea desde
// la terminal por alguien que ya tiene acceso a la base de datos.
//
//   npm run admin -- correo@ejemplo.com MiContrasena123
//
// Si la cuenta ya existe, solo le cambia el rol a ADMIN (y la contraseña si se
// pasa una nueva). Si no existe, la crea.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const [emailArg, password] = process.argv.slice(2);

  if (!emailArg) {
    console.error("Uso: npm run admin -- correo@ejemplo.com [contrasena]");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const existente = await prisma.candidato.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (existente) {
    await prisma.candidato.update({
      where: { id: existente.id },
      data: {
        rol: "ADMIN",
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
    });
    console.log(
      `Cuenta ${email} promovida a ADMIN${password ? " (contrasena actualizada)" : ""}.`
    );
    return;
  }

  if (!password) {
    console.error(`La cuenta ${email} no existe. Pasa una contrasena para crearla.`);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("La contrasena debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  await prisma.candidato.create({
    data: { email, passwordHash: hashPassword(password), rol: "ADMIN" },
  });
  console.log(`Cuenta de administrador ${email} creada.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
