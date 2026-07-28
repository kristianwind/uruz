/**
 * One-command setup for a fresh checkout.
 *
 *   npm run setup
 *
 * Creates the local database, loads the shared content (exercises, workout
 * templates, badges) and writes a starter `.env.local` if one is missing.
 * Deliberately chatty and safe to re-run — it is the first thing a
 * non-technical user is asked to do.
 */
import { existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { seed, ensureSchema } from "../src/lib/db/seed";

const root = process.cwd();

console.log("\nᚢ  Uruz — opsætning\n");

// 1. Environment file -------------------------------------------------------
const envLocal = join(root, ".env.local");
const envExample = join(root, ".env.example");
if (!existsSync(envLocal) && existsSync(envExample)) {
  copyFileSync(envExample, envLocal);
  console.log("✔ Oprettede .env.local (kopi af .env.example)");
  console.log("  Alt er valgfrit — appen virker uden at du ændrer noget.");
} else {
  console.log("• .env.local findes allerede — rører den ikke.");
}

// 2. Database + content -----------------------------------------------------
ensureSchema();
const result = seed({ demo: false });

console.log(`✔ Database klar (${result.hall.name})`);
console.log(`  Øvelser:   ${result.exercises}`);
console.log(`  Skabeloner: ${result.templates > 0 ? `+${result.templates} oprettet` : "allerede oprettet"}`);
console.log(`  Badges:    ${result.badges}`);

console.log("\nNæste skridt:\n");
console.log("  npm run dev        → start appen på http://localhost:3000");
console.log("  Første gang bliver du bedt om at oprette administrator-kontoen.\n");
console.log("Vil du se appen med data i, kan du køre:\n");
console.log("  npm run db:seed:demo && npm run db:seed:history\n");
