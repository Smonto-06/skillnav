// Crea o promueve el primer administrador durante el despliegue (HU-25).
//
// Por que existe: en un entorno gestionado como Vercel no hay terminal contra
// la base de produccion, y la cadena de conexion puede estar marcada como
// sensible —es decir, no se puede volver a leer—. Este paso corre dentro del
// build, donde DATABASE_URL ya esta disponible, y hace el alta sin que nadie
// tenga que conocer la credencial.
//
// Es INERTE por defecto: sin las dos variables de entorno no toca la base.
// Para usarlo, definir en Vercel y redesplegar:
//
//   ADMIN_BOOTSTRAP_EMAIL=correo@ejemplo.com
//   ADMIN_BOOTSTRAP_PASSWORD=una-clave-de-8-o-mas
//
// Despues del despliegue conviene borrar las dos variables: la cuenta ya
// quedo creada y la clave no tiene por que seguir ahi.
//
// Nunca hace fallar el build: cualquier error se reporta y se sale con 0.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const ETIQUETA = "[bootstrap-admin]";

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    console.log(`${ETIQUETA} sin variables de bootstrap; no se toca la base.`);
    return;
  }
  if (password.length < 8) {
    console.warn(`${ETIQUETA} la contrasena es muy corta (minimo 8); no se hace nada.`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existente = await prisma.candidato.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, rol: true },
    });

    if (existente) {
      await prisma.candidato.update({
        where: { id: existente.id },
        data: { rol: "ADMIN", passwordHash: hashPassword(password) },
      });
      console.log(
        `${ETIQUETA} ${email} queda como ADMIN con la clave indicada ` +
          `(su rol anterior era ${existente.rol}).`
      );
    } else {
      await prisma.candidato.create({
        data: { email, passwordHash: hashPassword(password), rol: "ADMIN" },
      });
      console.log(`${ETIQUETA} cuenta ${email} creada como ADMIN.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  // Un fallo aca no debe impedir el despliegue: la aplicacion funciona igual
  // sin administrador, y dejar el sitio caido seria peor que no crear la cuenta.
  .catch((e) => console.error(`${ETIQUETA} no se pudo completar: ${e?.message ?? e}`))
  .finally(() => process.exit(0));
