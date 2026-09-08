import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "uruz-topup-"));
process.env.URUZ_SQLITE_PATH = join(dir, "test.sqlite");

const { getDb, closeDb } = await import("@/lib/db/sqlite");
const { listExercises, getExerciseBySlug, upsertExercise } = await import("@/lib/db/repo/exercises");
const { SEED_EXERCISES } = await import("@/lib/db/seed-data");

/**
 * A machine added to the catalogue must reach a database that was seeded
 * before it existed — and must not undo what an admin has done to the ones
 * that were already there.
 */
describe("topping up the library when the database opens", () => {
  it("gives a fresh database the whole catalogue", () => {
    getDb();
    expect(listExercises().map((e) => e.slug).sort()).toEqual(
      SEED_EXERCISES.map((e) => e.slug).sort(),
    );
  });

  it("keeps an admin's edits to an exercise it already has", () => {
    const original = getExerciseBySlug("pec-fly")!;
    upsertExercise({
      ...original,
      nameDa: "Butterfly (den ved vinduet)",
      imageUrl: null,
      demoVideoUrl: null,
      createdBy: null,
    });
    // Same open path as a server restart, minus the process boundary.
    closeDb();
    getDb();
    expect(getExerciseBySlug("pec-fly")?.nameDa).toBe("Butterfly (den ved vinduet)");
    expect(listExercises()).toHaveLength(SEED_EXERCISES.length);
  });
});
