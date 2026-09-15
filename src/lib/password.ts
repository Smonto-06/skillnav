// Hash y verificación de contraseñas (HU-01/HU-02).
// Usa scrypt de la librería nativa 'crypto' (sin dependencias externas ni compilación nativa).
// Formato almacenado: "<salt hex>:<hash hex>".
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(plain, salt, KEYLEN);
  const original = Buffer.from(hash, "hex");
  // Comparación en tiempo constante para evitar timing attacks.
  return original.length === test.length && timingSafeEqual(original, test);
}
