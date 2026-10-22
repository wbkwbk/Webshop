import type { SQLOutputValue } from "node:sqlite";

export type Row = Record<string, SQLOutputValue>;

export function str(row: Row, key: string) {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected text in ${key}`);
  }
  return value;
}

export function strOrNull(row: Row, key: string) {
  const value = row[key];
  if (value == null) return null;
  return typeof value === "string" ? value : String(value);
}

export function int(row: Row, key: string) {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`Expected a number in ${key}`);
}
