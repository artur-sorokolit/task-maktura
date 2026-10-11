import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

export type Db = Database.Database;

const IN_MEMORY = ":memory:";
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);
const MIGRATION_LOG =
  "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL) STRICT";

export const appliedMigrations = (db: Db): string[] =>
  db
    .prepare<[], { name: string }>("SELECT name FROM schema_migrations ORDER BY name")
    .all()
    .map((row) => row.name);

const pendingMigrations = (db: Db, dir: string): string[] =>
  fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql") && !appliedMigrations(db).includes(name))
    .toSorted();

const applyMigration = (db: Db, dir: string) =>
  db.transaction((name: string) => {
    db.exec(fs.readFileSync(path.join(dir, name), "utf8"));
    db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(
      name,
      new Date().toISOString(),
    );
  });

export const migrate = (db: Db, dir = MIGRATIONS_DIR): string[] => {
  db.exec(MIGRATION_LOG);
  const pending = pendingMigrations(db, dir);
  pending.forEach(applyMigration(db, dir));
  return pending;
};

const ensureDirectoryFor = (file: string): void => {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
};

export const openDb = (file: string): Db => {
  if (file !== IN_MEMORY) ensureDirectoryFor(file);
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
};
