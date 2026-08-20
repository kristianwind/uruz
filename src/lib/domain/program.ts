/**
 * Which workout is next.
 *
 * The Train page used to answer this with "free training", which is not an
 * answer — it is the app admitting it does not know. With a plan it can say
 * something true: of the workouts in the running order, the one you have gone
 * longest without.
 *
 * Pure on purpose. Given a running order and when each was last trained, the
 * answer must be the same every time, testable without a database, and easy to
 * reason about on the day it looks wrong.
 */

export interface ProgramSlot {
  workoutId: string;
  /** Position in the running order. */
  order: number;
  /** ISO timestamp of the last session from this workout, or null for never. */
  lastTrainedAt: string | null;
}

export interface NextUp {
  workoutId: string;
  /** Whole days since it was last trained; null when it never has been. */
  daysSince: number | null;
  reason: "never" | "longest";
}

/**
 * The next workout in the plan.
 *
 * One you have never done comes first — a plan you are halfway into should
 * finish its first round before repeating. After that it is simply whichever
 * has waited longest. Ties break on the running order, so an A/B split with
 * both sides untouched starts at A rather than wherever the sort felt like.
 */
export function nextWorkout(slots: ProgramSlot[], now = new Date()): NextUp | null {
  if (slots.length === 0) return null;

  const byOrder = [...slots].sort((a, b) => a.order - b.order);

  const untouched = byOrder.filter((s) => !s.lastTrainedAt);
  if (untouched.length > 0) {
    return { workoutId: untouched[0].workoutId, daysSince: null, reason: "never" };
  }

  let best = byOrder[0];
  for (const s of byOrder) {
    if (new Date(s.lastTrainedAt!).getTime() < new Date(best.lastTrainedAt!).getTime()) {
      best = s;
    }
  }
  return {
    workoutId: best.workoutId,
    daysSince: wholeDaysBetween(best.lastTrainedAt!, now),
    reason: "longest",
  };
}

/**
 * Whole days between a timestamp and now, counted on calendar days rather than
 * elapsed hours — training at 07:00 and again at 22:00 the next day is one day
 * apart to a person, not zero.
 *
 * Local calendar, deliberately: a set logged at 22:00 UTC on the 19th happened
 * after midnight in Copenhagen, so to the person who lifted it that was today.
 */
export function wholeDaysBetween(iso: string, now: Date): number {
  const a = new Date(iso);
  if (Number.isNaN(a.getTime())) return 0;
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((day(now) - day(a)) / 86_400_000));
}

/**
 * Is the plan being kept to? Sessions in the last seven days against the
 * number the plan asks for, capped at 1 — used to say something encouraging
 * or gently honest, never to scold.
 */
export function weeklyAdherence(sessionsLast7Days: number, daysPerWeek: number): number {
  if (daysPerWeek <= 0) return 1;
  return Math.min(1, sessionsLast7Days / daysPerWeek);
}
