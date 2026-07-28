/**
 * Seed the local database with the exercise library, workout templates and
 * badges. Pass URUZ_SEED_DEMO=true to also create the demo admin (Kristian)
 * and a pending invitation for Ib (code IBIBIBIB).
 *
 *   npm run db:seed        # content only
 *   npm run db:seed:demo   # content + demo users
 */
import { seed, ensureSchema } from "../src/lib/db/seed";

ensureSchema();
const demo = process.env.URUZ_SEED_DEMO === "true";
const result = seed({ demo });

console.log("✔ Uruz seed complete");
console.log(`  Hall:      ${result.hall.name}`);
console.log(`  Exercises: ${result.exercises}`);
console.log(`  Templates: +${result.templates} created`);
console.log(`  Badges:    ${result.badges}`);
if (demo) {
  console.log(`  Demo:      ${result.demoCreated ? "admin Kristian created" : "admin already existed"}`);
  console.log(`  Invite:    Ib — code IBIBIBIB`);
}
