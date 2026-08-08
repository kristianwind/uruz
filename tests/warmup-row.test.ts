import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * A warm-up row in a template.
 *
 * Kristian opens every session on the rowing machine. Registering that took
 * three deliberate taps — add the exercise, press "warm-up", log — every single
 * time, and forgetting the middle one quietly polluted his records and the
 * weight the app suggested next session. Marking the row once in the template
 * has to carry all the way to the logging screen.
 */

const dir = mkdtempSync(join(tmpdir(), "uruz-warmup-"));
process.env.URUZ_SQLITE_PATH = join(dir, "test.sqlite");

const { getDb } = await import("@/lib/db/sqlite");
const { createHall } = await import("@/lib/db/repo/halls");
const { createUser } = await import("@/lib/db/repo/users");
const { upsertExercise } = await import("@/lib/db/repo/exercises");
const { createWorkout, setWorkoutExercises, getWorkoutExercises } = await import(
  "@/lib/db/repo/workouts"
);
const { startSession, finishSession, logSet, getLastPerformance } = await import(
  "@/lib/db/repo/sessions"
);
const { buildActiveExercises } = await import("@/lib/domain/active-workout");

const hall = createHall("Hallen");
const user = createUser({
  hallId: hall.id,
  email: "medlem@example.dk",
  displayName: "Medlem",
  role: "member",
});

const exercise = (slug: string, nameDa: string) =>
  upsertExercise({
    slug,
    nameDa,
    nameEn: nameDa,
    category: "traek",
    primaryMuscles: ["ryg"],
    equipment: "kabel",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [],
    instructionsStepsEn: [],
    cues: [],
    cuesEn: [],
    saferVariant: null,
    saferVariantEn: null,
    svgKey: null,
    imageUrl: null,
    difficulty: "begynder",
    demoVideoUrl: null,
    createdBy: null,
    isPublic: true,
  });

const rowing = exercise("roning", "Siddende roning (kabel)");
const pulldown = exercise("nedtraek", "Nedtræk");

const workout = createWorkout({
  hallId: hall.id,
  name: "Helkrop",
  goal: "helkrop",
  level: "begynder",
  estimatedMinutes: 45,
  isTemplate: false,
  createdBy: user.id,
});

setWorkoutExercises(workout.id, [
  { exerciseId: rowing.id, order: 0, targetSets: 1, restSeconds: 60, isWarmup: true },
  { exerciseId: pulldown.id, order: 1, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
]);

describe("a warm-up row in a template", () => {
  it("is stored and read back as a warm-up", () => {
    const items = getWorkoutExercises(workout.id);
    expect(items[0].isWarmup).toBe(true);
    expect(items[1].isWarmup).toBe(false);
  });

  it("reaches the logging screen already marked", () => {
    const s = startSession(user.id, workout.id);
    const active = buildActiveExercises(user.id, workout.id, s.id);
    expect(active[0].isWarmup).toBe(true);
    expect(active[1].isWarmup).toBe(false);
  });

  it("never carries a progression suggestion", () => {
    // Two sessions of warm-up rowing: enough history that the engine would
    // otherwise start pushing the weight up.
    for (const weight of [20, 20]) {
      const s = startSession(user.id, workout.id);
      logSet(user.id, {
        sessionId: s.id,
        exerciseId: rowing.id,
        setIndex: 0,
        weight,
        reps: 15,
        isWarmup: true,
      });
      finishSession(s.id);
    }
    const s = startSession(user.id, workout.id);
    const active = buildActiveExercises(user.id, workout.id, s.id);
    expect(active[0].suggestion).toBeNull();
  });

  it("remembers its own warm-up numbers, not the working ones", () => {
    const s = startSession(user.id, workout.id);
    // The same exercise done heavy as a working set in some other workout.
    logSet(user.id, {
      sessionId: s.id,
      exerciseId: rowing.id,
      setIndex: 0,
      weight: 60,
      reps: 8,
    });
    finishSession(s.id);

    // The warm-up lookup must not see the 60 kg working set…
    const warm = getLastPerformance(user.id, rowing.id, undefined, true);
    expect(warm?.weight).toBe(20);
    // …and the working lookup must not see the 20 kg warm-ups.
    const working = getLastPerformance(user.id, rowing.id, undefined, false);
    expect(working?.weight).toBe(60);
  });

  it("keeps warm-up sets out of the record books", () => {
    const s = startSession(user.id, workout.id);
    const res = logSet(user.id, {
      sessionId: s.id,
      exerciseId: pulldown.id,
      setIndex: 0,
      weight: 999,
      reps: 20,
      isWarmup: true,
    });
    expect(res.records).toHaveLength(0);
    expect(res.set.isPr).toBe(false);
    getDb(); // touch the connection so the file is flushed before teardown
  });
});
