import { describe, it, expect } from "vitest";
import { workoutExercisesFromSets, estimatedMinutesFromSession } from "@/lib/domain/reuse";
import type { SetLog, Unit } from "@/lib/domain/types";

/**
 * Doing again what you already did once.
 *
 * The archive could show a training and not repeat it. These cover the turn
 * from "what happened" into "what to do" — the part where warm-ups, held sets,
 * the rowing machine and the order of the day have to survive the journey.
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

const units = (entries: Record<string, Unit>): ReadonlyMap<string, Unit> =>
  new Map(Object.entries(entries));

describe("workoutExercisesFromSets", () => {
  it("has nothing to build from a session with no sets", () => {
    expect(workoutExercisesFromSets([], units({}))).toEqual([]);
  });

  it("counts the sets that were logged and reads the rep range off them", () => {
    const out = workoutExercisesFromSets(
      [
        set({ exerciseId: "goblet", weight: 12, reps: 12 }),
        set({ exerciseId: "goblet", weight: 12, reps: 12 }),
        set({ exerciseId: "goblet", weight: 12, reps: 10 }),
      ],
      units({ goblet: "kg" }),
    );

    expect(out).toHaveLength(1);
    expect(out[0].targetSets).toBe(3);
    expect(out[0].targetRepsMin).toBe(10);
    expect(out[0].targetRepsMax).toBe(12);
    expect(out[0].targetSeconds).toBeNull();
    expect(out[0].isWarmup).toBe(false);
  });

  it("gives a bodyweight exercise a rep range too", () => {
    const out = workoutExercisesFromSets(
      [set({ exerciseId: "situp", reps: 20 }), set({ exerciseId: "situp", reps: 15 })],
      units({ situp: "reps" }),
    );
    expect(out[0]).toMatchObject({ targetSets: 2, targetRepsMin: 15, targetRepsMax: 20 });
  });

  it("keeps the order the exercises were actually done in", () => {
    // Interleaved on purpose: a superset, or someone going back to a machine.
    const out = workoutExercisesFromSets(
      [
        set({ exerciseId: "chest", reps: 10 }),
        set({ exerciseId: "legs", reps: 11 }),
        set({ exerciseId: "chest", reps: 10 }),
        set({ exerciseId: "goblet", reps: 12 }),
        set({ exerciseId: "legs", reps: 11 }),
      ],
      units({ chest: "kg", legs: "kg", goblet: "kg" }),
    );

    expect(out.map((i) => i.exerciseId)).toEqual(["chest", "legs", "goblet"]);
    expect(out.map((i) => i.order)).toEqual([0, 1, 2]);
    expect(out.find((i) => i.exerciseId === "chest")?.targetSets).toBe(2);
  });

  it("does not let warm-ups inflate the target", () => {
    const out = workoutExercisesFromSets(
      [
        set({ exerciseId: "legs", weight: 40, reps: 10, isWarmup: true }),
        set({ exerciseId: "legs", weight: 60, reps: 10, isWarmup: true }),
        set({ exerciseId: "legs", weight: 81, reps: 11 }),
        set({ exerciseId: "legs", weight: 81, reps: 11 }),
        set({ exerciseId: "legs", weight: 81, reps: 11 }),
      ],
      units({ legs: "kg" }),
    );

    expect(out[0].targetSets).toBe(3);
    expect(out[0].targetRepsMin).toBe(11);
    expect(out[0].isWarmup).toBe(false);
  });

  it("keeps an exercise that was only ever a warm-up as a warm-up", () => {
    // The rowing machine Kristian opens every session on. Turning it into a
    // working set would pollute his records and the weight suggested next time.
    const out = workoutExercisesFromSets(
      [
        set({ exerciseId: "rower", distanceM: 1000, watts: 90, seconds: 300, isWarmup: true }),
        set({ exerciseId: "squat", weight: 60, reps: 8 }),
      ],
      units({ rower: "km", squat: "kg" }),
    );

    expect(out[0]).toMatchObject({ exerciseId: "rower", isWarmup: true, targetSets: 1 });
    expect(out[1]).toMatchObject({ exerciseId: "squat", isWarmup: false });
  });

  it("gives a held set one number, and it is the longest hold", () => {
    const out = workoutExercisesFromSets(
      [
        set({ exerciseId: "plank", seconds: 45 }),
        set({ exerciseId: "plank", seconds: 60 }),
        set({ exerciseId: "plank", seconds: 38 }),
      ],
      units({ plank: "sek" }),
    );

    expect(out[0].targetSeconds).toBe(60);
    expect(out[0].targetRepsMin).toBeNull();
    expect(out[0].targetRepsMax).toBeNull();
    expect(out[0].targetSets).toBe(3);
  });

  it("does not turn the rowing machine into a plank", () => {
    // A rowing set records metres, watts *and* seconds. Reading whichever
    // fields happen to be filled in would put an eight-minute hold on the plan,
    // and the logging screen would present it as a time to beat. The exercise
    // is measured in metres; a workout row has nowhere to put those, so it gets
    // a set count and nothing else — same as the seeded cardio workout.
    const out = workoutExercisesFromSets(
      [
        set({ exerciseId: "rower", distanceM: 2000, watts: 110, seconds: 480 }),
        set({ exerciseId: "rower", distanceM: 2000, watts: 105, seconds: 495 }),
      ],
      units({ rower: "km" }),
    );

    expect(out[0]).toMatchObject({
      exerciseId: "rower",
      targetSets: 2,
      targetSeconds: null,
      targetRepsMin: null,
      targetRepsMax: null,
      progressionMode: "none",
    });
  });

  it("reads the sets when the exercise is no longer known", () => {
    // Deleted, or logged on another install. Better a sensible guess than a
    // row with no target at all.
    const out = workoutExercisesFromSets(
      [set({ exerciseId: "gone", reps: 8 }), set({ exerciseId: "vanished", seconds: 30 })],
      units({}),
    );
    expect(out[0]).toMatchObject({ targetRepsMin: 8, targetRepsMax: 8, targetSeconds: null });
    expect(out[1]).toMatchObject({ targetSeconds: 30, targetRepsMin: null });
  });

  it("gives every strength row the app's default rest and progression", () => {
    // A session does not record how long anyone stood around between sets.
    const out = workoutExercisesFromSets(
      [set({ exerciseId: "squat", reps: 8 })],
      units({ squat: "kg" }),
    );
    expect(out[0].restSeconds).toBe(90);
    expect(out[0].progressionMode).toBe("double");
  });

  it("stops at forty exercises, which is the builder's own ceiling", () => {
    const many = Array.from({ length: 45 }, (_, i) => set({ exerciseId: `ex${i}`, reps: 5 }));
    expect(workoutExercisesFromSets(many, units({}))).toHaveLength(40);
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
