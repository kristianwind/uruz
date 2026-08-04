import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * A session left open is not a session still running.
 *
 * Found in real data on 2026-08-04: the archive listed workouts of 4101 and
 * 2670 minutes. Every one of them ended at the exact minute the *next* workout
 * began — the user had come back days later, been offered the stale session to
 * resume, pressed finish to be rid of it, and `finishSession` stamped the
 * current time. The gap between forgetting and returning was recorded as
 * training time.
 */

const dir = mkdtempSync(join(tmpdir(), "uruz-abandoned-"));
process.env.URUZ_SQLITE_PATH = join(dir, "test.sqlite");

const { getDb } = await import("@/lib/db/sqlite");
const { createHall } = await import("@/lib/db/repo/halls");
const { createUser } = await import("@/lib/db/repo/users");
const { upsertExercise } = await import("@/lib/db/repo/exercises");
const {
  startSession,
  finishSession,
  logSet,
  getActiveSession,
  getSession,
  ABANDONED_AFTER_MS,
} = await import("@/lib/db/repo/sessions");

const hall = createHall("Hallen");
let n = 0;
const newUser = () =>
  createUser({
    hallId: hall.id,
    email: `bruger${++n}@example.dk`,
    displayName: `Bruger ${n}`,
    role: "member",
  });
const exercise = upsertExercise({
  slug: "biceps",
  nameDa: "Biceps curl",
  nameEn: "Biceps curl",
  category: "overkrop",
  primaryMuscles: ["biceps"],
  equipment: "haandvaegt",
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

/** Move a session and its sets back in time, as if it had been left open. */
function backdate(sessionId: string, msAgo: number) {
  const when = new Date(Date.now() - msAgo).toISOString();
  getDb().prepare("UPDATE sessions SET started_at = ? WHERE id = ?").run(when, sessionId);
  getDb().prepare("UPDATE set_logs SET logged_at = ? WHERE session_id = ?").run(when, sessionId);
}

const minutes = (s: { startedAt: string; endedAt: string | null }) =>
  Math.round((new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60_000);

describe("abandoned sessions", () => {
  it("ends at the last set, not at the moment finish is pressed", () => {
    const user = newUser();
    const s = startSession(user.id, null);
    logSet(user.id, { sessionId: s.id, exerciseId: exercise.id, setIndex: 0, weight: 6, reps: 12 });
    backdate(s.id, 3 * 86_400_000); // forgotten three days ago

    finishSession(s.id);

    // Before the fix this recorded three days of training.
    expect(minutes(getSession(s.id)!)).toBe(0);
  });

  it("still counts the cooldown when the session is finished while warm", () => {
    const user = newUser();
    const s = startSession(user.id, null);
    logSet(user.id, { sessionId: s.id, exerciseId: exercise.id, setIndex: 0, weight: 6, reps: 12 });
    backdate(s.id, 40 * 60_000); // started forty minutes ago, still training

    finishSession(s.id);

    expect(minutes(getSession(s.id)!)).toBe(40);
  });

  it("does not offer a days-old session to resume", () => {
    const user = newUser();
    const s = startSession(user.id, null);
    logSet(user.id, { sessionId: s.id, exerciseId: exercise.id, setIndex: 0, weight: 6, reps: 12 });
    backdate(s.id, 3 * 86_400_000);

    expect(getActiveSession(user.id)).toBeNull();
    // …and it was closed honestly rather than left dangling.
    expect(minutes(getSession(s.id)!)).toBe(0);
  });

  it("leaves a session that is still warm alone", () => {
    const user = newUser();
    const s = startSession(user.id, null);
    logSet(user.id, { sessionId: s.id, exerciseId: exercise.id, setIndex: 0, weight: 6, reps: 12 });
    backdate(s.id, ABANDONED_AFTER_MS / 2);

    expect(getActiveSession(user.id)?.id).toBe(s.id);
    expect(getSession(s.id)!.endedAt).toBeNull();
  });
});
