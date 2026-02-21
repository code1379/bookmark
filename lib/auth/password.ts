import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, passwordHash: unknown) {
  if (typeof passwordHash !== "string" || !passwordHash) {
    return false;
  }

  const [salt, hash] = passwordHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const calculated = scryptSync(password, salt, KEY_LENGTH);
  const original = Buffer.from(hash, "hex");

  if (calculated.length !== original.length) {
    return false;
  }

  return timingSafeEqual(calculated, original);
}
