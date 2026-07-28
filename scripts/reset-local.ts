/**
 * Delete the local SQLite database file so the schema + seed are rebuilt from
 * scratch. Useful for testing the admin-first first-run flow.
 *
 *   npm run db:reset
 */
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const dbPath = process.env.URUZ_SQLITE_PATH || join(process.cwd(), ".data", "uruz.sqlite");
for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  const p = dbPath + suffix;
  if (existsSync(p)) {
    rmSync(p);
    console.log(`  removed ${p}`);
  }
}
console.log("✔ Local database reset. Run `npm run db:seed` to repopulate.");
