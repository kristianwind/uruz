import type { PRType, SetLog } from "./types";

/**
 * Pure strength calculations. No I/O, no database — everything here is a
 * function of the numbers, which makes the rules testable and keeps the
 * progression/PR behaviour identical across backends.
 */

/**
 * Estimated one-rep max using the Epley formula.
 *
 * Epley is the common gym-standard estimate and stays reasonable in the 1–12
 * rep range Uruz targets. It is an *estimate* — surfaced as "est. 1RM", never
 * as a number to attempt blindly.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Volume (tonnage) of a single set: weight × reps. Bodyweight/time sets = 0. */
export function setVolume(set: Pick<SetLog, "weight" | "reps">): number {
  if (!set.weight || !set.reps) return 0;
  return set.weight * set.reps;
}

/** Total tonnage across sets, excluding warm-ups. */
export function totalVolume(sets: Pick<SetLog, "weight" | "reps" | "isWarmup">[]): number {
  return sets.reduce((sum, s) => (s.isWarmup ? sum : sum + setVolume(s)), 0);
}

/**
 * Round a weight to something actually loadable in a gym.
 *
 * Machines and dumbbells generally move in 2.5 kg steps; below 20 kg (small
 * dumbbells, cable stacks) 1 kg steps are common. Keeps suggestions realistic.
 */
export function roundToLoadable(weight: number): number {
  if (weight <= 0) return 0;
  const step = weight < 20 ? 1 : 2.5;
  return Math.round(weight / step) * step;
}

// ---- Personal records ----------------------------------------------------

export interface PRCandidate {
  type: PRType;
  value: number;
}

/**
 * The PR-relevant values a single set produces.
 *
 * A weight/reps set can beat max weight, max reps at any weight, estimated 1RM
 * and single-set volume. A timed set (plank) can beat max hold. Warm-ups never
 * count.
 */
export function prCandidatesForSet(set: Pick<SetLog, "weight" | "reps" | "seconds" | "isWarmup">): PRCandidate[] {
  if (set.isWarmup) return [];
  const out: PRCandidate[] = [];

  if (set.seconds && set.seconds > 0) {
    out.push({ type: "max_hold", value: set.seconds });
  }
  if (set.weight && set.weight > 0 && set.reps && set.reps > 0) {
    out.push({ type: "max_weight", value: set.weight });
    out.push({ type: "max_reps", value: set.reps });
    out.push({ type: "1rm_est", value: estimate1RM(set.weight, set.reps) });
    out.push({ type: "max_volume", value: set.weight * set.reps });
  } else if (set.reps && set.reps > 0) {
    // Bodyweight rep work (e.g. crunches) still has a rep record.
    out.push({ type: "max_reps", value: set.reps });
  }
  return out;
}

/**
 * Which of a set's candidates beat the current bests.
 *
 * `current` maps PR type -> existing best value. A record must be strictly
 * greater to count, so repeating your best doesn't spam celebrations.
 */
export function newRecords(
  candidates: PRCandidate[],
  current: Partial<Record<PRType, number>>,
): PRCandidate[] {
  return candidates.filter((c) => {
    const best = current[c.type];
    return best === undefined || c.value > best + 1e-9;
  });
}

// ---- Progression ---------------------------------------------------------

export interface ProgressionInput {
  /** Weight used across the last session's working sets of this exercise. */
  lastWeight: number;
  /** Reps achieved in each working set last session, in order. */
  lastReps: number[];
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  /** Reps-in-reserve reported last session, if the user tracks it. */
  lastRir?: number | null;
}

export interface ProgressionSuggestion {
  /** Suggested weight for the next session. */
  weight: number;
  /** Suggested rep target for the next session. */
  reps: number;
  /** Why — surfaced to the user in plain Danish by the UI layer. */
  reason: "increase" | "add_reps" | "hold" | "deload";
}

