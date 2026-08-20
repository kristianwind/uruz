import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Taking a workout off the list must never cost you training history.
 *
 * `sessions.workout_id` is ON DELETE SET NULL, so deleting a workout you have
 * trained does not remove the session — it strips the name off it, and real
 * training turns into anonymous "free training" in the archive. That is loss
 * you cannot see happening. So: untouched workouts are deleted, trained ones
 * are archived, and the caller is told which.
 */

const dir = mkdtempSync(join(tmpdir(), "uruz-removal-"));
process.env.URUZ_SQLITE_PATH = join(dir, "test.sqlite");

const { createHall } = await import("@/lib/db/repo/halls");
const { createUser } = await import("@/lib/db/repo/users");
const {
  createWorkout,
  deleteWorkout,
  archiveWorkout,
  listHallWorkouts,
  getWorkout,
  workoutSessionCount,
} = await import("@/lib/db/repo/workouts");
const { startSession, getSession, listSessions } = await import("@/lib/db/repo/sessions");

const hall = createHall("Hallen");
const user = createUser({
  hallId: hall.id,
  email: "medlem@example.dk",
  displayName: "Medlem",
  role: "member",
});

const newWorkout = (name: string) =>
  createWorkout({
    hallId: hall.id,
    name,
    goal: "helkrop",
    level: "begynder",
    estimatedMinutes: 45,
    isTemplate: false,
    createdBy: user.id,
  });

describe("removing a workout", () => {
  it("deletes one that was never trained", () => {
    const w = newWorkout("Aldrig brugt");
    expect(workoutSessionCount(w.id)).toBe(0);
    expect(deleteWorkout(w.id)).toBe(true);
    expect(getWorkout(w.id)).toBeNull();
  });

  it("refuses to delete one that holds training history", () => {
    const w = newWorkout("Brugt");
    const s = startSession(user.id, w.id);

    expect(deleteWorkout(w.id)).toBe(false);
    expect(getWorkout(w.id)).not.toBeNull();
    // The session still knows what it was.
    expect(getSession(s.id)?.workoutId).toBe(w.id);
  });

  it("archives it out of the lists without touching the session", () => {
    const w = newWorkout("Arkiveres");
    const s = startSession(user.id, w.id);

    archiveWorkout(w.id);

    expect(listHallWorkouts(hall.id).map((x) => x.id)).not.toContain(w.id);
    expect(listHallWorkouts(hall.id, true).map((x) => x.id)).toContain(w.id);
    // The point of the whole exercise: the training kept its name.
    expect(getSession(s.id)?.workoutId).toBe(w.id);
    expect(listSessions(user.id).some((x) => x.id === s.id)).toBe(true);
  });

  it("can be brought back", () => {
    const w = newWorkout("Fortrudt");
    archiveWorkout(w.id);
    expect(listHallWorkouts(hall.id).map((x) => x.id)).not.toContain(w.id);
    archiveWorkout(w.id, false);
    expect(listHallWorkouts(hall.id).map((x) => x.id)).toContain(w.id);
    expect(getWorkout(w.id)?.archivedAt).toBeNull();
  });
});
