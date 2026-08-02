import "server-only";
import { getWorkout, getWorkoutExercises } from "@/lib/db/repo/workouts";
import { getExercisesByIds, listExercises } from "@/lib/db/repo/exercises";
import { getLastPerformance, listSessionSets } from "@/lib/db/repo/sessions";
import { suggestProgression } from "./strength";
import { exerciseName, localizeExercise } from "./localize";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/core";
import type { ActiveExercise, LoggedSet } from "@/components/train/ActiveWorkout";
import type { LibraryEntry } from "@/components/train/FreeWorkout";

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
        lastDistanceM: last?.distanceM ?? null,
        lastWatts: last?.watts ?? null,
        suggestion: suggestion
          ? { weight: suggestion.weight, reps: suggestion.reps, reason: suggestion.reason }
          : null,
      },
    ];
  });
}

/**
 * The whole library in the shape the picker needs — carrying each exercise's
 * last performance, so an exercise picked mid-workout (free training, or added
 * to a template) starts from what you lifted last time instead of from a
 * default. Remembering only worked for exercises a template listed up front,
 * which meant free training forgot everything you had ever done.
 */
export function buildLibraryEntries(
  userId: string,
  currentSessionId: string,
  locale: Locale = DEFAULT_LOCALE,
): LibraryEntry[] {
  return listExercises().map((ex) => {
    const loc = localizeExercise(ex, locale);
    const last = getLastPerformance(userId, ex.id, currentSessionId);
    return {
      id: ex.id,
      name: loc.name,
      unit: ex.unit,
      isBodyweight: ex.isBodyweight,
      category: ex.category,
      svgKey: loc.svgKey,
      imageUrl: loc.imageUrl,
      steps: loc.steps,
      cues: loc.cues,
      lastWeight: last?.weight ?? null,
      lastReps: last?.reps ?? [],
      lastSeconds: last?.seconds ?? null,
      lastDistanceM: last?.distanceM ?? null,
      lastWatts: last?.watts ?? null,
    };
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
    distanceM: s.distanceM,
    watts: s.watts,
    isWarmup: s.isWarmup,
    isPr: s.isPr,
  }));
}