/**
 * Double progression (spec §5, the default).
 *
 * Work up within a rep range at a fixed weight; once every working set hits the
 * top of the range, add weight and drop back to the bottom of the range. This
 * is the safest, most beginner-friendly scheme and the one Kristian & Ib start
 * on.
 *
 * Weight jumps are ~2.5% rounded to a loadable increment, with a floor of one
 * increment so light machines still move.
 */
export function doubleProgression(input: ProgressionInput): ProgressionSuggestion {
  const { lastWeight, lastReps, targetSets, targetRepsMin, targetRepsMax } = input;
  const working = lastReps.slice(0, targetSets);

  // Not enough data yet — hold and gather.
  if (working.length === 0 || lastWeight <= 0) {
    return { weight: lastWeight, reps: targetRepsMin, reason: "hold" };
  }

  const allAtTop =
    working.length >= targetSets && working.every((r) => r >= targetRepsMax);
  if (allAtTop) {
    const step = Math.max(lastWeight < 20 ? 1 : 2.5, roundToLoadable(lastWeight * 0.025));
    return {
      weight: roundToLoadable(lastWeight + step),
      reps: targetRepsMin,
      reason: "increase",
    };
  }

  // Struggling badly below the bottom of the range on the first set: back off.
  if (working[0] < targetRepsMin - 2) {
    const step = Math.max(lastWeight < 20 ? 1 : 2.5, roundToLoadable(lastWeight * 0.05));
    return {
      weight: roundToLoadable(Math.max(0, lastWeight - step)),
      reps: targetRepsMin,
      reason: "deload",
    };
  }

  // Otherwise: same weight, chase one more rep.
  const bestSet = Math.max(...working);
  return {
    weight: lastWeight,
    reps: Math.min(targetRepsMax, bestSet + 1),
    reason: "add_reps",
  };
}

/** Linear progression: add a fixed increment every session that hit target. */
export function linearProgression(
  input: ProgressionInput,
  incrementKg = 2.5,
): ProgressionSuggestion {
  const { lastWeight, lastReps, targetSets, targetRepsMin } = input;
  const working = lastReps.slice(0, targetSets);
  const hitTarget =
    working.length >= targetSets && working.every((r) => r >= targetRepsMin);
  if (!hitTarget) return { weight: lastWeight, reps: targetRepsMin, reason: "hold" };
  return {
    weight: roundToLoadable(lastWeight + incrementKg),
    reps: targetRepsMin,
    reason: "increase",
  };
}

/**
 * RIR-based progression for experienced lifters: use reported reps-in-reserve
 * to decide. 3+ reps left means the load is too light; 0 means it was maximal.
 */
export function rirProgression(input: ProgressionInput): ProgressionSuggestion {
  const { lastWeight, lastRir, targetRepsMin, targetRepsMax } = input;
  if (lastRir === null || lastRir === undefined) return doubleProgression(input);

  if (lastRir >= 3) {
    const step = Math.max(lastWeight < 20 ? 1 : 2.5, roundToLoadable(lastWeight * 0.05));
    return { weight: roundToLoadable(lastWeight + step), reps: targetRepsMax, reason: "increase" };
  }
  if (lastRir <= 0) {
    const step = Math.max(lastWeight < 20 ? 1 : 2.5, roundToLoadable(lastWeight * 0.05));
    return { weight: roundToLoadable(lastWeight - step), reps: targetRepsMin, reason: "deload" };
  }
  return { weight: lastWeight, reps: Math.min(targetRepsMax, targetRepsMin + 1), reason: "add_reps" };
}

/** Dispatch on the exercise's configured progression mode. */
export function suggestProgression(
  mode: "double" | "linear" | "rir" | "none",
  input: ProgressionInput,
): ProgressionSuggestion | null {
  switch (mode) {
    case "double":
      return doubleProgression(input);
    case "linear":
      return linearProgression(input);
    case "rir":
      return rirProgression(input);
    case "none":
      return null;
  }
}
