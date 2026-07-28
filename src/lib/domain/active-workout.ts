import "server-only";
import { getWorkout, getWorkoutExercises } from "@/lib/db/repo/workouts";
import { getExercisesByIds } from "@/lib/db/repo/exercises";
import { getLastPerformance, listSessionSets } from "@/lib/db/repo/sessions";
import { suggestProgression } from "./strength";
import { exerciseName } from "./localize";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/core";
import type { ActiveExercise, LoggedSet } from "@/components/train/ActiveWorkout";

/**
 * Assemble everything the active-workout screen needs in one pass: the exercise
 * order, prefill values from the user's last session, and a progression
 * suggestion per exercise. Doing this server-side keeps the client render
 * instant — no waterfall of fetches while standing at a machine.
 */
export function buildActiveExercises(
  userId: string,
  workoutId: string | null,
  currentSessionId: string,
  locale: Locale = DEFAULT_LOCALE,
): ActiveExercise[] {
  if (!workoutId) return [];
  const workout = getWorkout(workoutId);
  if (!workout) return [];

  const items = getWorkoutExercises(workoutId);
  const exercises = getExercisesByIds(items.map((i) => i.exerciseId));

  return items.flatMap((item) => {
    const ex = exercises.get(item.exerciseId);
    if (!ex) return [];

    const last = getLastPerformance(userId, ex.id, currentSessionId);
    const suggestion =
      last && last.weight
        ? suggestProgression(item.progressionMode, {
            lastWeight: last.weight,
            lastReps: last.reps,
            targetSets: item.targetSets,
            targetRepsMin: item.targetRepsMin ?? 8,
            targetRepsMax: item.targetRepsMax ?? 12,
            lastRir: last.rir,
          })
        : null;

    return [
      {
        workoutExerciseId: item.id,
        exerciseId: ex.id,
        name: exerciseName(ex, locale),
        unit: ex.unit,
        isBodyweight: ex.isBodyweight,
        targetSets: item.targetSets,
        targetRepsMin: item.targetRepsMin,
        targetRepsMax: item.targetRepsMax,
        targetSeconds: item.targetSeconds,
        restSeconds: item.restSeconds,
        // Carried along so the logging screen can show what the exercise is,
        // without a round trip to the library in the middle of a workout.
        svgKey: ex.svgKey,
        imageUrl: ex.imageUrl,
        steps: locale === "en" && ex.instructionsStepsEn.length
          ? ex.instructionsStepsEn
          : ex.instructionsSteps,
        cues: locale === "en" && ex.cuesEn.length ? ex.cuesEn : ex.cues,
        lastWeight: last?.weight ?? null,
        lastReps: last?.reps ?? [],
        lastSeconds: last?.seconds ?? null,
        suggestion: suggestion
          ? { weight: suggestion.weight, reps: suggestion.reps, reason: suggestion.reason }
          : null,
      },
    ];
  });
}

/** Sets already logged in this session, in the shape the client expects. */
export function loadSessionSets(sessionId: string): LoggedSet[] {
  return listSessionSets(sessionId).map((s) => ({
    id: s.id,
    exerciseId: s.exerciseId,
    setIndex: s.setIndex,
    weight: s.weight,
    reps: s.reps,
    seconds: s.seconds,
    isWarmup: s.isWarmup,
    isPr: s.isPr,
  }));
}
