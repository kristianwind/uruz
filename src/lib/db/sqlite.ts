import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Local development data backend built on Node's built-in `node:sqlite`.
 *
 * Zero external dependencies and zero setup — the app runs immediately against
 * a file DB. In production the same repository surface (`@/lib/db`) is backed
 * by Supabase Postgres with Row Level Security; here, access scoping is applied
 * in the repository layer instead.
 *
 * All access goes through the singleton returned by `getDb()`.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_PATH =
  process.env.URUZ_SQLITE_PATH ||
  join(process.cwd(), ".data", "uruz.sqlite");

const SCHEMA_PATH = join(__dirname, "schema.sqlite.sql");

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  const schema = readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  instance = db;
  return db;
}

/** Reset the cached connection (used by scripts that rebuild the DB file). */
export function closeDb(): void {
  instance?.close();
  instance = null;
}

// ---- Row-mapping helpers -------------------------------------------------

export type Row = Record<string, unknown>;

export const toBool = (v: unknown): boolean => v === 1 || v === true || v === "1";
export const fromBool = (v: boolean): number => (v ? 1 : 0);

export const toNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

export function toJsonArray(v: unknown): string[] {
  if (typeof v !== "string" || v.length === 0) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toJsonObject(v: unknown): Record<string, unknown> | null {
  if (typeof v !== "string" || v.length === 0) return null;
  try {
    const parsed = JSON.parse(v);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export const asStr = (v: unknown): string => (v == null ? "" : String(v));
export const asStrOrNull = (v: unknown): string | null =>
  v == null ? null : String(v);

/** ISO-8601 timestamp for "now" (all timestamps in the DB are ISO strings). */
export const nowIso = (): string => new Date().toISOString();

/** UUID generator used for all primary keys. */
export const newId = (): string => crypto.randomUUID();
