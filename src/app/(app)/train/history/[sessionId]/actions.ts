"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth/session";
import { getSession, listSessionSets } from "@/lib/db/repo/sessions";
import { createWorkout, setWorkoutExercises } from "@/lib/db/repo/workouts";
import { getExercisesByIds } from "@/lib/db/repo/exercises";
import { workoutExercisesFromSets, estimatedMinutesFromSession } from "@/lib/domain/reuse";
import { getLocale } from "@/lib/i18n/server";
import { createT } from "@/lib/i18n/core";

/**
 * Keep a training you have done as a workout you can do again.
 *
 * For a session that came from a workout there is nothing to do — that workout
 * is still there, and the screen links straight to it. This is for the other
 * kind: a free session, or one whose workout has since been removed. Those were
 * a dead end. You could read what you did and not repeat it.
 *
 * It copies, it never moves: the session keeps its sets, its records and its
 * place in the archive, and the new workout is an ordinary one of your own —
 * editable, removable, and no different from one built by hand.
 *
 * Returns the new workout's id so the screen can go there.
 */
export async function saveSessionAsWorkoutAction(sessionId: string): Promise<string> {
  const ctx = await requireContext();

  const session = getSession(sessionId);
  if (!session || session.userId !== ctx.user.id) throw new Error("NOT_FOUND");

  const sets = listSessionSets(session.id);
  // The unit decides the shape of each target: a rowing machine logs metres,
  // watts and seconds, and only the exercise knows it is not a plank.
  const exercises = getExercisesByIds(sets.map((s) => s.exerciseId));
  const units = new Map([...exercises].map(([id, ex]) => [id, ex.unit]));
  const items = workoutExercisesFromSets(sets, units);
  if (items.length === 0) throw new Error("EMPTY");

  const locale = await getLocale(ctx.user.localePref);
  const t = createT(locale);
  const date = new Date(session.startedAt).toLocaleDateString(
    locale === "da" ? "da-DK" : "en-GB",
    { day: "numeric", month: "long" },
  );

  const workout = createWorkout({
    hallId: ctx.hall.id,
    // Named after the day it was trained, because that is the only name it has
    // ever had. Renaming it is one tap away in the builder.
    name: t("train.savedWorkoutName", { date }),
    goal: "helkrop",
    level: ctx.user.difficulty,
    estimatedMinutes: estimatedMinutesFromSession(session.startedAt, session.endedAt),
    isTemplate: false,
    createdBy: ctx.user.id,
  });

  setWorkoutExercises(workout.id, items);

  revalidatePath("/library");
  revalidatePath("/train");
  return workout.id;
}
