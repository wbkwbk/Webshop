import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SESSION_DAYS } from "./constants";
import { getDb } from "./db";
import { sha256 } from "./password";
import { str } from "./rows";
import { one, run } from "./sql";
import { getUserById } from "./shop";

const COOKIE = "hundert_session";

export async function readSessionUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = one(
    getDb(),
    "SELECT user_id, expires_at FROM sessions WHERE token_hash = ?",
    sha256(token),
  );
  if (!row) return null;
  if (str(row, "expires_at") <= new Date().toISOString()) {
    run(getDb(), "DELETE FROM sessions WHERE token_hash = ?", sha256(token));
    return null;
  }
  return getUserById(getDb(), str(row, "user_id"));
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  run(
    getDb(),
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    crypto.randomUUID(),
    userId,
    sha256(token),
    expires.toISOString(),
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires,
  });
}

export async function requireUser(next = "/") {
  await connection();
  const user = await readSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run(getDb(), "DELETE FROM sessions WHERE token_hash = ?", sha256(token));
  jar.delete(COOKIE);
}
