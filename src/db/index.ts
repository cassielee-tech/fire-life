import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { initDb } from "./init";

const dbPath =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "fire-life.db");

type GlobalWithDb = typeof globalThis & {
  __fireLifeDb?: Database.Database;
  __fireLifeOrm?: ReturnType<typeof drizzle<typeof schema>>;
};

const g = globalThis as GlobalWithDb;

function createConnection() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = DELETE");
  sqlite.pragma("foreign_keys = ON");
  initDb(sqlite);
  sqlite
    .prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)")
    .run("base_currency", "CNY");
  return sqlite;
}

export const sqlite = g.__fireLifeDb ?? createConnection();
if (process.env.NODE_ENV !== "production") g.__fireLifeDb = sqlite;

export const db = g.__fireLifeOrm ?? drizzle(sqlite, { schema });
if (process.env.NODE_ENV !== "production") g.__fireLifeOrm = db;

export { schema };
export { dbPath };
