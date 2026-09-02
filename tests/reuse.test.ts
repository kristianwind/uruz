import { describe, it, expect } from "vitest";
import { workoutExercisesFromSets, estimatedMinutesFromSession } from "@/lib/domain/reuse";
import type { SetLog } from "@/lib/domain/types";

/**
 * Doing again what you already did once.
 *
 * The archive could show a training and not repeat it. These cover the turn
 * from "what happened" into "what to do" — the part where warm-ups, held sets
 * and the order of the day have to survive the journey.
 */

let n = 0;
const set = (p: Partial<SetLog> & { exerciseId: string }): SetLog => ({
  id: `s${n++}`,
  sessionId: "session",
  setIndex: 0,
  weight: null,
  reps: null,
  seconds: null,
  distanceM: null,
  watts: null,
  isWarmup: false,
  isPr: false,
  rir: null,
  loggedAt: "2026-08-31T14:00:00.000Z",
  ...p,
});

describe("workoutExercisesFromSets", () => {
  it("has nothing to build from a session with no sets", () => {
    expect(workoutExercisesFromSets([])).toEqual([]);
  });

  it("counts the sets that were logged and reads the rep range off them", () => {
    const out = workoutExercisesFromSets([
      set({ exerciseId: "goblet", weight: 12, reps: 12 }),
      set({ exerciseId: "goblet", weight: 12, reps: 12 }),
      set({ exerciseId: "goblet", weight: 12, reps: 10 }),
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].targetSets).toBe(3);
    expect(out[0].targetRepsMin).toBe(10);
    expect(out[0].targetRepsMax).toBe(12);
    expect(out[0].targetSeconds).toBeNull();
    expect(out[0].isWarmup).toBe(false);
  });

  it("keeps the order the exercises were actually done in", () => {
    // Interleaved on purpose: a superset, or someone going back to a machine.
    const out = workoutExercisesFromSets([
      set({ exerciseId: "chest", reps: 10 }),
      set({ exerciseId: "legs", reps: 11 }),
      set({ exerciseId: "chest", reps: 10 }),
      set({ exerciseId: "goblet", reps: 12 }),
      set({ exerciseId: "legs", reps: 11 }),
    ]);

    expect(out.map((i) => i.exerciseId)).toEqual(["chest", "legs", "goblet"]);
    expect(out.map((i) => i.order)).toEqual([0, 1, 2]);
    expect(out.find((i) => i.exerciseId === "chest")?.targetSets).toBe(2);
  });

  it("does not let warm-ups inflate the target", () => {
    const out = workoutExercisesFromSets([
      set({ exerciseId: "legs", weight: 40, reps: 10, isWarmup: true }),
      set({ exerciseId: "legs", weight: 60, reps: 10, isWarmup: true }),
      set({ exerciseId: "legs", weight: 81, reps: 11 }),
      set({ exerciseId: "legs", weight: 81, reps: 11 }),
      set({ exerciseId: "legs", weight: 81, reps: 11 }),
    ]);

    expect(out[0].targetSets).toBe(3);
    expect(out[0].targetRepsMin).toBe(11);
    expect(out[0].isWarmup).toBe(false);
  });

  it("keeps an exercise that was only ever a warm-up as a warm-up", () => {
    // The rowing machine Kristian opens every session on. Turning it into a
    // working set would pollute his records and the weight suggested next time.
    const out = workoutExercisesFromSets([
      set({ exerciseId: "rower", seconds: 300, isWarmup: true }),
      set({ exerciseId: "squat", weight: 60, reps: 8 }),
    ]);

    expect(out[0]).toMatchObject({ exerciseId: "rower", isWarmup: true, targetSets: 1 });
    expect(out[1]).toMatchObject({ exerciseId: "squat", isWarmup: false });
  });

  it("gives a held set one number, and it is the longest hold", () => {
    const out = workoutExercisesFromSets([
      set({ exerciseId: "plank", seconds: 45 }),
      set({ exerciseId: "plank", seconds: 60 }),
      set({ exerciseId: "plank", seconds: 38 }),
    ]);

    expect(out[0].targetSeconds).toBe(60);
    expect(out[0].targetRepsMin).toBeNull();
    expect(out[0].targetRepsMax).toBeNull();
    expect(out[0].targetSets).toBe(3);
  });

  it("carries cardio across as sets, with nothing invented for it", () => {
    // There is nowhere on a workout row to put metres or watts, so it must not
    // pretend there is — the exercise is there, the numbers stay in the log.
    const out = workoutExercisesFromSets([
      set({ exerciseId: "row", distanceM: 2000, watts: 110, seconds: 480 }),
    ]);

    expect(out[0]).toMatchObject({ exerciseId: "row", targetSets: 1, targetRepsMin: null });
    expect(out[0].targetSeconds).toBe(480);
  });

  it("gives every row the app's default rest and progression", () => {
    // A session does not record how long anyone stood around between sets.
    const out = workoutExercisesFromSets([set({ exerciseId: "squat", reps: 8 })]);
    expect(out[0].restSeconds).toBe(90);
    expect(out[0].progressionMode).toBe("double");
  });

  it("stops at forty exercises, which is the builder's own ceiling", () => {
    const many = Array.from({ length: 45 }, (_, i) => set({ exerciseId: `ex${i}`, reps: 5 }));
    expect(workoutExercisesFromSets(many)).toHaveLength(40);
  });
});

describe("estimatedMinutesFromSession", () => {
  it("uses how long it actually took", () => {
    expect(
      estimatedMinutesFromSession("2026-08-31T14:00:00.000Z", "2026-08-31T14:52:00.000Z"),
    ).toBe(52);
  });

  it("falls back when the session was never finished", () => {
    expect(estimatedMinutesFromSession("2026-08-31T14:00:00.000Z", null)).toBe(45);
  });

  it("refuses a session left open overnight", () => {
    // The phone locked and the workout was never finished. Eight hours is not
    // an estimate, and it would make every later estimate nonsense.
    expect(
      estimatedMinutesFromSession("2026-08-31T14:00:00.000Z", "2026-08-31T22:00:00.000Z"),
    ).toBe(240);
  });

  it("refuses a zero-length one too", () => {
    expect(
      estimatedMinutesFromSession("2026-08-31T14:00:00.000Z", "2026-08-31T14:00:10.000Z"),
    ).toBe(45);
  });
});
