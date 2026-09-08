import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { SCHEMA_SQL } from "./schema.sqlite";
import { SEED_EXERCISES } from "./seed-data";

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

const DB_PATH =
  process.env.URUZ_SQLITE_PATH ||
  join(process.cwd(), ".data", "uruz.sqlite");

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  // Every statement is CREATE ... IF NOT EXISTS, so this both creates a fresh
  // database and picks up new *tables* on one that has been running. A new
  // *column* on an existing table does not arrive this way — SQLite skips the
  // whole CREATE — which is what ADDED_COLUMNS below is for.
  db.exec(SCHEMA_SQL);
  applyColumnAdditions(db);
  addMissingSeedExercises(db);

  instance = db;
  return db;
}

/**
 * Exercises the catalogue has gained since this database was seeded.
 *
 * The full seed runs once, at first run, so an installation that has been
 * training since before a machine was added to the catalogue would never see
 * it — the library is data, but the data still has to arrive. Insert-only,
 * by slug: an exercise an admin has edited in the shared library keeps every
 * one of those edits, and a fresh database gets the same rows first-run would
 * give it anyway.
 */
function addMissingSeedExercises(db: DatabaseSync): void {
  const insert = db.prepare(
    `INSERT INTO exercises
      (id, slug, name_da, name_en, category, primary_muscles, equipment, unit,
       is_bodyweight, instructions_steps, instructions_steps_en, cues, cues_en,
       safer_variant, safer_variant_en, svg_key, image_url,
       difficulty, demo_video_url, created_by, is_public)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(slug) DO NOTHING`,
  );
  for (const ex of SEED_EXERCISES) {
    insert.run(
      newId(),
      ex.slug,
      ex.nameDa,
      ex.nameEn,
      ex.category,
      JSON.stringify(ex.primaryMuscles),
      ex.equipment,
      ex.unit,
      ex.isBodyweight ? 1 : 0,
      JSON.stringify(ex.instructionsSteps),
      JSON.stringify(ex.instructionsStepsEn),
      JSON.stringify(ex.cues),
      JSON.stringify(ex.cuesEn),
      ex.saferVariant,
      ex.saferVariantEn,
      ex.svgKey,
      null,
      ex.difficulty,
      null,
      null,
      1,
    );
  }
}

/**
 * Columns added to a table that already existed in an earlier version.
 *
 * Additive only: nothing is ever dropped or renamed, so replaying the list on
 * every start is safe and order-independent. A new column must be listed here
 * *as well as* in SCHEMA_SQL — the schema is what a fresh database gets, this
 * is what a running one gets.
 */
const ADDED_COLUMNS: Array<{ table: string; column: string; definition: string }> = [
  { table: "credentials", column: "name", definition: "TEXT" },
  { table: "credentials", column: "last_used_at", definition: "TEXT" },
  { table: "set_logs", column: "distance_m", definition: "INTEGER" },
  { table: "set_logs", column: "watts", definition: "INTEGER" },
  {
    table: "workout_exercises",
    column: "is_warmup",
    definition: "INTEGER NOT NULL DEFAULT 0",
  },
  { table: "workouts", column: "archived_at", definition: "TEXT" },
];

function applyColumnAdditions(db: DatabaseSync): void {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Row[];
    if (columns.length === 0) continue; // Table isn't there at all; nothing to alter.
    if (columns.some((c) => String(c.name) === column)) continue;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
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
