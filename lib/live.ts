import { connection } from "next/server";

export async function live() {
  await connection();
}

export function safeNext(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return "/";
  if (/^\/(login|register|forgot-password|reset-password)(\/|$|\?)/.test(value)) return "/";
  return value;
}
