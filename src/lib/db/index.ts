/**
 * Data-access layer entry point.
 *
 * Everything above this line (UI, server actions, API routes) imports from
 * `@/lib/db` and never touches a database driver directly. Today this is backed
 * by the local `node:sqlite` implementation; the production target is Supabase
 * Postgres with Row Level Security (see supabase/migrations). Swapping backends
 * means providing the same repository surface behind this barrel.
 */

export * as halls from "./repo/halls";
export * as users from "./repo/users";
export * as exercises from "./repo/exercises";
export * as workouts from "./repo/workouts";
export * as badges from "./repo/badges";
export * as invitations from "./repo/invitations";

export { getDb, closeDb, newId, nowIso } from "./sqlite";
