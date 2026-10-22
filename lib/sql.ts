import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { Row } from "./rows";

export function run(db: DatabaseSync, sql: string, ...params: SQLInputValue[]) {
  return db.prepare(sql).run(...params);
}

export function one(db: DatabaseSync, sql: string, ...params: SQLInputValue[]) {
  return db.prepare(sql).get(...params) as Row | undefined;
}

export function many(db: DatabaseSync, sql: string, ...params: SQLInputValue[]) {
  return db.prepare(sql).all(...params) as Row[];
}

export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The original error is the one that matters.
    }
    throw error;
  }
}
