import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 32);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(password, salt, 32);
  const actual = Buffer.from(hash, "hex");
  if (actual.length !== derived.length) return false;
  return timingSafeEqual(actual, derived);
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
