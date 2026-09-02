/**
 * Turning a training you have already done back into a workout you can do again.
 *
 * A session in the archive is a record of what happened; a workout is a plan.
 * They hold nearly the same information, and until now there was no way from
 * the first to the second — so a free session, or a good day someone wanted to
 * repeat, could only be rebuilt by hand from a screen right next to it.
 *
 * Pure on purpose: given the sets that were logged, the plan that comes out
 * must be the same every time and testable without a database.
 */
import type { SetLog, Unit, WorkoutExercise } from "./types";

/** One exercise row for a workout, as derived from what was actually logged. */
export type ReusedExercise = Pick<
  WorkoutExercise,
  | "exerciseId"
  | "order"
  | "targetSets"
  | "targetRepsMin"
  | "targetRepsMax"
  | "targetSeconds"
  | "restSeconds"
  | "progressionMode"
  | "isWarmup"
>;

/** The template default everywhere else in the app; a session does not record rest. */
const DEFAULT_REST_SECONDS = 90;

/** The builder's own ceiling — a plan longer than this is not one. */
const MAX_EXERCISES = 40;

/**
 * Build the exercise rows for a workout from one session's sets.
 *
 * The order is the order the exercises were first logged in, which is the order
 * they were actually done in — not the order of whatever template the session
 * may have come from, because someone repeating a session means the session.
 *
 * Warm-up sets do not count towards the target: three working sets after two
 * warm-ups is a three-set exercise. An exercise that was *only* warmed up
 * becomes a warm-up row, so the rowing machine someone opens on stays a warm-up
 * next time instead of turning into a working set that pollutes their records.
 *
 * `units` decides the shape of the target, and it has to: the logged set alone
 * cannot tell you. A rowing machine records metres, watts *and* seconds, so
 * reading the fields that happen to be filled in turns it into a plank with an
 * eight-minute hold. The exercise's own unit is the only thing that knows.
 * An exercise missing from the map falls back to what its sets look like.
 */
export function workoutExercisesFromSets(
  sets: SetLog[],
  units: ReadonlyMap<string, Unit>,
): ReusedExercise[] {
  const order: string[] = [];
  const byExercise = new Map<string, SetLog[]>();
  for (const set of sets) {
    if (!byExercise.has(set.exerciseId)) {
      byExercise.set(set.exerciseId, []);
      order.push(set.exerciseId);
    }
    byExercise.get(set.exerciseId)!.push(set);
  }

  return order.slice(0, MAX_EXERCISES).map((exerciseId, index) => {
    const all = byExercise.get(exerciseId)!;
    const working = all.filter((s) => !s.isWarmup);
    const counted = working.length > 0 ? working : all;

    const reps = counted.map((s) => s.reps).filter((r): r is number => r != null);
    const seconds = counted.map((s) => s.seconds).filter((s): s is number => s != null);
    const shape = targetShape(units.get(exerciseId), reps.length > 0, seconds.length > 0);

    return {
      exerciseId,
      order: index,
      targetSets: counted.length,
      targetRepsMin: shape === "reps" ? Math.min(...reps) : null,
      targetRepsMax: shape === "reps" ? Math.max(...reps) : null,
      // Held sets get one number, and it is the longest you managed: the point
      // of writing a plank down is to aim at it again, not at the set you cut
      // short. Reps keep a range because that is how a rep target is written.
      targetSeconds: shape === "hold" ? Math.max(...seconds) : null,
      restSeconds: DEFAULT_REST_SECONDS,
      // Nothing to add 2.5 kg to on a rowing machine. Same as the seeded
      // cardio rows and the ones Kvasir builds.
      progressionMode: shape === "cardio" ? "none" : "double",
      isWarmup: working.length === 0,
    };
  });
}

/**
 * Which kind of target this exercise takes.
 *
 * Distance work — the rower, the bike — gets none. A workout row has nowhere to
 * put metres, and the app has never pretended otherwise: the seeded "Cardio +
 * Core" and every plan Kvasir builds give cardio a set count and nothing else.
 * Inventing a time target here would be worse than leaving it empty, because it
 * would show up on the logging screen as a hold to beat.
 */
function targetShape(
  unit: Unit | undefined,
  hasReps: boolean,
  hasSeconds: boolean,
): "reps" | "hold" | "cardio" {
  if (unit === "km") return "cardio";
  if (unit === "sek") return hasSeconds ? "hold" : "cardio";
  if (unit === "kg" || unit === "reps") return hasReps ? "reps" : "cardio";
  // Unknown exercise — deleted, or from another install. Read the sets.
  if (hasReps) return "reps";
  return hasSeconds ? "hold" : "cardio";
}

/**
 * How long to put on the plan, from how long it actually took.
 *
 * Clamped to the same range the builder accepts. A session left open overnight
 * — the phone locked, the workout never finished — would otherwise write "480
 * minutes" onto a plan and make every later estimate nonsense.
 */
export function estimatedMinutesFromSession(
  startedAt: string,
  endedAt: string | null,
  fallback = 45,
): number {
  if (!endedAt) return fallback;
  const minutes = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000,
  );
  if (!Number.isFinite(minutes) || minutes < 1) return fallback;
  return Math.min(240, Math.max(5, minutes));
}
