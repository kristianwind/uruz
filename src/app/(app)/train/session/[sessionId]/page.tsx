import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/session";
import { getSession } from "@/lib/db/repo/sessions";
import { getWorkout } from "@/lib/db/repo/workouts";
import { ActiveWorkout } from "@/components/train/ActiveWorkout";
import { FreeWorkout } from "@/components/train/FreeWorkout";
import { buildActiveExercises, loadSessionSets } from "@/lib/domain/active-workout";
import { listExercises } from "@/lib/db/repo/exercises";
import { getT } from "@/lib/i18n/server";
import { workoutName, exerciseName } from "@/lib/domain/localize";

export const dynamic = "force-dynamic";
export const metadata = { title: "Træning" };

/** The active logging screen for one session. */
export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const session = getSession(sessionId);
  if (!session || session.userId !== ctx.user.id) redirect("/train");
  if (session.endedAt) redirect(`/train/finish/${session.id}`);

  const sets = loadSessionSets(session.id);

  // Free training: no template, pick exercises as you go.
  if (!session.workoutId) {
    const library = listExercises().map((e) => ({
      id: e.id,
      name: exerciseName(e, t.locale),
      unit: e.unit,
      isBodyweight: e.isBodyweight,
      category: e.category,
    }));
    return <FreeWorkout sessionId={session.id} library={library} initialSets={sets} />;
  }

  const workout = getWorkout(session.workoutId);
  const exercises = buildActiveExercises(ctx.user.id, session.workoutId, session.id, t.locale);

  return (
    <ActiveWorkout
      sessionId={session.id}
      workoutName={workout ? workoutName(workout, t.locale) : t("train.freeWorkout")}
      exercises={exercises}
      initialSets={sets}
    />
  );
}
