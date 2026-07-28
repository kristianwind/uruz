import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the data layer at a throwaway database BEFORE importing it.
const dir = mkdtempSync(join(tmpdir(), "uruz-test-"));
process.env.URUZ_SQLITE_PATH = join(dir, "test.sqlite");

const { getDb, closeDb } = await import("@/lib/db/sqlite");
const { createHall } = await import("@/lib/db/repo/halls");
const { createUser } = await import("@/lib/db/repo/users");
const { upsertExercise } = await import("@/lib/db/repo/exercises");
const {
  startSession,
  finishSession,
  logSet,
  updateSet,
  deleteSet,
  listSessionSets,
  getActiveSession,
  currentBests,
  getLastPerformance,
  listPersonalRecords,
} = await import("@/lib/db/repo/sessions");

function reset() {
  const db = getDb();
  for (const t of [
    "set_logs",
    "personal_records",
    "sessions",
    "workout_exercises",
    "workouts",
    "exercises",
    "streaks",
    "users",
    "halls",
  ]) {
    db.prepare(`DELETE FROM ${t}`).run();
  }
}

function fixture() {
  const hall = createHall("Testhal");
  const user = createUser({
    hallId: hall.id,
    email: "test@uruz.local",
    displayName: "Tester",
    role: "admin",
  });
  const exercise = upsertExercise({
    slug: "benpres",
    nameDa: "Benpres",
    nameEn: "Leg press",
    category: "ben",
    primaryMuscles: ["forlaar"],
    equipment: "maskine",
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
  return { hall, user, exercise };
}

beforeEach(() => reset());
afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe("session lifecycle", () => {
  it("starts, exposes an active session, and finishes it", () => {
    const { user } = fixture();
    const session = startSession(user.id, null);
    expect(getActiveSession(user.id)?.id).toBe(session.id);

    const done = finishSession(session.id, { mood: 4, rpe: 7, bodyweight: 82.5, note: "God dag" });
    expect(done?.endedAt).toBeTruthy();
    expect(done?.mood).toBe(4);
    expect(done?.bodyweight).toBe(82.5);
    // Once finished it is no longer the active session.
    expect(getActiveSession(user.id)).toBeNull();
  });
});

describe("logSet", () => {
  it("stores the set and marks the first working set as a PR", () => {
    const { user, exercise } = fixture();
    const session = startSession(user.id, null);

    const result = logSet(user.id, {
      sessionId: session.id,
      exerciseId: exercise.id,
      setIndex: 0,
      weight: 60,
      reps: 10,
    });

    expect(result.duplicate).toBe(false);
    expect(result.set.weight).toBe(60);
    expect(result.set.isPr).toBe(true);
    // First ever set beats every record type it can produce.
    expect(result.records.map((r) => r.type).sort()).toEqual(
      ["1rm_est", "max_reps", "max_volume", "max_weight"].sort(),
    );
    expect(listSessionSets(session.id)).toHaveLength(1);
  });

  it("does not award records for a weaker follow-up set", () => {
    const { user, exercise } = fixture();
    const session = startSession(user.id, null);
    logSet(user.id, { sessionId: session.id, exerciseId: exercise.id, setIndex: 0, weight: 60, reps: 10 });

    const second = logSet(user.id, {
      sessionId: session.id,
      exerciseId: exercise.id,
      setIndex: 1,
      weight: 60,
      reps: 8,
    });
    expect(second.records).toEqual([]);
    expect(second.set.isPr).toBe(false);
  });

  it("awards a new record when the weight goes up", () => {
    const { user, exercise } = fixture();
    const s1 = startSession(user.id, null);
    logSet(user.id, { sessionId: s1.id, exerciseId: exercise.id, setIndex: 0, weight: 60, reps: 10 });

    const s2 = startSession(user.id, null);
    const heavier = logSet(user.id, {
      sessionId: s2.id,
      exerciseId: exercise.id,
      setIndex: 0,
      weight: 65,
      reps: 10,
    });
    const types = heavier.records.map((r) => r.type).sort();
    expect(types).toEqual(["1rm_est", "max_volume", "max_weight"]);
    expect(currentBests(user.id, exercise.id).max_weight).toBe(65);
  });

  it("ignores warm-up sets for records", () => {
    const { user, exercise } = fixture();
    const session = startSession(user.id, null);
    const warm = logSet(user.id, {
      sessionId: session.id,
      exerciseId: exercise.id,
      setIndex: 0,
      weight: 100,
      reps: 10,
      isWarmup: true,
    });
    expect(warm.records).toEqual([]);
    expect(listPersonalRecords(user.id)).toHaveLength(0);
  });

  it("is idempotent when an offline-queued set is replayed", () => {
    const { user, exercise } = fixture();
    const session = startSession(user.id, null);
    const payload = {
      id: "client-generated-id",
      sessionId: session.id,
      exerciseId: exercise.id,
      setIndex: 0,
      weight: 60,
      reps: 10,
    };

    const first = logSet(user.id, payload);
    const replay = logSet(user.id, payload);

    expect(first.duplicate).toBe(false);
    expect(replay.duplicate).toBe(true);
    expect(listSessionSets(session.id)).toHaveLength(1);
    // The replay must not award the record a second time.
    expect(listPersonalRecords(user.id).filter((r) => r.type === "max_weight")).toHaveLength(1);
  });

  it("records a hold PR for timed sets", () => {
    const { user, exercise } = fixture();
    const session = startSession(user.id, null);
    const plank = logSet(user.id, {
      sessionId: session.id,
      exerciseId: exercise.id,
      setIndex: 0,
      seconds: 45,
    });
    expect(plank.records).toEqual([{ type: "max_hold", value: 45 }]);
  });
});

describe("editing logged sets", () => {
  it("updates a mistyped set", () => {
    const { user, exercise } = fixture();
    const session = startSession(user.id, null);
    const { set } = logSet(user.id, {
      sessionId: session.id,
      exerciseId: exercise.id,
      setIndex: 0,
      weight: 600, // typo
      reps: 10,
    });

    const fixed = updateSet(set.id, { weight: 60 });
    expect(fixed?.weight).toBe(60);
  });

  it("deletes a set", () => {
    const { user, exercise } = fixture();
    const session = startSession(user.id, null);
    const { set } = logSet(user.id, {
      sessionId: session.id,
      exerciseId: exercise.id,
      setIndex: 0,
      weight: 60,
      reps: 10,
    });
    deleteSet(set.id);
    expect(listSessionSets(session.id)).toHaveLength(0);
  });
});

describe("getLastPerformance", () => {
  it("returns null with no history", () => {
    const { user, exercise } = fixture();
    expect(getLastPerformance(user.id, exercise.id)).toBeNull();
  });

  it("returns the previous session's working sets for prefill", () => {
    const { user, exercise } = fixture();
    const s1 = startSession(user.id, null);
    logSet(user.id, { sessionId: s1.id, exerciseId: exercise.id, setIndex: 0, weight: 60, reps: 12 });
    logSet(user.id, { sessionId: s1.id, exerciseId: exercise.id, setIndex: 1, weight: 60, reps: 11 });
    finishSession(s1.id);

    const last = getLastPerformance(user.id, exercise.id);
    expect(last?.weight).toBe(60);
    expect(last?.reps).toEqual([12, 11]);
  });

  it("excludes the in-progress session so prefill shows the previous one", () => {
    const { user, exercise } = fixture();
    const s1 = startSession(user.id, null);
    logSet(user.id, { sessionId: s1.id, exerciseId: exercise.id, setIndex: 0, weight: 60, reps: 12 });
    finishSession(s1.id);

    const s2 = startSession(user.id, null);
    logSet(user.id, { sessionId: s2.id, exerciseId: exercise.id, setIndex: 0, weight: 70, reps: 8 });

    const last = getLastPerformance(user.id, exercise.id, s2.id);
    expect(last?.weight).toBe(60);
  });

  it("ignores warm-up sets when prefilling", () => {
    const { user, exercise } = fixture();
    const s1 = startSession(user.id, null);
    logSet(user.id, {
      sessionId: s1.id,
      exerciseId: exercise.id,
      setIndex: 0,
      weight: 20,
      reps: 15,
      isWarmup: true,
    });
    logSet(user.id, { sessionId: s1.id, exerciseId: exercise.id, setIndex: 1, weight: 60, reps: 10 });
    finishSession(s1.id);

    expect(getLastPerformance(user.id, exercise.id)?.weight).toBe(60);
  });
});
